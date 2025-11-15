# backend/app/orchestrator/service.py
"""
Main Orchestration Service

Integrates with:
- SharedWorkflowState (TypedDict)
- Memory-optimized state with SQL references
- Row operation tracking
- HybridStateManager
"""
from typing import Dict, Any, Optional, Literal
from fastapi import HTTPException
from openai import APIError, APITimeoutError, RateLimitError
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging
import traceback

from app.configs.config import settings
from app.configs.langsmith_config import create_run_config, should_trace_execution

from app.websocket.manager import WebSocketManager, get_ws_manager
from .degradation import DegradationConfig, graceful_degradation

from app.orchestrator.llm.streaming_callbacks import initialize_callback_factory, get_callback_factory
from .llm.circuit_breaker import CircuitBreakerOpen

from app.models.execution import ExecutionCheckpoint, WorkflowExecution

from .graphs.shared_state import (
    SharedWorkflowState,
    initialize_state,
    get_row_operation_summary,
    get_data_source_info
)

from .state_manager import HybridStateManager

from .graphs.workflow_builder import WorkflowBuilderGraph

from app.orchestrator.graphs.ai_assistant_agent import (
    AIAssistantAgent,
    AIAssistantContext, 
    create_ai_assistant_agent
)

logger = logging.getLogger(__name__)


