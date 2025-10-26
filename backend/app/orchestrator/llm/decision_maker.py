# backend/app/orchestrator/llm/decision_maker.py
"""
AI Agent Decision Maker
Uses LLM to make intelligent decisions about next actions
"""
from typing import Dict, Any, List, Optional
import logging
import json
from datetime import datetime

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
    - Context-aware decision making using tool registry
    - Tool availability checking via registry
    - Confidence thresholds
    - Fallback strategies
    """
    
    def __init__(self, confidence_threshold: float = 0.6):

        from ..tools.registry import tool_registry
        self.confidence_threshold = confidence_threshold
        self.validator = tool_validator
        self.registry = tool_registry
    
    async def get_next_decision(
        self,
        task_description: str,
        state: Dict[str, Any],
        memory: List[Dict[str, Any]]
    ) -> AgentDecision:
        """
        Determine the next action to take
        
        Args:
            task_description: User's task goal
            state: Current workflow state
            memory: History of previous decisions
            
        Returns:
            Validated AgentDecision
        """
        # Build context-rich prompt
        prompt = self._build_decision_prompt(
            task_description,
            state,
            memory
        )
        
        system_prompt = self._build_system_prompt(state)
        
        try:
            # Get decision from LLM
            response = await llm_client.get_structured_decision(
                prompt=prompt,
                system_prompt=system_prompt,
                expected_fields=['action', 'reasoning', 'tool_name', 'confidence']
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
            
            return decision
            
        except Exception as e:
            logger.error(f"Error in decision making: {e}", exc_info=True)
            return self._get_safe_fallback_decision(state, str(e))
    
    def _build_system_prompt(self, state: Dict[str, Any]) -> str:
        """Build system prompt with role definition"""
        available_tools_str = self.validator.format_tools_for_prompt(state)
        
        return f"""You are an autonomous AI assistant that plans and executes data analysis tasks.

Your role:
- Analyze the current task state
- Decide the next logical action
- Choose appropriate tools based on availability
- Provide clear reasoning for decisions

Currently Available Tools:
{available_tools_str}

Decision format (JSON):
{{
  "action": "gather|filter|clean|sort|combine|analyze|generate|output|finish",
  "tool_name": "specific_tool_id (e.g., gather_data, sentiment_analysis)",
  "reasoning": "Clear explanation of why this is the right next step",
  "tool_params": {{}},
  "confidence": 0.0-1.0,
  "alternatives_considered": ["other options you thought about"]
}}

Guidelines:
1. Start with gathering data if none exists
2. Clean/filter data before analysis
3. Analyze sentiment when you have text data
4. Generate insights from analyzed data
5. Output results when task is complete
6. Be efficient - don't repeat unnecessary steps
7. Always explain your reasoning clearly
8. Only use tools that are currently available (listed above)"""
    
    def _build_decision_prompt(
        self,
        task: str,
        state: Dict[str, Any],
        memory: List[Dict[str, Any]]
    ) -> str:
        """Build detailed decision prompt with context"""
        
        # Analyze current state
        working_data = state.get('working_data', {})
        records = working_data.get('records', [])
        step_number = state.get('step_number', 0)
        errors = state.get('errors', [])
        
        # Build state summary
        state_summary = self._summarize_state(working_data)
        
        # Build action history
        action_history = self._summarize_history(memory)
        
        # Check for recent errors
        error_context = ""
        if errors:
            recent_errors = errors[-2:]
            error_context = f"\n⚠️ Recent errors: {[e.get('error', 'unknown') for e in recent_errors]}"
        
        prompt = f"""Task Goal: {task}

Current State (Step {step_number}):
{state_summary}{error_context}

Action History:
{action_history}

Analysis Required:
1. What has been accomplished so far?
2. What is the next logical step toward completing the task?
3. Which available tool is best suited for this step?
4. What parameters (if any) should be used?
5. Are there alternative approaches to consider?

