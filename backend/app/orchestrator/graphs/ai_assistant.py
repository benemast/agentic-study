# backend/app/orchestrator/graphs/ai_assistant.py
from langgraph.graph import StateGraph, END
from typing import Dict, Any
import logging
import time
import httpx
from datetime import datetime

from .shared_state import SharedWorkflowState, AgentDecision
from ..tools.data_tools import GatherDataTool, FilterDataTool, CleanDataTool
from ..tools.analysis_tools import SentimentAnalysisTool, GenerateInsightsTool, ShowResultsTool
from app.config import settings

logger = logging.getLogger(__name__)


class AIAssistantGraph:
    """
    Autonomous agent that plans and executes tasks
    
    Agent decides its own path based on the goal
    Minimal user oversight - agent makes decisions
    Focus on autonomy and intelligent task completion
    """
    
    # Available tools for the agent
    AVAILABLE_TOOLS = {
        'gather_data': GatherDataTool(),
        'filter_data': FilterDataTool(),
        'clean_data': CleanDataTool(),
        'sentiment_analysis': SentimentAnalysisTool(),
        'generate_insights': GenerateInsightsTool(),
        'show_results': ShowResultsTool(),
    }
    
    def __init__(self, state_manager, websocket_manager=None):
        self.state_manager = state_manager
        self.websocket_manager = websocket_manager
        self.max_steps = 10  # Prevent infinite loops
    
    def build_graph(self) -> StateGraph:
        """
        Build autonomous agent graph
        
        Returns:
            Compiled LangGraph with agent nodes
        """
        logger.info("Building AI Assistant graph")
        
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
        Agent plans the next action
        
        Uses LLM to decide what to do based on current state and goal
        """
        step_start_time = time.time()
        state['step_number'] = state.get('step_number', 0) + 1
        state['current_node'] = 'planner'
        
        logger.info(f"Agent planning step {state['step_number']}")
        
        # Get agent decision from LLM
        decision = await self._get_agent_decision(state)
        
        # Store decision in state
        if 'agent_memory' not in state:
            state['agent_memory'] = []
        
        state['agent_memory'].append({
            'step': state['step_number'],
            'decision': decision,
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
                    agent_reasoning=decision['reasoning'],
                    metadata={'decision': decision}
                )
            finally:
                db.close()
        
        # Send WebSocket update
        if self.websocket_manager:
            await self.websocket_manager.send_progress(state['session_id'], {
                'type': 'agent_decision',
                'execution_id': state['execution_id'],
                'action': decision['action'],
                'reasoning': decision['reasoning'],
                'step': state['step_number']
            })
        
        # Store next action in metadata
        state['metadata']['next_action'] = decision['action']
        state['metadata']['next_tool'] = decision.get('tool_name')
        
        return state
    
    async def _agent_execute_step(self, state: SharedWorkflowState) -> SharedWorkflowState:
        """
        Execute the action decided by the planner
        """
        step_start_time = time.time()
        action = state['metadata'].get('next_action')
        tool_name = state['metadata'].get('next_tool')
        
        logger.info(f"Agent executing: {action} with tool {tool_name}")
        
        state['current_node'] = 'executor'
        
        # Get and execute tool
        tool = self.AVAILABLE_TOOLS.get(tool_name)
        
        if tool:
            try:
                result = await tool.run(state['working_data'])
                
                # Update state with result
                if result['success']:
                    state['results'][f"step_{state['step_number']}"] = result
                    state['working_data'] = result.get('data', state['working_data'])
                else:
                    state['errors'].append({
                        'step': state['step_number'],
                        'error': result.get('error'),
                        'timestamp': datetime.utcnow().isoformat()
                    })
                
            except Exception as e:
                logger.exception(f"Error executing tool {tool_name}: {e}")
                state['errors'].append({
                    'step': state['step_number'],
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        # Update timing
        step_time = int((time.time() - step_start_time) * 1000)
        state['total_time_ms'] = state.get('total_time_ms', 0) + step_time
        
        # Update Redis
        self.state_manager.save_state_to_memory(state['execution_id'], dict(state))
        
        # Send WebSocket update
        if self.websocket_manager:
            await self.websocket_manager.send_progress(state['session_id'], {
                'type': 'tool_execution',
                'execution_id': state['execution_id'],
                'tool': tool_name,
                'step': state['step_number']
            })
        
        return state
    
    async def _agent_validate_step(self, state: SharedWorkflowState) -> SharedWorkflowState:
        """
        Validate the final results
        """
        logger.info("Agent validating results")
        
        state['current_node'] = 'validator'
        state['status'] = 'completed'
        
        # Final validation
        validation = {
            'steps_completed': state['step_number'],
            'errors_encountered': len(state.get('errors', [])),
            'results_available': bool(state.get('working_data'))
        }
        
        state['metadata']['validation'] = validation
        
        return state
    
    def _route_from_planner(self, state: SharedWorkflowState) -> str:
        """
        Decide where to route from planner
        
        Returns:
            'execute', 'validate', or 'finish'
        """
        action = state['metadata'].get('next_action', 'finish')
        step_number = state.get('step_number', 0)
        
        # Safety: prevent infinite loops
        if step_number >= self.max_steps:
            logger.warning(f"Max steps ({self.max_steps}) reached, finishing")
            return 'finish'
        
        # Check if task is complete
        if action == 'finish' or action == 'complete':
            return 'validate'
        
        # Continue executing
        return 'execute'
    
    async def _get_agent_decision(self, state: SharedWorkflowState) -> AgentDecision:
        """
        Call LLM to get agent's next decision
        
        Args:
            state: Current workflow state
            
        Returns:
            AgentDecision with next action
        """
        task_description = state.get('task_description', 'Complete the task')
        completed_steps = len(state.get('agent_memory', []))
        current_data = state.get('working_data', {})
        
        # Build prompt for LLM
        prompt = self._build_decision_prompt(
            task_description,
            completed_steps,
            current_data,
            state.get('agent_memory', [])
        )
        
        # Call OpenAI API
        try:
            decision = await self._call_llm_for_decision(prompt)
            return decision
        except Exception as e:
            logger.error(f"Error getting agent decision: {e}")
            # Fallback decision
            return {
                'action': 'finish',
                'reasoning': f'Error in decision making: {e}',
                'tool_name': None,
                'tool_params': {},
                'confidence': 0.0,
                'alternatives_considered': []
            }
    
    def _build_decision_prompt(
        self,
        task: str,
        steps_completed: int,
        current_data: Dict[str, Any],
        memory: list
    ) -> str:
        """Build prompt for LLM decision making"""
        
        prompt = f"""You are an autonomous AI assistant completing a data analysis task.

