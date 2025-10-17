# backend/app/orchestrator/service.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import traceback

from app.models.execution import ExecutionCheckpoint, WorkflowExecution
from .state_manager import HybridStateManager
from .graphs.workflow_builder import WorkflowBuilderGraph
from .graphs.ai_assistant import AIAssistantGraph

from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class OrchestrationService:
    """Main orchestration service for executing workflows and agent tasks"""
    
    def __init__(self):
        self.state_manager = HybridStateManager()
        self.ws_manager = ws_manager
        logger.info("✅ Orchestration service initialized")
    
    async def execute_workflow(
        self,
        db: Session,
        session_id: str,
        condition: str,
        task_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        DEPRECATED: Use execute_workflow_with_id instead
        
        This method creates a new execution record.
        For better control, create the execution record first and use execute_workflow_with_id.
        """
        logger.warning("execute_workflow is deprecated, use execute_workflow_with_id")
        
        # Create execution record
        execution = WorkflowExecution(
            session_id=session_id,
            condition=condition,
            status='pending',
            workflow_definition=task_data.get('workflow') if condition == 'workflow_builder' else None,
            task_description=task_data.get('task_description') if condition == 'ai_assistant' else None,
            input_data=task_data.get('input_data', {}),
            execution_metadata=task_data.get('metadata', {})
        )
        
        db.add(execution)
        db.commit()
        db.refresh(execution)
        
        # Execute with the created ID
        return await self.execute_workflow_with_id(
            db=db,
            execution_id=execution.id,
            session_id=session_id,
            condition=condition,
            task_data=task_data
        )
    
    async def execute_workflow_with_id(
        self,
        db: Session,
        execution_id: int,
        session_id: str,
        condition: str,
        task_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        Execute a workflow using an existing execution record
        
        Args:
            db: Database session
            execution_id: Existing execution record ID
            session_id: User session ID
            condition: 'workflow_builder' or 'ai_assistant'
            task_data: Task definition and input data
            
        Returns:
            Updated WorkflowExecution record
        """
        logger.info(f"Starting execution: id={execution_id}, session={session_id}, condition={condition}")
        
        # Fetch existing execution record
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")
        
        try:
            # Build appropriate graph
            if condition == 'workflow_builder':
                graph_builder = WorkflowBuilderGraph(
                    self.state_manager, 
                    self.ws_manager
                )
                graph = graph_builder.build_graph(task_data['workflow'])
            else:  # ai_assistant
                graph_builder = AIAssistantGraph(
                    self.state_manager,
                    self.ws_manager
                )
                graph = graph_builder.build_graph()
            
            # Initialize state
            initial_state = self._initialize_state(execution, task_data)
            
            # Save initial state to Redis
            self.state_manager.save_state_to_memory(execution.id, initial_state)
            
            # Checkpoint: execution start (with transaction)
            self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution.id,
                step_number=0,
                checkpoint_type='execution_start',
                state=initial_state,
                metadata={'condition': condition}
            )
            
            # Subscribe session to execution channel for real-time updates
            self.ws_manager.subscribe(session_id, 'execution')
            
            # Send execution started event
            await self.ws_manager.send_execution_progress(
                session_id,
                execution.id,
                'execution_started',
                {
                    'condition': condition,
                    'step': 0,
                    'total_steps': len(task_data.get('workflow', {}).get('nodes', [])) if condition == 'workflow_builder' else None
                }
            )
            
            # Update execution status
            execution.status = 'running'
            execution.started_at = datetime.utcnow()
            db.commit()
            
            # Execute graph
            logger.info(f"Executing graph for execution {execution.id}")
            final_state = await graph.ainvoke(initial_state)
            
            # Update execution record with results
            execution.status = 'completed'
            execution.completed_at = datetime.utcnow()
            execution.final_result = final_state.get('working_data')
            execution.steps_completed = final_state.get('step_number', 0)
            execution.execution_time_ms = final_state.get('total_time_ms', 0)
            
            # Get checkpoint count
            from app.database import get_db_context
            with get_db_context() as checkpoint_db:
                checkpoint_count = checkpoint_db.query(ExecutionCheckpoint).filter(
                    ExecutionCheckpoint.execution_id == execution.id
                ).count()
                execution.checkpoints_count = checkpoint_count
            
            # Check for errors
            if final_state.get('errors'):
                execution.error_message = f"{len(final_state['errors'])} errors occurred"
            
            db.commit()
            
            # Send completion event
            await self.ws_manager.send_execution_progress(
                session_id,
                execution.id,
                'execution_completed',
                {
                    'steps_completed': execution.steps_completed,
                    'execution_time_ms': execution.execution_time_ms,
                    'final_result': execution.final_result
                }
            )
            
            logger.info(f"Execution {execution.id} completed successfully")
            
        except Exception as e:
            logger.exception(f"Execution {execution.id} failed: {e}")
            
            # Update execution with error (rollback-safe)
            try:
                execution.status = 'failed'
                execution.completed_at = datetime.utcnow()
                execution.error_message = str(e)
                execution.error_traceback = traceback.format_exc()
                db.commit()
            except Exception as commit_error:
                logger.error(f"Failed to commit error status: {commit_error}")
                db.rollback()
            
            # Send error event
            await self.ws_manager.send_execution_progress(
                session_id,
                execution.id,
                'execution_failed',
                {
                    'error': str(e),
                    'step': execution.steps_completed
                }
            )
            
            # Checkpoint: error (separate transaction)
            try:
                current_state = self.state_manager.get_state_from_memory(execution.id)
                if current_state:
                    from app.database import get_db_context
                    with get_db_context() as error_db:
                        self.state_manager.checkpoint_to_db(
                            db=error_db,
                            execution_id=execution.id,
                            step_number=current_state.get('step_number', 0),
                            checkpoint_type='error',
                            state=current_state,
                            metadata={'error': str(e)}
                        )
            except Exception as checkpoint_error:
                logger.error(f"Failed to create error checkpoint: {checkpoint_error}")
            
            raise
        
        finally:
            # Cleanup Redis state
            self.state_manager.clear_memory_state(execution.id)
            
            # Final checkpoint (separate transaction)
            try:
                from app.database import get_db_context
                with get_db_context() as final_db:
                    self.state_manager.checkpoint_to_db(
                        db=final_db,
                        execution_id=execution.id,
                        step_number=execution.steps_completed,
                        checkpoint_type='execution_end',
                        state={'status': execution.status},
                        metadata={'total_time_ms': execution.execution_time_ms}
                    )
            except Exception as checkpoint_error:
                logger.error(f"Failed to create final checkpoint: {checkpoint_error}")
            
            # Unsubscribe from execution channel
            self.ws_manager.unsubscribe(session_id, 'execution')
        
        return execution
    
    def _initialize_state(
        self, 
        execution: WorkflowExecution, 
        task_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Initialize workflow state
        
        Args:
            execution: WorkflowExecution record
            task_data: Task definition and input
            
        Returns:
            Initial state dictionary
        """
        now = datetime.utcnow().isoformat()
        
        state = {
            'execution_id': execution.id,
            'session_id': execution.session_id,
            'condition': execution.condition,
            'step_number': 0,
            'current_node': 'start',
            'status': 'running',
            'input_data': task_data.get('input_data', {}),
            'working_data': task_data.get('input_data', {}),
            'results': {},
            'errors': [],
            'warnings': [],
            'started_at': now,
            'last_step_at': now,
            'total_time_ms': 0,
            'user_interventions': 0,
            'checkpoints_created': 0,
            'metadata': task_data.get('metadata', {}),
        }
        
        # Add condition-specific fields
        if execution.condition == 'workflow_builder':
            state['workflow_definition'] = task_data.get('workflow')
        else:  # ai_assistant
            state['task_description'] = task_data.get('task_description')
            state['agent_plan'] = []
            state['agent_memory'] = []
        
        return state
    
    async def get_execution_status(
        self,
        db: Session,
        execution_id: int
    ) -> Dict[str, Any]:
        """
        Get current execution status
        
        Args:
            db: Database session
            execution_id: Execution ID
            
        Returns:
            Status dictionary
        """
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        
        if not execution:
            return {'error': 'Execution not found'}
        
        # Try to get live state from Redis
        state = self.state_manager.get_state_from_memory(execution_id)
        
        return {
            'execution_id': execution_id,
            'status': execution.status,
            'progress_percentage': self._calculate_progress(execution, state),
            'current_step': state.get('step_number') if state else execution.steps_completed,
            'current_node': state.get('current_node') if state else None,
            'error_message': execution.error_message,
            'started_at': execution.started_at.isoformat() if execution.started_at else None,
            'completed_at': execution.completed_at.isoformat() if execution.completed_at else None
        }

    def _calculate_progress(
        self,
        execution: WorkflowExecution,
        state: Optional[Dict[str, Any]]
    ) -> int:
        """Calculate execution progress percentage"""
        if execution.status == 'completed':
            return 100
        
        if not state:
            return 0
        
        current_step = state.get('step_number', 0)
        
        if execution.condition == 'workflow_builder':
            # For workflow builder: count total nodes
            total_nodes = len(execution.workflow_definition.get('nodes', [])) if execution.workflow_definition else 1
            return min(int((current_step / total_nodes) * 100), 99)
        else:
            # For AI assistant: use max_steps
            max_steps = 10
            return min(int((current_step / max_steps) * 100), 99)
    
    async def cancel_execution(
        self,
        db: Session,
        execution_id: int
    ) -> bool:
        """
        Cancel a running execution
        
        Args:
            db: Database session
            execution_id: Execution ID
            
        Returns:
            True if cancelled successfully
        """
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        
        if not execution or execution.status != 'running':
            return False
        
        # Update status
        execution.status = 'cancelled'
        execution.completed_at = datetime.utcnow()
        
        # Checkpoint cancellation (user intervention)
        state = self.state_manager.get_state_from_memory(execution_id)
        if state:
            self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution_id,
                step_number=state.get('step_number', 0),
                checkpoint_type='cancelled',
                state=state,
                user_interaction=True,
                metadata={'cancelled_by': 'user'}
            )
        
        # Clear Redis state
        self.state_manager.clear_memory_state(execution_id)
        
        # Send cancellation event
        await self.ws_manager.send_execution_progress(
            execution.session_id,
            execution_id,
            'execution_cancelled',
            {'step': execution.steps_completed}
        )
        
        db.commit()
        return True

# Create singleton instance
orchestrator = OrchestrationService()