class OrchestrationService:
    """Main orchestration service for executing workflows and agent tasks"""
    
    def __init__(self):
        ws_manager = get_ws_manager()
        self.state_manager: HybridStateManager = HybridStateManager()
        self.ws_manager: WebSocketManager = ws_manager        
        self.degradation: DegradationConfig = graceful_degradation

        # establish streaming for LangChain based LLM calls
        initialize_callback_factory(self.ws_manager) 

        logger.info("Orchestration service initialized")
    
    def _create_ai_assistant_agent(self) -> AIAssistantAgent:
       return create_ai_assistant_agent(
           state_manager=self.state_manager,
           websocket_manager=self.ws_manager
       )

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
        condition: Literal['workflow_builder', 'ai_assistant'],
        task_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        Execute a workflow using an existing execution record
        
        Routes to appropriate execution method based on condition:
        - workflow_builder: Uses WorkflowBuilderGraph
        - ai_assistant: Routes to _execute_ai_assistant_agent
        
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
        
        allowed, reason = self.degradation.should_allow_execution()
        if not allowed:
            logger.error(f"Execution blocked: {reason}")
            raise HTTPException(
                status_code=503,
                detail=reason
            )

        # Fetch existing execution record
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")
        
        # NEW: Route based on condition
        if condition == 'ai_assistant':
            # Use LangChain v1 Agent for AI Assistant
            return await self._execute_ai_assistant_agent(
                db=db,
                execution=execution,
                session_id=session_id,
                task_data=task_data
            )
        else:
            # Use existing workflow builder for workflow_builder condition
            return await self._execute_workflow_builder(
                db=db,
                execution=execution,
                session_id=session_id,
                task_data=task_data
            )
    
    async def _execute_workflow_builder(
        self,
        db: Session,
        execution: WorkflowExecution,
        session_id: str,
        task_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        Execute workflow using WorkflowBuilderGraph (existing logic)
        
        This is the ORIGINAL execute_workflow_with_id logic, extracted
        into a separate method for clarity.
        
        Args:
            db: Database session
            execution: WorkflowExecution record
            session_id: Session ID
            task_data: Task data
            
        Returns:
            Updated WorkflowExecution record
        """
        execution_id = execution.id
        condition = 'workflow_builder'
        
        logger.info(f"Executing Workflow Builder with StateGraph: execution={execution_id}")

        try:
            # Build appropriate graph
            graph_builder = WorkflowBuilderGraph(
                self.state_manager, 
                self.ws_manager
            )
            graph = graph_builder.build_graph(task_data['workflow'])
            
            # Initialize state
            initial_state = self._initialize_state(execution, task_data)
            
            logger.info(
                f"Initial state created with new structure: "
                f"execution_id={execution.id}, "
                f"condition={condition}"
            )

            # Save initial state to Redis
            self.state_manager.save_state_to_memory(execution.id, initial_state)
            
            # Checkpoint: execution start (with transaction)
            await self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution.id,
                step_number=0,
                checkpoint_type='execution_start',
                state=initial_state,
                metadata={'condition': condition},
                buffered=True  # Use checkpoint batching
            )
            
            # Subscribe session to execution channel for real-time updates
            # Would allow broadcast to all channel subscribers - currently not used
            self.ws_manager.subscribe(session_id, 'execution')
            
            # Send execution started event
            await self.ws_manager.send_execution_progress(
                session_id=session_id,                
                execution_id=execution_id,
                condition=condition,
                progress_type='start',
                status='start',
                data={
                    'step': 0,
                    'total_steps': len(task_data.get('workflow', {}).get('nodes', [])) if condition == 'workflow_builder' else None
                }
            )
            
            # Update execution status
            execution.status = 'running'
            execution.started_at = datetime.now(timezone.utc)
            db.commit()
            
            # Execute graph
            logger.info(f"Executing graph for execution {execution.id}")

            should_trace = should_trace_execution(settings.langsmith_sample_rate)

            streaming_callback = None
            if self.ws_manager:
                callback_factory = get_callback_factory()
                streaming_callback = callback_factory.create_callback(
                    session_id=session_id,
                    execution_id=execution.id,
                    condition=condition,
                    tool_name='graph_execution'
                )

            # Create LangSmith config
            langsmith_config = create_run_config(
                execution_id=execution.id,
                session_id=session_id,
                condition=condition,
                task_data=task_data,
                streaming_callback=streaming_callback,
                include_tracer=should_trace
            )

            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='progress',
                status='running'
            )

            # Asynchronously invoke compiled graph
            final_state: SharedWorkflowState = await graph.ainvoke(
                initial_state,
                config=langsmith_config
            )
            

            # Extract final results from new state structure
            # No longer needed as results are being transmitted by show_result node
            final_result = self._extract_final_result(final_state)
            
            result_data = final_state.get('data',{})

            # Update execution record with results
            execution.status = 'completed' if result_data.get('success', False) else 'failed'
            execution.completed_at = datetime.now(timezone.utc)
            execution.final_result = final_result
            execution.steps_completed = final_state.get('step_number', 0)
            execution.execution_time_ms = result_data.get('execution_time_ms', 0)
            
            self.degradation.report_success()

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
            
            # Log row operation summary if available
            row_summary = get_row_operation_summary(final_state)
            if row_summary['total_operations'] > 0:
                logger.info(
                    f"Row operations summary: "
                    f"{row_summary['initial_rows']} → {row_summary['current_rows']} rows "
                    f"({row_summary['reduction_pct']:.1f}% reduction)"
                )
            
            # Log SQL reference if available
            sql_ref = get_data_source_info(final_state)
            if sql_ref:
                logger.info(f"SQL reference preserved: {sql_ref['row_count_at_load']} initial rows")
            
            db.commit()
            
            # Send completion event
            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='end',
                status='completed',
                data={
                    'steps_completed': execution.steps_completed,
                    'execution_time_ms': execution.execution_time_ms,
                    'results': final_result,
                    'row_summary': row_summary if row_summary['total_operations'] > 0 else None,
                }
            )

            logger.info(f"Execution {execution.id} of Workflow Builder completed successfully")
            
        except CircuitBreakerOpen as e:
            logger.error(f"Circuit breaker open for execution {execution.id}: {e}")
            execution.status = 'failed'
            execution.completed_at = datetime.now(timezone.utc)
            execution.error_message = f"Service temporarily unavailable: {str(e)}"
            execution.error_traceback = traceback.format_exc()
            
            db.commit()
            
            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='error',
                status='failed',
                data={'error': execution.error_message, 'error_type': 'CircuitBreakerOpen'}
            )
            
            self.state_manager.clear_memory_state(execution.id)
            
        except (APIError, APITimeoutError, RateLimitError) as e:
            logger.error(
                f"LLM API error in execution {execution.id}: {e}",
                exc_info=True
            )
            execution.status = 'failed'
            execution.completed_at = datetime.now(timezone.utc)
            execution.error_message = f"LLM API error: {str(e)}"
            execution.error_traceback = traceback.format_exc()
            
            db.commit()
            
            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='error',
                status='failed',
                data={'error': execution.error_message, 'error_type': type(e).__name__}
            )
            
            self.state_manager.clear_memory_state(execution.id)
            
        except Exception as e:
            logger.error(
                f"Error in Workflow Builder execution {execution.id}: {e}",
                exc_info=True
            )

            # Update execution with error (rollback-safe)
            try:
                execution.status = 'failed'
                execution.completed_at = datetime.now(timezone.utc)
                execution.error_message = str(e)
                execution.error_traceback = traceback.format_exc()
                db.commit()
            except Exception as commit_error:
                logger.error(f"Failed to commit error status: {commit_error}")
                db.rollback()
            
            # Send error event
            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='error',
                status='failed',
                data={
                    'error': str(e), 
                    'error_type': type(e).__name__,
                    'step': execution.steps_completed
                }
            )
            
            # Checkpoint: error (separate transaction)
            try:
                current_state = self.state_manager.get_state_from_memory(execution.id)
                if current_state:
                    from app.database import get_db_context
                    with get_db_context() as error_db:
                        await self.state_manager.checkpoint_to_db(
                            db=error_db,
                            execution_id=execution.id,
                            step_number=current_state.get('step_number', 0),
                            checkpoint_type='error',
                            state=current_state,
                            metadata={'error': str(e)},
                            buffered=False  # Direct write for errors
                        )
            except Exception as checkpoint_error:
                logger.error(f"Failed to create error checkpoint: {checkpoint_error}")
            
            raise
        
        finally:
            # Flush any buffered checkpoints for this execution
            try:
                flushed = await self.state_manager.flush_checkpoints(execution.id)
                if flushed > 0:
                    logger.info(f"Flushed {flushed} buffered checkpoints")
            except Exception as flush_error:
                logger.error(f"Failed to flush checkpoints: {flush_error}")
            
            # Cleanup Redis state
            self.state_manager.clear_memory_state(execution.id)
            
            # Final checkpoint (separate transaction)
            try:
                from app.database import get_db_context
                with get_db_context() as final_db:
                    await self.state_manager.checkpoint_to_db(
                        db=final_db,
                        execution_id=execution.id,
                        step_number=execution.steps_completed,
                        checkpoint_type='execution_end',
                        state={'status': execution.status},
                        metadata={'total_time_ms': execution.execution_time_ms},
                        buffered=False  # Direct write for finalization
                    )
            except Exception as checkpoint_error:
                logger.error(f"Failed to create final checkpoint: {checkpoint_error}")
            
            # Unsubscribe from execution channel
            self.ws_manager.unsubscribe(session_id, 'execution')
        
        return execution
    
    async def _execute_ai_assistant_agent(
        self,
        db: Session,
        execution: WorkflowExecution,
        session_id: str,
        task_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        Execute AI Assistant using LangChain v1 Agent
        
        This mirrors the workflow_builder execution flow but uses
        the create_agent() based AIAssistantAgent instead of a graph.
        
        Key differences from workflow_builder:
        - Uses agent.run() instead of graph.ainvoke()
        - Agent handles tool selection/execution autonomously
        - State management via LangChain's checkpointer + Redis
        
        Args:
            db: Database session
            execution: WorkflowExecution record
            session_id: Session ID
            task_data: Task data (must include 'task_description')
            
        Returns:
            Updated WorkflowExecution record
        """
        execution_id = execution.id
        condition = 'ai_assistant'
        
        logger.info(f"Executing AI Assistant with LangChain agent: execution={execution_id}")
        
        try:
            # Get AI Assistant Agent (lazy init)

            category = task_data.get('input_data', {}).get('category') 
            
            if not category:
                raise ValueError(
                    "Category must be provided in task_data.input_data.category. "
                    "Expected 'shoes' or 'wireless'"
                )
            
            if category not in ['shoes', 'wireless']:
                raise ValueError(
                    f"Invalid category '{category}'. Must be 'shoes' or 'wireless'"
                )
            
            logger.info(
                f"AI Assistant execution: execution_id={execution_id}, "
                f"category={category}, session={session_id}"
            )
            
            # Initialize state (same as workflow_builder)
            initial_state = self._initialize_state(execution, task_data)
            
            logger.info(
                f"Initial state created for AI Assistant: "
                f"execution_id={execution.id}, category={category},  "
                f"task_description={task_data.get('task_description', 'N/A')[:50]}..."
            )

            # Save initial state to Redis
            self.state_manager.save_state_to_memory(execution.id, initial_state)
            
            # Checkpoint: execution start (with transaction)
            await self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution.id,
                step_number=0,
                checkpoint_type='execution_start',
                state=initial_state,
                metadata={
                    'condition': condition,
                    'category': category
                },
                buffered=True
            )
            
            # Subscribe session to execution channel
            self.ws_manager.subscribe(session_id, 'execution')
            
            # Send execution started event
            await self.ws_manager.send_execution_progress(
                session_id=session_id,                
                execution_id=execution_id,
                condition=condition,
                progress_type='start',
                status='start',
                data={
                    'step': 0,
                    'task_description': task_data.get('task_description'),
                    'category': category
                }
            )
            
            # Update execution status
            execution.status = 'running'
            execution.started_at = datetime.now(timezone.utc)
            db.commit()
            
            # Execute agent
            logger.info(f"Invoking AI Assistant agent for execution {execution.id}")

            should_trace = should_trace_execution(settings.langsmith_sample_rate)

            streaming_callback = None
            if self.ws_manager:
                callback_factory = get_callback_factory()
                streaming_callback = callback_factory.create_callback(
                    session_id=session_id,
                    execution_id=execution.id,
                    condition=condition,
                    tool_name='graph_execution'
                )

            # Create LangSmith config
            langsmith_config = create_run_config(
                execution_id=execution.id,
                session_id=session_id,
                condition=condition,
                task_data=task_data,
                streaming_callback=streaming_callback,
                include_tracer=should_trace
            )

            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='progress',
                status='running'
            )

            agent = self._create_ai_assistant_agent()
            
            final_state = await agent.invoker(
                task_description=task_data.get('task_description', ''),
                session_id=session_id,
                execution_id=execution_id,
                category=category,
                initial_state=initial_state,
                langsmith_config=langsmith_config,
                should_stream=settings.langchain_stream
            )

            # RUN AGENT (this is the LangChain equivalent of graph.ainvoke)
            """final_state = await agent.run(
                task_description=task_data.get('task_description', ''),
                session_id=session_id,
                execution_id=execution_id,
                initial_state=initial_state,
                passed_context=context,
                config=langsmith_config
            )"""
            
            # Extract results (same as workflow_builder)
            final_result = self._extract_final_result(final_state)
            execution.status = 'completed'
            execution.completed_at = datetime.now(timezone.utc)
            execution.final_result = final_result
            execution.steps_completed = final_state.get('step_number', 0)
            execution.execution_time_ms = int(final_state.get('total_time_ms') or 0)
            
            self.degradation.report_success()
            
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
            
            # Log row operation summary if available
            row_summary = get_row_operation_summary(final_state)
            if row_summary['total_operations'] > 0:
                logger.info(
                    f"Row operations summary: "
                    f"{row_summary['initial_rows']} → {row_summary['current_rows']} rows "
                    f"({row_summary['reduction_pct']:.1f}% reduction)"
                )
            
            # Log SQL reference if available
            sql_ref = get_data_source_info(final_state)
            if sql_ref:
                logger.info(f"SQL reference preserved: {sql_ref['row_count_at_load']} initial rows")
            
            db.commit()
            
            # Send completion event
            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='end',
                status='completed',
                data={
                    'steps_completed': execution.steps_completed,
                    'execution_time_ms': execution.execution_time_ms,
                    'results': final_result,
                    'row_summary': row_summary if row_summary['total_operations'] > 0 else None
                }
            )
            
            logger.info(f"Execution {execution.id} of AI Assistant completed successfully")
            
        except CircuitBreakerOpen as e:
            logger.error(f"Circuit breaker open for execution {execution.id}: {e}")
            execution.status = 'failed'
            execution.completed_at = datetime.now(timezone.utc)
            execution.error_message = f"Service temporarily unavailable: {str(e)}"
            execution.error_traceback = traceback.format_exc()
            
            db.commit()
            
            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='error',
                status='failed',
                data={'error': execution.error_message, 'error_type': 'CircuitBreakerOpen'}
            )
            
            self.state_manager.clear_memory_state(execution.id)
            
        except (APIError, APITimeoutError, RateLimitError) as e:
            logger.error(
                f"LLM API error in execution {execution.id}: {e}",
                exc_info=True
            )
            
            # Update execution with error (rollback-safe)
            try:
                execution.status = 'failed'
                execution.completed_at = datetime.now(timezone.utc)
                execution.error_message = str(e)
                execution.error_traceback = traceback.format_exc()
                db.commit()
            except Exception as commit_error:
                logger.error(f"Failed to commit error status: {commit_error}")
                db.rollback()
            
            # Send error event
            await self.ws_manager.send_execution_progress(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                progress_type='error',
                status='failed',
                data={
                    'error': str(e), 
                    'error_type': type(e).__name__,
                    'step': execution.steps_completed
                }
            )
            
            # Checkpoint: error (separate transaction)
            try:
                current_state = self.state_manager.get_state_from_memory(execution.id)
                if current_state:
                    from app.database import get_db_context
                    with get_db_context() as error_db:
                        await self.state_manager.checkpoint_to_db(
                            db=error_db,
                            execution_id=execution.id,
                            step_number=current_state.get('step_number', 0),
                            checkpoint_type='error',
                            state=current_state,
                            metadata={'error': str(e)},
                            buffered=False  # Direct write for errors
                        )
            except Exception as checkpoint_error:
                logger.error(f"Failed to create error checkpoint: {checkpoint_error}")
            
            raise
            
        finally:
            # Flush any buffered checkpoints for this execution
            try:
                flushed = await self.state_manager.flush_checkpoints(execution.id)
                if flushed > 0:
                    logger.info(f"Flushed {flushed} buffered checkpoints")
            except Exception as flush_error:
                logger.error(f"Failed to flush checkpoints: {flush_error}")
            
            # Cleanup Redis state
            self.state_manager.clear_memory_state(execution.id)
            
            # Final checkpoint (separate transaction)
            try:
                from app.database import get_db_context
                with get_db_context() as final_db:
                    await self.state_manager.checkpoint_to_db(
                        db=final_db,
                        execution_id=execution.id,
                        step_number=execution.steps_completed,
                        checkpoint_type='execution_end',
                        state={'status': execution.status},
                        metadata={'total_time_ms': execution.execution_time_ms},
                        buffered=False  # Direct write for finalization
                    )
            except Exception as checkpoint_error:
                logger.error(f"Failed to create final checkpoint: {checkpoint_error}")
            
            # Unsubscribe from execution channel
            self.ws_manager.unsubscribe(session_id, 'execution')
        
        return execution

