# backend/app/orchestrator/llm/__init__.py
"""
LLM Integration Module for AI Assistant

Provides intelligent decision making for autonomous agent execution:
- Robust LLM client with retry logic
- Tool schema validation
- Context-aware decision making
- Confidence tracking
"""

from .client import LLMClient, llm_client
from .tool_schemas import (
    ToolName,
    ActionType,
    AgentDecision,
    ToolValidator,
    tool_validator,
    TOOL_SCHEMAS
)
from .decision_maker import DecisionMaker, decision_maker

__all__ = [
    # Client
    'LLMClient',
    'llm_client',
    
    # Schemas
    'ToolName',
    'ActionType',
    'AgentDecision',
    'ToolValidator',
    'tool_validator',
    'TOOL_SCHEMAS',
    
    # Decision Maker
    'DecisionMaker',
    'decision_maker',
]

__version__ = '1.0.0'