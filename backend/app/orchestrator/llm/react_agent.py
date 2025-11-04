# backend/app/orchestrator/llm/react_agent.py
"""
ReAct Agent for AI Assistant Decision Making

Implements the ReAct (Reasoning + Acting) pattern for autonomous task execution:
- Thought: Agent reasons about current state and next action
- Action: Agent selects and executes a tool
- Observation: Agent observes tool results
- Repeat until task complete

Features:
- Streaming thought process to frontend
- Tool selection with confidence scoring
- Fallback to rule-based decisions on errors
- LangSmith tracing integration
- Circuit breaker protection

Architecture:
- Uses LangChain's create_structured_chat_agent
- Streams thinking via WebSocket callbacks
- Validates decisions against tool registry
- Integrates with existing SharedWorkflowState
"""
import asyncio
import logging
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.tools import StructuredTool

from app.configs.config import settings
from .client_langchain import get_llm_client
from .streaming_callbacks import get_callback_factory
from .tool_adapter import create_langchain_tools_from_registry
from .tool_schemas import ActionType, get_tool_validator
from .tool_output_schemas import AgentDecisionOutput
from .circuit_breaker_enhanced import CircuitBreakerOpen

logger = logging.getLogger(__name__)


# ============================================================
# REACT PROMPT TEMPLATES
# ============================================================

REACT_SYSTEM_TEMPLATE = """You are an AI assistant specialized in data analysis workflows.

Your goal: Help users analyze customer review data by autonomously planning and executing analysis steps.

## Available Tools

You have access to these tools:
{tools}

## Tool Descriptions
{tool_descriptions}

## Workflow Rules

**CRITICAL CONSTRAINTS:**
1. **load_reviews MUST be first tool** (step 1 only)
2. **show_results MUST be last tool** (before finish)
3. **finish ONLY after show_results**

**Tool Categories:**
- **Data Tools** (load, filter, sort, clean): Modify the dataset
- **Analysis Tools** (sentiment_analysis): Add insights without modifying rows
- **Generation Tools** (generate_insights): Create business recommendations
- **Output Tools** (show_results): Format final results

**Best Practices:**
- Use sentiment analysis before generating insights
- Filter/clean data early to improve analysis speed
- Always show_results before finishing
- Generate insights from analyzed data

## Decision Format

You MUST respond with valid JSON in this exact structure:
```json
{{
  "action": "load|filter|sort|clean|analyze|generate|output|finish",
  "tool_name": "specific_tool_id",
  "reasoning": "Clear explanation of why this is the right next step",
  "tool_params": {{}},
  "confidence": 0.0-1.0,
  "alternatives_considered": ["other options you evaluated"]
}}
```

## Current Task Context

Task: {task_description}

Current State:
- Step: {step_number}
- Records available: {record_count}
- Has sentiment analysis: {has_sentiment}
- Has insights: {has_insights}

{history}

## Your Task

Based on the current state, decide the NEXT action. Think step-by-step:
1. What has been done so far?
2. What is needed to complete the task?
3. What is the logical next step?
4. Which tool should I use?

Respond with your decision in JSON format.
"""


def build_react_prompt() -> ChatPromptTemplate:
    """
    Build ReAct prompt template
    
    Returns:
        ChatPromptTemplate for ReAct agent
    """
    return ChatPromptTemplate.from_messages([
        ("system", REACT_SYSTEM_TEMPLATE),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])


# ============================================================
# REACT AGENT
# ============================================================