# Helper Methods for OrchestrationService    

    def _initialize_state(
        self, 
        execution: WorkflowExecution, 
        task_data: Dict[str, Any]
    ) -> SharedWorkflowState:
        """
        Initialize workflow state with TypedDict structure        
        Uses initialize_state() helper from shared_state.py
        
        Args:
            execution: WorkflowExecution record
            task_data: Task definition and input
            
        Returns:
            SharedWorkflowState (TypedDict)
        """

        input_data = task_data.get('input_data', {})        

        state = initialize_state(
            execution_id=execution.id,
            session_id=execution.session_id,
            condition=execution.condition,
            category=input_data.get('category'),
            language=input_data.get('language')
        )
        
        # Add input data and metadata
        state['input_data'] = task_data.get('input_data', {})
        state['metadata'] = task_data.get('metadata', {})

        
        # Add condition-specific fields
        if execution.condition == 'workflow_builder':
            state['workflow_definition'] = task_data.get('workflow')
        else:  # ai_assistant
            state['task_description'] = task_data.get('task_description')

        logger.debug(
            f"State initialized with new structure: "
            f"execution_id={execution.id}, "
            f"has_data_source={state.get('data_source') is not None}, "
            f"has_record_store={state.get('record_store') is not None}"
        )
        
        return state
    
    def _extract_final_result(self, state: SharedWorkflowState) -> Optional[Dict[str, Any]]:
        """
        Extract final results from new state structure
        
        Handles both old 'working_data' and new 'record_store' + 'results_registry'
        
        Args:
            state: Final SharedWorkflowState
            
        Returns:
            Final result dictionary for execution record
        """
        # Check results_registry first (new structure)
        results_registry = state.get('results_registry')
        if results_registry and results_registry.get('results'):
            # Extract tool results
            tool_results = {}
            for tool_id, result in results_registry['results'].items():
                tool_results[tool_id] = {
                    'tool_name': result.get('tool_name'),
                    'summary': result.get('summary', {}),
                    'execution_time_ms': result.get('execution_time_ms', 0)
                }
            
            return {
                'type': 'tool_results',
                'results': tool_results,
                'total_tools': len(tool_results),
                'row_operations': get_row_operation_summary(state) if state.get('row_operation_history') else None
            }
        
        # Fallback to working_data (backward compatibility)
        if 'working_data' in state:
            return state['working_data']
        
        # No specific results, return summary
        return {
            'type': 'execution_summary',
            'steps_completed': state.get('step_number', 0),
            'status': state.get('status', 'unknown')
        }
    
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
        
        status_dict = {
            'execution_id': execution_id,
            'status': execution.status,
            'progress_percentage': self._calculate_progress(execution, state),
            'current_step': state.get('step_number') if state else execution.steps_completed,
            'current_node': state.get('current_node') if state else None,
            'error_message': execution.error_message,
            'started_at': execution.started_at.isoformat() if execution.started_at else None,
            'completed_at': execution.completed_at.isoformat() if execution.completed_at else None
        }
        
        # Add row operation summary if available
        if state and state.get('row_operation_history'):
            row_summary = get_row_operation_summary(state)
            if row_summary['total_operations'] > 0:
                status_dict['row_operations'] = {
                    'total': row_summary['total_operations'],
                    'initial_rows': row_summary['initial_rows'],
                    'current_rows': row_summary['current_rows'],
                    'reduction_pct': row_summary['reduction_pct']
                }
        
        return status_dict

    def _calculate_progress(
        self,
        execution: WorkflowExecution,
        state: Optional[SharedWorkflowState]
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
        execution.completed_at = datetime.now(timezone.utc)
        
        # Checkpoint cancellation (user intervention)
        state = self.state_manager.get_state_from_memory(execution_id)
        if state:
            await self.state_manager.checkpoint_to_db(
                db=db,
                execution_id=execution_id,
                step_number=state.get('step_number', 0),
                checkpoint_type='cancelled',
                state=state,
                user_interaction=True,
                metadata={'cancelled_by': 'user'},
                buffered=False  # Direct write for cancellation
            )
        
        # Clear Redis state
        self.state_manager.clear_memory_state(execution_id)
        
        # Send cancellation event
        await self.ws_manager.send_execution_progress(
            session_id=execution.session_id,
            execution_id=execution_id,
            condition=execution.condition,
            progress_type='end',
            status='cancelled',
            data={
                'step': execution.steps_completed,
                'cancelled_by': 'user'
            }
        )
        
        db.commit()
        return True

# Create singleton instance
orchestrator = OrchestrationService()