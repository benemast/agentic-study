# backend/app/orchestrator/service.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import traceback

from app.models.execution import WorkflowExecution
from .state_manager import HybridStateManager
from .graphs.workflow_builder import WorkflowBuilderGraph
from .graphs.ai_assistant import AIAssistantGraph

from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for real-time progress updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, Any] = {}
    
    async def connect(self, session_id: str, websocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected: {session_id}")
    
    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        logger.info(f"WebSocket disconnected: {session_id}")
    
    async def send_progress(self, session_id: str, message: dict):
        """Send progress update to client"""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {e}")
                self.disconnect(session_id)


class OrchestrationService:
    """
    Main orchestration service for executing workflows and agent tasks
    
    Handles:
    - Workflow Builder: User-defined workflows
    - AI Assistant: Autonomous agent tasks
    """
    
    def __init__(self):
        self.state_manager = HybridStateManager()
        self.websocket_manager = ws_manager
        logger.info("✅ Orchestration service initialized")
    
    async def execute_workflow(
        self,
        db: Session,
        session_id: str,
        condition: str,
        task_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        Execute a workflow or agent task
        
        Args:
            db: Database session
            session_id: User session ID
            condition: 'workflow_builder' or 'ai_assistant'
            task_data: Task definition and input data
            
        Returns:
            WorkflowExecution record
        """
        logger.info(f"Starting execution: session={session_id}, condition={condition}")
        
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
        
        logger.info(f"Created execution record: id={execution.id}")
        
        try:
            # Build appropriate graph
            if condition == 'workflow_builder':
                graph_builder = WorkflowBuilderGraph(
                    self.state_manager, 
                    self.websocket_manager
                )
                graph = graph_builder.build_graph(task_data['workflow'])
            else:  # ai_assistant
                graph_builder = AIAssistantGraph(
                    self.state_manager,
                    self.websocket_manager
                )
                graph = graph_builder.build_graph()
            
            # Initialize state
            initial_state = self._initialize_state(execution, task_data)
            
            # Save initial state to Redis
            self.state_manager.save_state_to_memory(execution.id, initial_state)
            
            # Checkpoint: execution start
            self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution.id,
                step_number=0,
                checkpoint_type='execution_start',
                state=initial_state,
                metadata={'condition': condition}
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
            execution.checkpoints_count = len(
                self.state_manager.get_checkpoint_history(db, execution.id)
            )
            
            # Check for errors
            if final_state.get('errors'):
                execution.error_message = f"{len(final_state['errors'])} errors occurred"
            
            logger.info(f"Execution {execution.id} completed successfully")
            
        except Exception as e:
            logger.exception(f"Execution {execution.id} failed: {e}")
            
            # Update execution with error
            execution.status = 'failed'
            execution.completed_at = datetime.utcnow()
            execution.error_message = str(e)
            execution.error_traceback = traceback.format_exc()
            
            # Checkpoint: error
            try:
                current_state = self.state_manager.get_state_from_memory(execution.id)
                if current_state:
                    self.state_manager.checkpoint_to_db(
                        db=db,
                        execution_id=execution.id,
                        step_number=current_state.get('step_number', 0),
                        checkpoint_type='error',
                        state=current_state,
                        metadata={'error': str(e)}
                    )
            except:
                pass  # Don't fail on checkpoint error
            
            raise
        
        finally:
            # Cleanup Redis state
            self.state_manager.clear_memory_state(execution.id)
            
            # Final checkpoint
            self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution.id,
                step_number=execution.steps_completed,
                checkpoint_type='execution_end',
                state={'status': execution.status},
                metadata={'total_time_ms': execution.execution_time_ms}
            )
            
            db.commit()
        
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
            'metadata': task_data.get('metadata', {})
        }
        
        # Condition-specific initialization
        if execution.condition == 'workflow_builder':
            state['workflow_definition'] = execution.workflow_definition
        else:  # ai_assistant
            state['task_description'] = execution.task_description
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
        
        # Try to get current state from Redis
        current_state = self.state_manager.get_state_from_memory(execution_id)
        
        status = {
            'execution_id': execution.id,
            'status': execution.status,
            'started_at': execution.started_at.isoformat() if execution.started_at else None,
            'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
            'steps_completed': execution.steps_completed,
            'execution_time_ms': execution.execution_time_ms,
            'error_message': execution.error_message
        }
        
        # Add live progress if running
        if current_state:
            status['current_step'] = current_state.get('step_number')
            status['current_node'] = current_state.get('current_node')
            status['progress_percentage'] = self._calculate_progress(current_state, execution)
        
        return status
    
    def _calculate_progress(
        self, 
        state: Dict[str, Any], 
        execution: WorkflowExecution
    ) -> int:
        """Calculate progress percentage"""
        if execution.condition == 'workflow_builder':
            # For workflow builder: based on nodes completed
            workflow = execution.workflow_definition
            if workflow and 'nodes' in workflow:
                total_nodes = len(workflow['nodes'])
                completed = len(state.get('results', {}))
                return int((completed / total_nodes) * 100) if total_nodes > 0 else 0
        else:
            # For AI assistant: estimate based on steps (max 10)
            max_steps = 10
            current_step = state.get('step_number', 0)
            return min(int((current_step / max_steps) * 100), 95)  # Cap at 95% until complete
        
        return 0
    
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
        
        # Update execution status
        execution.status = 'cancelled'
        execution.completed_at = datetime.utcnow()
        
        # Checkpoint cancellation
        current_state = self.state_manager.get_state_from_memory(execution_id)
        if current_state:
            current_state['status'] = 'cancelled'
            self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution_id,
                step_number=current_state.get('step_number', 0),
                checkpoint_type='cancelled',
                state=current_state,
                user_interaction=True
            )
        
        # Cleanup
        self.state_manager.clear_memory_state(execution_id)
        db.commit()
        
        logger.info(f"Execution {execution_id} cancelled")
        return True


# Global instance
orchestrator = OrchestrationService()