class ReactAgent:
    """
    ReAct Agent for autonomous decision-making in AI Assistant
    
    Features:
    - Full ReAct loop (Thought → Action → Observation)
    - Streaming thought process to frontend
    - Tool validation via registry
    - Circuit breaker protection
    - Fallback to rule-based decisions
    
    Usage:
        agent = ReactAgent(tool_registry, ws_manager)
        
        decision = await agent.get_next_decision(
            task_description="Analyze headphone reviews",
            state=current_state,
            memory=conversation_memory
        )
    """
    
    def __init__(
        self,
        tool_registry,
        ws_manager=None,
        confidence_threshold: float = 0.6,
        max_iterations: int = 3
    ):
        """
        Initialize ReAct agent
        
        Args:
            tool_registry: Tool registry instance
            ws_manager: WebSocket manager for streaming
            confidence_threshold: Minimum confidence for decisions
            max_iterations: Max ReAct iterations per decision
        """
        self.registry = tool_registry
        self.ws_manager = ws_manager
        self.confidence_threshold = confidence_threshold
        self.max_iterations = max_iterations
        
        # Get LLM client and callback factory
        self.llm_client = get_llm_client()
        self.callback_factory = get_callback_factory() if ws_manager else None
        
        # Tool validator
        self.validator = get_tool_validator()
        
        # Agent executor (created per decision for fresh context)
        self._agent_executor = None
        
        logger.info(
            f"ReactAgent initialized: "
            f"confidence_threshold={confidence_threshold}, "
            f"max_iterations={max_iterations}"
        )
    
    async def get_next_decision(
        self,
        task_description: str,
        state: Dict[str, Any],
        memory: List[Dict[str, Any]]
    ) -> AgentDecisionOutput:
        """
        Get next decision using ReAct pattern
        
        Args:
            task_description: User's task goal
            state: Current workflow state (SharedWorkflowState)
            memory: History of previous decisions
            
        Returns:
            AgentDecisionOutput with action, tool, reasoning, confidence
            
        Process:
            1. Build context from state and memory
            2. Create LangChain tools for current state
            3. Stream ReAct thinking to frontend
            4. Parse and validate decision
            5. Fallback to rule-based if needed
        """
        session_id = state.get('session_id')
        execution_id = state.get('execution_id')
        step_number = state.get('step_number', 0)
        
        logger.info(
            f"🤔 ReactAgent making decision: "
            f"session={session_id}, step={step_number}"
        )
        
        # Create streaming callback
        callback = None
        if self.callback_factory and session_id:
            callback = self.callback_factory.create_callback(
                session_id=session_id,
                execution_id=execution_id,
                tool_name='decision_maker',
                step_number=step_number
            )
        
        # Build decision prompt
        prompt_input = self._build_prompt_input(
            task_description,
            state,
            memory
        )
        
        try:
            # Get decision from LLM with streaming
            decision_json = await self._invoke_llm_decision(
                prompt_input=prompt_input,
                callback=callback,
                session_id=session_id,
                execution_id=execution_id
            )
            
            # Parse and validate decision
            decision = self._parse_and_validate_decision(
                decision_json,
                state
            )
            
            # Check confidence threshold
            if decision.confidence < self.confidence_threshold:
                logger.warning(
                    f"Low confidence decision: {decision.confidence:.2f} < {self.confidence_threshold}"
                )
            
            logger.info(
                f"Decision: {decision.action} → {decision.tool_name} "
                f"(confidence: {decision.confidence:.2f})"
            )
            
            return decision
            
        except CircuitBreakerOpen as e:
            # Circuit breaker rejected - use fallback
            logger.error(f"Circuit breaker blocked decision: {e.message}")
            return self._get_fallback_decision(state, str(e))
            
        except Exception as e:
            # Other error - use fallback
            logger.error(f"Error in ReAct decision: {e}", exc_info=True)
            return self._get_fallback_decision(state, str(e))
    
    async def _invoke_llm_decision(
        self,
        prompt_input: Dict[str, Any],
        callback,
        session_id: str,
        execution_id: int
    ) -> Dict[str, Any]:
        """
        Invoke LLM to get decision with streaming
        
        Uses direct chat_completion for better control over streaming
        and JSON output parsing
        """
        # Build messages
        system_message = REACT_SYSTEM_TEMPLATE.format(**prompt_input)
        
        messages = [
            {'role': 'system', 'content': system_message},
            {'role': 'user', 'content': 'What is the next action? Respond with JSON.'}
        ]
        
        # Call LLM with streaming and JSON mode
        response = await self.llm_client.chat_completion(
            tool_name='decision_maker',
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
            callbacks=[callback] if callback else [],
            stream=True
        )
        
        # Check for circuit breaker error
        if 'error' in response:
            if response['error'] == 'circuit_breaker_open':
                raise CircuitBreakerOpen(response['error_message'])
            raise Exception(f"LLM error: {response['error_message']}")
        
        # Parse JSON from content
        content = response['content']
        
        # Try to extract JSON if wrapped in markdown
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        try:
            decision_json = json.loads(content)
            return decision_json
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}\nContent: {content[:200]}")
            raise ValueError(f"Invalid JSON response from LLM: {e}")
    
    def _build_prompt_input(
        self,
        task_description: str,
        state: Dict[str, Any],
        memory: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Build prompt input from current context
        
        Returns:
            Dict with all template variables
        """
        # Get current state summary
        working_data = state.get('working_data', {})
        records = working_data.get('records', [])
        
        # Check for analysis results
        has_sentiment = any('sentiment' in str(r) for r in records[:10])
        has_insights = 'insights' in working_data
        
        # Format tool descriptions
        tools_info = self._format_tools_for_prompt(state)
        
        # Format history
        history = self._format_memory(memory)
        
        return {
            'task_description': task_description,
            'step_number': state.get('step_number', 0),
            'record_count': len(records),
            'has_sentiment': has_sentiment,
            'has_insights': has_insights,
            'tools': tools_info['tool_list'],
            'tool_descriptions': tools_info['tool_descriptions'],
            'history': history
        }
    
    def _format_tools_for_prompt(self, state: Dict[str, Any]) -> Dict[str, str]:
        """
        Format available tools for prompt
        
        Only includes tools that can execute in current state
        """
        tool_list = []
        tool_descriptions = []
        
        # Get all tool definitions
        for tool_def in self.registry.get_all_definitions():
            # Check if tool can execute
            can_execute, reason = self.validator.can_execute_tool(
                tool_def.ai_id,
                state
            )
            
            if not can_execute:
                continue  # Skip unavailable tools
            
            tool_list.append(f"- {tool_def.ai_id}")
            tool_descriptions.append(
                f"**{tool_def.ai_id}** ({tool_def.category}): "
                f"{tool_def.description}"
            )
        
        return {
            'tool_list': '\n'.join(tool_list),
            'tool_descriptions': '\n'.join(tool_descriptions)
        }
    
    def _format_memory(self, memory: List[Dict[str, Any]]) -> str:
        """Format conversation memory for prompt"""
        if not memory:
            return "This is the first step."
        
        # Get recent steps (last 5)
        recent = memory[-5:]
        
        lines = ["Recent History:"]
        for mem_entry in recent:
            step = mem_entry.get('step', '?')
            decision = mem_entry.get('decision', {})
            action = decision.get('action', 'unknown')
            tool = decision.get('tool_name', 'none')
            
            lines.append(f"- Step {step}: {action} using {tool}")
        
        return '\n'.join(lines)
    
    def _parse_and_validate_decision(
        self,
        decision_json: Dict[str, Any],
        state: Dict[str, Any]
    ) -> AgentDecisionOutput:
        """
        Parse and validate decision from LLM
        
        Returns:
            Validated AgentDecisionOutput
        """
        # Map action string to ActionType
        action_str = decision_json.get('action', 'finish').lower()
        
        # Validate action exists
        valid_actions = ['load', 'filter', 'sort', 'clean', 'analyze', 'generate', 'output', 'finish']
        if action_str not in valid_actions:
            logger.warning(f"Invalid action '{action_str}', defaulting to 'finish'")
            action_str = 'finish'
        
        # Get tool_name
        tool_name = decision_json.get('tool_name')
        
        # Validate tool if not finishing
        if action_str != 'finish':
            if not tool_name:
                # Infer tool from action
                from .tool_schemas import map_action_to_tool
                tool_name = map_action_to_tool(ActionType(action_str), state)
            
            # Verify tool exists and can execute
            if tool_name:
                can_execute, reason = self.validator.can_execute_tool(tool_name, state)
                if not can_execute:
                    logger.warning(
                        f"Tool '{tool_name}' cannot execute: {reason}. "
                        f"Decision may fail."
                    )
        
        # Build validated decision
        decision = AgentDecisionOutput(
            action=action_str,
            tool_name=tool_name,
            reasoning=decision_json.get('reasoning', 'No reasoning provided'),
            tool_params=decision_json.get('tool_params', {}),
            confidence=float(decision_json.get('confidence', 0.7)),
            alternatives_considered=decision_json.get('alternatives_considered', [])
        )
        
        return decision
    
    def _get_fallback_decision(
        self,
        state: Dict[str, Any],
        error_reason: str
    ) -> AgentDecisionOutput:
        """
        Get safe fallback decision when LLM fails
        
        Uses heuristics based on state
        """
        logger.warning(f"Using fallback decision due to: {error_reason}")
        
        working_data = state.get('working_data', {})
        records = working_data.get('records', [])
        memory = state.get('agent_memory', [])
        step_number = state.get('step_number', 0)
        
        # Decision logic based on state
        if step_number == 0 or not records:
            # No data yet - gather it
            return AgentDecisionOutput(
                action='load',
                tool_name='load_reviews',
                reasoning=f"Fallback: No data available, loading first. Error: {error_reason}",
                confidence=0.5,
                tool_params={},
                alternatives_considered=[]
            )
        
        elif len(memory) >= 8:
            # Many steps taken - probably time to output
            return AgentDecisionOutput(
                action='output',
                tool_name='show_results',
                reasoning=f"Fallback: Many steps completed, showing results. Error: {error_reason}",
                confidence=0.4,
                tool_params={},
                alternatives_considered=[]
            )
        
        elif not any('sentiment' in str(r) for r in records[:10]):
            # Have data but no sentiment
            return AgentDecisionOutput(
                action='analyze',
                tool_name='review_sentiment_analysis',
                reasoning=f"Fallback: Have data, analyzing sentiment. Error: {error_reason}",
                confidence=0.5,
                tool_params={'extract_themes': True},
                alternatives_considered=[]
            )
        
        elif 'insights' not in working_data:
            # Have analysis but no insights
            return AgentDecisionOutput(
                action='generate',
                tool_name='generate_insights',
                reasoning=f"Fallback: Have analysis, generating insights. Error: {error_reason}",
                confidence=0.5,
                tool_params={},
                alternatives_considered=[]
            )
        
        else:
            # Have everything - output results
            return AgentDecisionOutput(
                action='output',
                tool_name='show_results',
                reasoning=f"Fallback: All processing done, showing results. Error: {error_reason}",
                confidence=0.5,
                tool_params={},
                alternatives_considered=[]
            )


# ============================================================
# SINGLETON PATTERN
# ============================================================

_react_agent_instance: Optional[ReactAgent] = None


def initialize_react_agent(tool_registry, ws_manager=None) -> ReactAgent:
    """
    Initialize global ReAct agent instance
    
    Args:
        tool_registry: Tool registry
        ws_manager: WebSocket manager
        
    Returns:
        ReactAgent instance
    """
    global _react_agent_instance
    
    _react_agent_instance = ReactAgent(
        tool_registry=tool_registry,
        ws_manager=ws_manager,
        confidence_threshold=0.6,
        max_iterations=3
    )
    
    logger.info("Global ReactAgent initialized")
    return _react_agent_instance


def get_react_agent() -> ReactAgent:
    """
    Get global ReAct agent instance
    
    Returns:
        ReactAgent instance
        
    Raises:
        RuntimeError: If agent not initialized
    """
    if _react_agent_instance is None:
        raise RuntimeError(
            "ReactAgent not initialized. "
            "Call initialize_react_agent(tool_registry, ws_manager) first."
        )
    return _react_agent_instance


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

class ReactAgentProxy:
    """
    Proxy for backward compatibility with decision_maker.py
    
    Allows existing code to work with minimal changes
    """
    
    def __getattr__(self, name):
        agent = get_react_agent()
        return getattr(agent, name)
    
    async def get_next_decision(self, task_description, state, memory):
        """Delegate to ReactAgent"""
        agent = get_react_agent()
        return await agent.get_next_decision(task_description, state, memory)


# For backward compatibility
react_agent = ReactAgentProxy()


__all__ = [
    'ReactAgent',
    'initialize_react_agent',
    'get_react_agent',
    'react_agent',
    'build_react_prompt',
]