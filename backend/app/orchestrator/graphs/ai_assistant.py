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
from app.configs.config import settings
from app.database import get_db_context

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
        self.max_steps = 10
        self.decision_maker = decision_maker
        self.registry = tool_registry

        if self.websocket_manager:
        # Give decision maker access to WebSocket for streaming decisions
            if hasattr(self.decision_maker, 'set_websocket_manager'):
                self.decision_maker.set_websocket_manager(self.websocket_manager)
                logger.info("✅ WebSocket manager injected into DecisionMaker")
        
            # Inject WebSocket into tools that need it
            self._inject_websocket_into_tools()
    
    def _inject_websocket_into_tools(self):
        """
        Inject WebSocket manager into tools that support progress updates
        
        CRITICAL: Workflow Builder uses the same tools as AI Assistant.
        Tools like sentiment analysis and insight generation need WebSocket
        access for real-time progress indicators.
        
        Implementation notes:
        - Tools in registry are singletons (one instance per tool type)
        - Injecting once makes WebSocket available to both graphs
        - Uses registry to access shared tool instances
        """
        logger.info("Injecting WebSocket into Workflow Builder tools")
        
        # Tool AI IDs that need WebSocket (match your TOOL_DEFINITIONS in registry.py)
        websocket_tool_ids = [
            'review_sentiment_analysis',  # ReviewSentimentAnalysisTool
            'generate_insights',          # GenerateInsightsTool
        ]
        
        injected_count = 0
        for ai_id in websocket_tool_ids:
            try:
                # Get tool definition from registry
                tool_def = self.registry.get_tool_definition(ai_id=ai_id)
                
                if tool_def:
                    # Get singleton instance
                    tool_instance = tool_def.instance
                    
                    # Check if tool supports WebSocket injection
                    if hasattr(tool_instance, 'set_websocket_manager'):
                        # Inject WebSocket manager
                        tool_instance.set_websocket_manager(self.websocket_manager)
                        injected_count += 1
                        logger.info(f"✅ WebSocket injected into {tool_def.display_name} (Workflow Builder)")
                    else:
                        logger.debug(f"⚠️ Tool {tool_def.display_name} doesn't support WebSocket")
                else:
                    logger.warning(f"⚠️ Tool not found in registry: {ai_id}")
                    
            except Exception as e:
                logger.error(f"❌ Failed to inject WebSocket into tool {ai_id}: {e}", exc_info=True)
        
        logger.info(f"Workflow Builder: WebSocket manager injected into {injected_count} tool(s)")

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
        execution_id = state['execution_id']
        # Atomic increment
        new_step = self.state_manager.increment_field(execution_id, 'step_number', 1)
        state['step_number'] = new_step
        
        # Field update
        self.state_manager.update_state_field(execution_id, 'current_node', 'planner')
        
        logger.info(f"Agent planning step {new_step}")
        
        try:
            # Get intelligent decision from LLM
            decision = await self.decision_maker.get_next_decision(
                task_description=state.get('task_description', ''),
                state=state,
                memory=state.get('agent_memory', [])
            )
            
            # Convert Pydantic model to dict for storage
            decision_dict = decision.dict()
            
            # Append to agent memory efficiently
            memory_entry = {
                'step': new_step,
                'decision': decision_dict,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.state_manager.append_to_list_field(
                execution_id,
                'agent_memory',
                memory_entry
            )
            
            state['agent_memory'].append(memory_entry)
            
            # Update timing
            step_time = int((time.time() - step_start_time) * 1000)
            
            # Batch updates
            self.state_manager.update_state_fields(execution_id, {
                'last_step_at': datetime.utcnow().isoformat(),
                'total_time_ms': state.get('total_time_ms', 0) + step_time
            })
            
            state['last_step_at'] = datetime.utcnow().isoformat()
            state['total_time_ms'] = state.get('total_time_ms', 0) + step_time
            
             # Store next action in metadata
            state['metadata']['next_action'] = decision.action
            state['metadata']['next_tool'] = decision.tool_name.value if decision.tool_name else None
            
            # Checkpoint agent decision (buffered)
            if self.state_manager.should_checkpoint(state['condition'], 'agent_decision'):
                with get_db_context() as db:
                    await self.state_manager.checkpoint_to_db(
                        db=db,
                        execution_id=execution_id,
                        step_number=new_step,
                        checkpoint_type='agent_decision',
                        state=dict(state),
                        agent_reasoning=decision.reasoning,
                        buffered=True,
                        metadata={
                            'decision': decision_dict,
                            'confidence': decision.confidence
                        }
                    )
            
            # Send WebSocket update with decision details
            if self.websocket_manager:
                await self.websocket_manager.send_agent_decision(
                    session_id=state['session_id'],
                    execution_id=state['execution_id'],
                    step_number=state['step_number'],
                    decision=decision_dict
                )
            
            logger.info(
                f"✓ Decision: {decision.action} -> {decision.tool_name} "
                f"(confidence: {decision.confidence:.2f})"
            )
            logger.info(f"  Reasoning: {decision.reasoning}")
            
        except Exception as e:
            logger.error(f"Error in planning step: {e}", exc_info=True)
            
            # Log error but continue with safe fallback
            self.state_manager.append_to_list_field(
                execution_id,
                'errors',
                {'step': new_step, 'node': 'planner', 'error': str(e)}
            )
            
            state['errors'].append({
                'step': new_step,
                'node': 'planner',
                'error': str(e)
            })
        
        return state
    
    async def _agent_execute_step(self, state: SharedWorkflowState) -> SharedWorkflowState:
        """
        Execute the action decided by the planner
        """
        step_number = state.get('step_number', 0)
        tool_ai_id = state['metadata'].get('next_tool')
        agent_memory = state.get('agent_memory', [])
        
        # Get tool definition
        tool_def = self.registry.get_tool_definition(ai_id=tool_ai_id)

        if not tool_def:
            logger.error(f"Invalid tool: {tool_ai_id}")
            return state
        
        # VALIDATE FIRST TOOL
        if step_number == 1:  # First step
            if not tool_def.is_required_first:
                error_msg = (
                    f"First tool must be 'Load Reviews', but agent chose '{tool_def.display_name}'. "
                    "Forcing correct tool."
                )
                logger.warning(error_msg)
                
                # Override with correct tool
                tool_ai_id = 'load_reviews'
                tool_def = self.registry.get_tool_definition(ai_id='load_reviews')
                state['metadata']['next_tool'] = 'load_reviews'
                state['warnings'].append(error_msg)
        
        # VALIDATE LAST TOOL (if agent says finish)
        next_action = state['metadata'].get('next_action')
        if next_action == 'finish':
            # Check if we've used ShowResults
            used_show_results = any(
                mem.get('decision', {}).get('tool_name') == 'show_results'
                for mem in agent_memory
            )
            
            if not used_show_results:
                error_msg = (
                    "Agent tried to finish without using 'Show Results'. "
                    "Forcing Show Results execution."
                )
                logger.warning(error_msg)
                
                # Override to use ShowResults
                tool_ai_id = 'show_results'
                tool_def = self.registry.get_tool_definition(ai_id='show_results')
                state['metadata']['next_tool'] = 'show_results'
                state['metadata']['next_action'] = 'output'
                state['warnings'].append(error_msg)
                

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
            if result.get('success'):                
                state['working_data'] = result.get('data', state['working_data'])
                logger.info(f"✓ Tool executed successfully: {tool_ai_id}")
                
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
                logger.error(f"Tool execution failed: {error_msg}")
                state['errors'].append({
                    'step': state['step_number'],
                    'tool': tool_ai_id,
                    'error': error_msg
                })
                
                # Send error event
                if self.websocket_manager:
                    await self.websocket_manager.send_execution_error(
                        session_id=state['session_id'],
                        execution_id=state['execution_id'],
                        error=error_msg,
                        step_number=state['step_number']
                    )
                
        except Exception as e:
            logger.exception(f"Tool execution error: {e}")
            state['errors'].append({
                'step': state['step_number'],
                'tool': tool_ai_id,
                'error': str(e)
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
        
        # Checkpoint: execution step
        if self.state_manager.should_checkpoint(state['condition'], 'execution_step'):
            # ✅ USE CONTEXT MANAGER
            with get_db_context() as db:
                self.state_manager.checkpoint_to_db(
                    db=db,
                    execution_id=state['execution_id'],
                    step_number=state['step_number'],
                    checkpoint_type='execution_step',
                    state=dict(state),
                    metadata={
                        'tool': tool_ai_id,
                        'action': action,
                        'execution_time_ms': step_time
                    }
                )

        # Update Redis
        self.state_manager.save_state_to_memory(state['execution_id'], dict(state))
        
        # Send completion event
        if self.websocket_manager:
            await self.websocket_manager.send_execution_progress(
                session_id=state['session_id'],
                execution_id=state['execution_id'],
                event_type='tool_execution_complete',
                data={
                    'tool_name': tool_ai_id,
                    'step': state['step_number'],
                    'success': result.get('success', False)
                }
            )
        
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