Provide your decision in JSON format with clear reasoning."""
        
        return prompt
    
    def _summarize_state(self, working_data: Dict[str, Any]) -> str:
        """Create concise state summary"""
        records = working_data.get('records', [])
        
        summary_lines = [
            f"- Records: {len(records)} available"
        ]
        
        if records:
            # Check what's been done to the data
            sample = records[0] if records else {}
            
            if 'sentiment' in sample:
                summary_lines.append("- Sentiment: ✓ Analyzed")
            else:
                summary_lines.append("- Sentiment: ✗ Not analyzed")
            
            if 'insights' in working_data:
                summary_lines.append("- Insights: ✓ Generated")
            else:
                summary_lines.append("- Insights: ✗ Not generated")
        else:
            summary_lines.append("- Status: No data yet - need to gather")
        
        return "\n".join(summary_lines)
    
    def _summarize_history(self, memory: List[Dict[str, Any]]) -> str:
        """Summarize action history"""
        if not memory:
            return "None - this is the first step"
        
        # Show last 3 actions
        recent = memory[-3:]
        history_lines = []
        
        for item in recent:
            decision = item.get('decision', {})
            step = item.get('step', '?')
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
        if tool_name_str:
            try:
                tool_params = self.validator.validate_tool_params(tool_name_str, tool_params)
            except ValueError as e:
                logger.warning(f"Invalid tool params, using defaults: {e}")
                tool_params = {}
        
        # Check if tool can be executed
        if tool_name_str:
            can_execute, reason = self.validator.can_execute_tool(tool_name_str, state)
            if not can_execute:
                logger.warning(f"Tool {tool_name_str} cannot be executed: {reason}")
                # Try to find alternative
                tool_name_str = self._find_executable_tool(state)
        
        # Construct validated decision
        decision = AgentDecision(
            action=action,
            tool_name=tool_name_str,
            reasoning=response.get('reasoning', 'No reasoning provided'),
            tool_params=tool_params,
            confidence=float(response.get('confidence', 0.5)),
            alternatives_considered=response.get('alternatives_considered', [])
        )
        
        return decision
    
    def _infer_tool_from_action(
        self,
        action: ActionType,
        state: Dict[str, Any]
    ) -> Optional[str]:
        """
        Infer appropriate tool from action type using helper function
        
        Args:
            action: Action type
            state: Current state
            
        Returns:
            Tool AI ID or None
        """
        return map_action_to_tool(action, state)
    
    def _find_executable_tool(self, state: Dict[str, Any]) -> Optional[str]:
        """
        Find any tool that can be executed in current state
        
        Args:
            state: Current workflow state
            
        Returns:
            Tool AI ID or None
        """
        available_tools = self.validator.get_available_tools(state)
        
        # Return first available tool (prefer gather_data if available)
        if 'gather_data' in available_tools:
            return 'gather_data'
        elif available_tools:
            return available_tools[0]
        
        return None
    
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
                action=ActionType.GATHER,
                tool_name='gather_data',
                reasoning=f"Fallback: No data available, gathering first. Error: {error_reason}",
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
        
        elif not any('sentiment' in r for r in records):
            # Have data but no sentiment
            return AgentDecision(
                action=ActionType.ANALYZE,
                tool_name='sentiment_analysis',
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


# Global decision maker instance
# decision_maker = DecisionMaker(confidence_threshold=0.6)

# WITH:
_decision_maker_instance = None

def get_decision_maker() -> DecisionMaker:
    """Get singleton decision maker instance (lazy initialization)"""
    global _decision_maker_instance
    if _decision_maker_instance is None:
        _decision_maker_instance = DecisionMaker(confidence_threshold=0.6)
    return _decision_maker_instance

# For backwards compatibility
class _DecisionMakerProxy:
    """Proxy for lazy decision_maker access"""
    def __getattr__(self, name):
        return getattr(get_decision_maker(), name)
    
    def __call__(self, *args, **kwargs):
        return get_decision_maker()(*args, **kwargs)

decision_maker = _DecisionMakerProxy()