Task: {task}

Steps completed so far: {steps_completed}

Current data state:
- Records: {len(current_data.get('records', []))}
- Has sentiment: {any('sentiment' in r for r in current_data.get('records', []))}
- Has insights: {'insights' in current_data}

Available tools:
1. gather_data - Collect initial data
2. filter_data - Filter records by criteria
3. clean_data - Clean and normalize data
4. sentiment_analysis - Analyze sentiment of text
5. generate_insights - Generate insights from data
6. show_results - Format and output results

Previous actions: {[m['decision']['action'] for m in memory[-3:]]}

Decide the next action. Choose from:
- gather_data (if no data yet)
- sentiment_analysis (if have data but no sentiment)
- generate_insights (if have analyzed data but no insights)
- show_results (if ready to output)
- finish (if task is complete)

Return your decision as JSON:
{{
  "action": "action_name",
  "reasoning": "why you chose this action",
  "tool_name": "tool_to_use",
  "confidence": 0.9
}}"""
        
        return prompt
    
    async def _call_llm_for_decision(self, prompt: str) -> AgentDecision:
        """
        Call OpenAI API for decision
        
        Args:
            prompt: Decision prompt
            
        Returns:
            AgentDecision
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.openai_api_url,
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful AI assistant that makes decisions for task execution."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 300
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                # Parse JSON response
                import json
                try:
                    decision_json = json.loads(content)
                    return {
                        'action': decision_json.get('action', 'finish'),
                        'reasoning': decision_json.get('reasoning', ''),
                        'tool_name': decision_json.get('tool_name'),
                        'tool_params': decision_json.get('tool_params', {}),
                        'confidence': decision_json.get('confidence', 0.5),
                        'alternatives_considered': decision_json.get('alternatives', [])
                    }
                except json.JSONDecodeError:
                    # Fallback parsing
                    return self._parse_text_decision(content)
            else:
                logger.error(f"OpenAI API error: {response.status_code}")
                return {
                    'action': 'finish',
                    'reasoning': 'API error',
                    'tool_name': None,
                    'tool_params': {},
                    'confidence': 0.0,
                    'alternatives_considered': []
                }
    
    def _parse_text_decision(self, text: str) -> AgentDecision:
        """Fallback parser if LLM doesn't return JSON"""
        text_lower = text.lower()
        
        # Simple keyword matching
        if 'gather' in text_lower or 'collect' in text_lower:
            action = 'gather_data'
        elif 'sentiment' in text_lower:
            action = 'sentiment_analysis'
        elif 'insight' in text_lower:
            action = 'generate_insights'
        elif 'show' in text_lower or 'output' in text_lower:
            action = 'show_results'
        else:
            action = 'finish'
        
        return {
            'action': action,
            'reasoning': text,
            'tool_name': action if action != 'finish' else None,
            'tool_params': {},
            'confidence': 0.5,
            'alternatives_considered': []
        }