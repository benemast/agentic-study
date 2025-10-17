# backend/app/orchestrator/graphs/ai_assistant.py
"""
AI Assistant Graph - Autonomous agent with intelligent decision making
"""
from langgraph.graph import StateGraph, END
from typing import Dict, Any
import logging
import time
from datetime import datetime

from .shared_state import SharedWorkflowState, AgentDecision
from ..tools.registry import tool_registry
from ..llm.decision_maker import decision_maker
from ..llm.tool_schemas import ToolName
from app.config import settings

logger = logging.getLogger(__name__)


class AIAssistantGraph:
    """
    Autonomous agent that plans and executes tasks using LLM
    
    Features:
    - Intelligent decision making via LLM
    - Validated tool calls
    - Confidence tracking
    - Fallback strategies
    - Full transparency through checkpoints
    """
    def __init__(self, state_manager, websocket_manager=None):
        self.state_manager = state_manager
        self.websocket_manager = websocket_manager
        self.max_steps = 10  # Prevent infinite loops
        self.decision_maker = decision_maker
        self.registry = tool_registry
    
    def build_graph(self) -> StateGraph:
        """
        Build autonomous agent graph
        
        Returns:
            Compiled LangGraph with agent nodes
        """
        logger.info("Building AI Assistant graph with LLM decision maker")
        
        graph = StateGraph(SharedWorkflowState)
        
        # Agent nodes
        graph.add_node("planner", self._agent_plan_step)
        graph.add_node("executor", self._agent_execute_step)
        graph.add_node("validator", self._agent_validate_step)
        
        # Set entry point
        graph.set_entry_point("planner")
        
        # Add conditional routing
        graph.add_conditional_edges(
            "planner",
            self._route_from_planner,
            {
                "execute": "executor",
                "validate": "validator",
                "finish": END
            }
        )
        
        # Executor loops back to planner
        graph.add_edge("executor", "planner")
        
        # Validator leads to end
        graph.add_edge("validator", END)
        
        return graph.compile()
    
    async def _agent_plan_step(self, state: SharedWorkflowState) -> SharedWorkflowState:
        """
        Agent plans the next action using LLM
        
        This is where the intelligent decision making happens
        """
        step_start_time = time.time()
        state['step_number'] = state.get('step_number', 0) + 1
        state['current_node'] = 'planner'
        
        logger.info(f"Agent planning step {state['step_number']}")
        
        try:
            # Get intelligent decision from LLM
            decision = await self.decision_maker.get_next_decision(
                task_description=state.get('task_description', ''),
                state=state,
                memory=state.get('agent_memory', [])
            )
            
            # Convert Pydantic model to dict for storage
            decision_dict = decision.dict()
            
            # Store decision in agent memory
            if 'agent_memory' not in state:
                state['agent_memory'] = []
            
            state['agent_memory'].append({
                'step': state['step_number'],
                'decision': decision_dict,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Update timing
            state['last_step_at'] = datetime.utcnow().isoformat()
            step_time = int((time.time() - step_start_time) * 1000)
            state['total_time_ms'] = state.get('total_time_ms', 0) + step_time
            
            # Update Redis
            self.state_manager.save_state_to_memory(state['execution_id'], dict(state))
            
            # Checkpoint agent decision
            if self.state_manager.should_checkpoint(state['condition'], 'agent_decision'):
                from app.database import SessionLocal
                db = SessionLocal()
                try:
                    self.state_manager.checkpoint_to_db(
                        db=db,
                        execution_id=state['execution_id'],
                        step_number=state['step_number'],
                        checkpoint_type='agent_decision',
                        state=dict(state),
                        agent_reasoning=decision.reasoning,
                        metadata={
                            'decision': decision_dict,
                            'confidence': decision.confidence,
                            'alternatives': decision.alternatives_considered
                        }
                    )
                finally:
                    db.close()
            
            # Send WebSocket update with decision details
            if self.websocket_manager:
                await self.websocket_manager.send_agent_decision(
                    session_id=state['session_id'],
                    execution_id=state['execution_id'],
                    step_number=state['step_number'],
                    decision=decision_dict
                )
            
            # Store next action in metadata for routing
            state['metadata']['next_action'] = decision.action
            state['metadata']['next_tool'] = decision.tool_name.value if decision.tool_name else None
            state['metadata']['tool_params'] = decision.tool_params
            state['metadata']['decision_confidence'] = decision.confidence
            
            logger.info(
                f"✓ Decision: {decision.action} -> {decision.tool_name} "
                f"(confidence: {decision.confidence:.2f})"
            )
            logger.info(f"  Reasoning: {decision.reasoning}")
            
        except Exception as e:
            logger.error(f"Error in planning step: {e}", exc_info=True)
            
            # Log error but continue with safe fallback
            state['errors'].append({
                'step': state['step_number'],
                'node': 'planner',
                'error': str(e)
            })
            
            # Set safe fallback action
            state['metadata']['next_action'] = 'finish'
            state['metadata']['next_tool'] = None
        
        return state
    
    async def _agent_execute_step(self, state: SharedWorkflowState) -> SharedWorkflowState:
        """
        Execute the action decided by the planner
        """
        step_start_time = time.time()
        action = state['metadata'].get('next_action')
        tool_ai_id = state['metadata'].get('next_tool')
        tool_params = state['metadata'].get('tool_params', {})
        
        logger.info(f"Agent executing: {action} with tool {tool_ai_id}")
        
        state['current_node'] = 'executor'
        
        # Get tool instance
        if not tool_ai_id:
            logger.warning("No tool specified for execution")
            return state
        
        tool = self.registry.get_ai_tool(tool_ai_id)
        
        if not tool:
            logger.error(f"Invalid tool AI ID: {tool_ai_id}")
            state['errors'].append({
                'step': state['step_number'],
                'error': f"Invalid tool: {tool_ai_id}"
            })
            return state
        
        # Send execution start event
        if self.websocket_manager:
            await self.websocket_manager.send_execution_progress(
                session_id=state['session_id'],
                execution_id=state['execution_id'],
                event_type='tool_execution_start',
                data={
                    'tool_name': tool_ai_id,
                    'action': action,
                    'step': state['step_number'],
                    'parameters': tool_params
                }
            )
        
        # Execute tool
        try:
            # Prepare input data with parameters
            input_data = {
                **state['working_data'],
                **tool_params
            }
            
            # Run tool
            result = await tool.run(input_data)
            
            # Update state with result
            if result['success']:
                state['results'][f"step_{state['step_number']}"] = result
                state['working_data'] = result.get('data', state['working_data'])
                
                logger.info(f"✓ Tool execution successful")
                
                # Send success event
                if self.websocket_manager:
                    await self.websocket_manager.send_execution_progress(
                        session_id=state['session_id'],
                        execution_id=state['execution_id'],
                        event_type='tool_execution_completed',
                        data={
                            'tool_name': tool_ai_id,
                            'step': state['step_number'],
                            'result_summary': result.get('metadata', {})
                        }
                    )
            else:
                error_msg = result.get('error', 'Unknown error')
                state['errors'].append({
                    'step': state['step_number'],
                    'error': error_msg,
                    'tool': tool_ai_id
                })
                
                logger.error(f"✗ Tool execution failed: {error_msg}")
                
                # Send error event
                if self.websocket_manager:
                    await self.websocket_manager.send_execution_error(
                        session_id=state['session_id'],
                        execution_id=state['execution_id'],
                        error=error_msg,
                        step_number=state['step_number']
                    )
                
        except Exception as e:
            logger.exception(f"Exception executing tool {tool_ai_id}: {e}")
            state['errors'].append({
                'step': state['step_number'],
                'error': str(e),
                'tool': tool_ai_id
            })
            
            # Send error event
            if self.websocket_manager:
                await self.websocket_manager.send_execution_error(
                    session_id=state['session_id'],
                    execution_id=state['execution_id'],
                    error=str(e),
                    step_number=state['step_number']
                )
        
        # Update timing
        step_time = int((time.time() - step_start_time) * 1000)
        state['total_time_ms'] = state.get('total_time_ms', 0) + step_time
        state['last_step_at'] = datetime.utcnow().isoformat()
        
        # Update Redis
        self.state_manager.save_state_to_memory(state['execution_id'], dict(state))
        
        return state
    
    async def _agent_validate_step(self, state: SharedWorkflowState) -> SharedWorkflowState:
        """
        Validate that task is complete and results are ready
        """
        logger.info("🔍 Validating task completion")
        
        state['current_node'] = 'validator'
        
        # Check if we have results
        working_data = state.get('working_data', {})
        has_data = bool(working_data.get('records'))
        
        if has_data:
            logger.info("✓ Task validation successful")
            state['status'] = 'completed'
        else:
            logger.warning("⚠️ Validation warning: No data in results")
            state['warnings'].append("Task completed but no data produced")
        
        return state
    
    def _route_from_planner(self, state: SharedWorkflowState) -> str:
        """
        Route from planner based on decision
        
        Returns:
            Next node: 'execute', 'validate', or 'finish'
        """
        action = state['metadata'].get('next_action', 'finish')
        step_number = state.get('step_number', 0)
        
        # Safety: prevent infinite loops
        if step_number >= self.max_steps:
            logger.warning(f"Max steps ({self.max_steps}) reached, finishing")
            return 'finish'
        
        # Check if task is complete
        if action == 'finish':
            return 'validate'
        
        # Continue executing
        return 'execute'