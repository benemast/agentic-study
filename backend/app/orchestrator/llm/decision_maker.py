# backend/app/orchestrator/llm/decision_maker.py
"""
AI Agent Decision Maker
Uses LLM to make intelligent decisions about next actions
"""
from typing import Dict, Any, List, Optional
import logging
import json
from datetime import datetime

from ..degradation import graceful_degradation

from .client import llm_client
from .tool_schemas import (
    AgentDecision, 
    ToolValidator, 
    tool_validator,
    ActionType,
    map_action_to_tool
)

logger = logging.getLogger(__name__)

class DecisionMaker:
    """
    Makes intelligent decisions about what action to take next
    
    Features:
    - Streaming LLM calls for reduced latency (TTFB < 1s)
    - Real-time 'agent_thinking' WebSocket events
    - Context-aware decision making using tool registry
    - Tool availability checking via registry
    - Confidence thresholds
    - Fallback strategies
    """
    
    def __init__(self, confidence_threshold: float = 0.6, enable_streaming: bool = True):
        """
        Initialize decision maker
        
        Args:
            confidence_threshold: Minimum confidence for decisions (0-1)
            enable_streaming: Use streaming for LLM calls (recommended: True)
        """
        from ..tools.registry import tool_registry
        self.confidence_threshold = confidence_threshold
        self.validator = tool_validator
        self.registry = tool_registry
        self.enable_streaming = enable_streaming
        
        # For WebSocket updates during streaming
        self.websocket_manager = None
        
        logger.info(
            f"DecisionMaker initialized: "
            f"streaming={'enabled' if enable_streaming else 'disabled'}, "
            f"confidence_threshold={confidence_threshold}"
        )
    
    def set_websocket_manager(self, ws_manager):
        """Set WebSocket manager for real-time updates"""
        self.websocket_manager = ws_manager
        logger.info("WebSocket manager injected into DecisionMaker")
    
    async def get_next_decision(
        self,
        task_description: str,
        state: Dict[str, Any],
        memory: List[Dict[str, Any]]
    ) -> AgentDecision:
        """
        Determine the next action to take with STREAMING support
        Streams decision-making process to frontend via WebSocket
        
        Args:
            task_description: User's task goal
            state: Current workflow state
            memory: History of previous decisions
            
        Returns:
            Validated AgentDecision with action, tool, reasoning, confidence
            
        Example WebSocket Events:
            - type: 'agent_thinking', chunk: 'Based on...'
            - type: 'agent_thinking', chunk: 'I will use...'
            (sent during LLM processing)
        """

        # GET DEGRADATION CONFIG
        config = graceful_degradation.get_config()

        # Use config settings
        if not config.llm_decisions_enabled:
            # Use rule-based fallback instead of LLM
            logger.info("Degradation: Using rule-based decision (no LLM)")
            return self._get_safe_fallback_decision(state, "System degraded")


        # Build context-rich prompt
        prompt = self._build_decision_prompt(
            task_description,
            state,
            memory
        )
        
        system_prompt = self._build_system_prompt(state)
        
        # ========================================
        # STREAMING CALLBACK SETUP
        # ========================================
        on_chunk = None
        if self.enable_streaming and self.websocket_manager:
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            
            # Track chunks for throttling
            chunk_counter = [0]
            
            async def stream_thinking(chunk: str):
                """
                Send thinking chunks to frontend for real-time feedback
                
                Throttled to every 10 chunks to avoid WebSocket spam
                """
                chunk_counter[0] += 1
                
                # Throttle: only send every 10th chunk
                if chunk_counter[0] % 10 == 0:
                    try:
                        await self.websocket_manager.send_to_session(
                            session_id,
                            {
                                'type': 'agent_thinking',
                                'execution_id': execution_id,
                                'chunk': chunk,
                                'chunks_received': chunk_counter[0],
                                'timestamp': datetime.utcnow().isoformat()
                            }
                        )
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to send thinking chunk: {e}")
            
            on_chunk = stream_thinking
            logger.debug(f"🌊 Streaming enabled for decision making (session={session_id})")
        else:
            logger.debug("📦 Streaming disabled or no WebSocket available")
        
        # ========================================
        # LLM DECISION CALL WITH STREAMING
        # ========================================
        try:
            logger.info(f"🤔 Making decision (step {state.get('step_number', 0)})")
            
            # Get decision from LLM WITH STREAMING
            response = await llm_client.get_structured_decision(
                prompt=prompt,
                system_prompt=system_prompt,
                expected_fields=['action', 'reasoning', 'tool_name', 'confidence'],
                stream=self.enable_streaming,
                on_chunk=on_chunk
            )
            
            logger.info(
                f"LLM response received: "
                f"streamed={response.get('streamed', False)}, "
                f"TTFB={response.get('ttfb_ms', 'N/A')}ms"
            )
            
            # Parse and validate decision
            decision = self._parse_and_validate_decision(response, state)
            
            # Check confidence threshold
            if decision.confidence < self.confidence_threshold:
                logger.warning(
                    f"Low confidence decision: {decision.confidence:.2f} < {self.confidence_threshold}"
                )
                # Could implement fallback strategy here
            
            logger.info(
                f"Decision: {decision.action} -> {decision.tool_name} "
                f"(confidence: {decision.confidence:.2f})"
            )
            logger.debug(f"   Reasoning: {decision.reasoning}")
            
            return decision
            
        except Exception as e:
            logger.error(f"Error in decision making: {e}", exc_info=True)
            return self._get_safe_fallback_decision(state, str(e))
    
    def _build_system_prompt(self, state: Dict[str, Any]) -> str:
        """Build system prompt with role definition"""
        available_tools_str = self.validator.format_tools_for_prompt(state)
        
        return f"""You are an autonomous AI assistant that plans and executes data analysis tasks.

CRITICAL WORKFLOW RULES:
1. ALWAYS start with 'load_reviews' tool as your FIRST action
2. ALWAYS end with 'show_results' tool as your LAST action before finishing
3. Never use 'load_reviews' after the first step
4. Never use 'show_results' until you're ready to finish
5. Use 'show_results' exactly once, at the end

Workflow pattern:
Step 1: load_reviews (REQUIRED FIRST)
Step 2-N: Any analysis/transformation tools
Step N+1: show_results (REQUIRED LAST)
Step N+2: finish

Available tools:
{{available_tools_str}}

Guidelines:
1. Start with loading data (load_reviews)
2. Clean/filter data before analysis
3. Analyze sentiment when you have review text data
4. Generate insights from analyzed data
4. Format final output (show_results) 
5. Finish only after show_results
6. Be efficient - don't repeat unnecessary steps
7. Always explain your reasoning clearly
8. Use actual tool IDs from the available tools list above

Your role:
- Analyze the current task state
- Decide the next logical action
- Choose appropriate tools based on availability
- Provide clear reasoning for decisions

Decision format (JSON):
{{
  "action": "load|filter|clean|sort|combine|analyze|generate|output|finish",
  "tool_name": "specific_tool_id (e.g., load_reviews, review_sentiment_analysis)",
  "reasoning": "Clear explanation of why this is the right next step",
  "tool_params": {{}},
  "confidence": 0.0-1.0,
  "alternatives_considered": ["other options you thought about"]
}}

REMEMBER: 
- load_reviews = FIRST tool only
- show_results = LAST tool before finish
- finish = AFTER show_results only"""
    
    def _build_decision_prompt(
        self,
        task_description: str,
        state: Dict[str, Any],
        memory: List[Dict[str, Any]]
    ) -> str:
        """Build detailed prompt for decision making"""
        
        # Current state summary
        working_data = state.get('working_data', {})
        records = working_data.get('records', [])
        step_number = state.get('step_number', 0)
        
        state_summary = f"""
Task: {task_description}

Current State:
- Step: {step_number}
- Records available: {len(records)}
- Has sentiment analysis: {'sentiment' in str(working_data)}
- Has insights: {'insights' in working_data}

"""
        
        # Memory summary
        if memory:
            recent_history = self._format_memory(memory[-5:])  # Last 5 steps
            state_summary += f"\nRecent History:\n{recent_history}\n"
        else:
            state_summary += "\nThis is the first step.\n"
        
        # Decision request
        decision_request = """
Based on the current state and task goal, what should be the next action?

Respond with a JSON object containing your decision and reasoning.
"""
        
        return state_summary + decision_request
    
    def _format_memory(self, memory: List[Dict[str, Any]]) -> str:
        """Format memory for prompt"""
        history_lines = []
        for mem_entry in memory:
            step = mem_entry.get('step', '?')
            decision = mem_entry.get('decision', {})
            action = decision.get('action', 'unknown')
            tool = decision.get('tool_name', 'none')
            
            history_lines.append(f"Step {step}: {action} using {tool}")
        
        return "\n".join(history_lines)
    
    def _parse_and_validate_decision(
        self,
        response: Dict[str, Any],
        state: Dict[str, Any]
    ) -> AgentDecision:
        """Parse LLM response and validate decision"""
        
        # Map action string to enum
        action_str = response.get('action', 'finish').lower()
        try:
            action = ActionType(action_str)
        except ValueError:
            logger.warning(f"Invalid action '{action_str}', defaulting to finish")
            action = ActionType.FINISH
        
        # Get tool_name (AI ID format)
        tool_name_str = response.get('tool_name')
        
        if tool_name_str and action != ActionType.FINISH:
            # Verify tool exists in registry
            tool_def = self.registry.get_tool_definition(ai_id=tool_name_str)
            if not tool_def:
                logger.warning(f"Invalid tool name '{tool_name_str}', inferring from action")
                tool_name_str = self._infer_tool_from_action(action, state)
        elif action != ActionType.FINISH:
            # No tool specified, infer from action
            tool_name_str = self._infer_tool_from_action(action, state)
        else:
            tool_name_str = None
        
        # Validate tool parameters
        tool_params = response.get('tool_params', {})
        
        # Build validated decision
        decision = AgentDecision(
            action=action,
            tool_name=tool_name_str,
            reasoning=response.get('reasoning', 'No reasoning provided'),
            tool_params=tool_params,
            confidence=float(response.get('confidence', 0.7)),
            alternatives_considered=response.get('alternatives_considered', [])
        )
        
        return decision
    
    def _infer_tool_from_action(
        self,
        action: ActionType,
        state: Dict[str, Any]
    ) -> Optional[str]:
        """
        Infer appropriate tool from action type
        
        Uses map_action_to_tool from tool_schemas
        """
        return map_action_to_tool(action, state)
    
    def _get_safe_fallback_decision(
        self,
        state: Dict[str, Any],
        error_reason: str
    ) -> AgentDecision:
        """
        Get safe fallback decision when LLM fails
        
        Uses heuristics based on state to make reasonable decision
        """
        logger.warning(f"Using fallback decision due to: {error_reason}")
        
        working_data = state.get('working_data', {})
        records = working_data.get('records', [])
        memory = state.get('agent_memory', [])
        
        # Decision logic based on state
        if not records:
            # No data yet - gather it
            return AgentDecision(
                action=ActionType.LOAD,
                tool_name='load_reviews',
                reasoning=f"Fallback: No data available, loading first. Error: {error_reason}",
                confidence=0.5
            )
        
        elif len(memory) >= 8:
            # Many steps taken - probably time to finish
            return AgentDecision(
                action=ActionType.FINISH,
                tool_name=None,
                reasoning=f"Fallback: Many steps completed, finishing. Error: {error_reason}",
                confidence=0.4
            )
        
        elif not any('sentiment' in str(r) for r in records):
            # Have data but no sentiment
            return AgentDecision(
                action=ActionType.ANALYZE,
                tool_name='review_sentiment_analysis',
                reasoning=f"Fallback: Have data, analyzing sentiment. Error: {error_reason}",
                confidence=0.5
            )
        
        elif 'insights' not in working_data:
            # Have analysis but no insights
            return AgentDecision(
                action=ActionType.GENERATE,
                tool_name='generate_insights',
                reasoning=f"Fallback: Have analysis, generating insights. Error: {error_reason}",
                confidence=0.5
            )
        
        else:
            # Have everything - output results
            return AgentDecision(
                action=ActionType.OUTPUT,
                tool_name='show_results',
                reasoning=f"Fallback: All processing done, showing results. Error: {error_reason}",
                confidence=0.5
            )


# ============================================================
# SINGLETON PATTERN WITH LAZY INITIALIZATION
# ============================================================

_decision_maker_instance = None

def get_decision_maker() -> DecisionMaker:
    """Get singleton decision maker instance (lazy initialization)"""
    global _decision_maker_instance
    if _decision_maker_instance is None:
        _decision_maker_instance = DecisionMaker(
            confidence_threshold=0.6,
            enable_streaming=True
        )
    return _decision_maker_instance

# For backwards compatibility
class _DecisionMakerProxy:
    """Proxy for lazy decision_maker access"""
    def __getattr__(self, name):
        return getattr(get_decision_maker(), name)
    
    def __call__(self, *args, **kwargs):
        return get_decision_maker()(*args, **kwargs)

decision_maker = _DecisionMakerProxy()