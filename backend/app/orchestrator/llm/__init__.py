# backend/app/orchestrator/llm/__init__.py
"""
LLM Integration Module for AI Assistant

Provides intelligent decision making for autonomous agent execution:
- Modern LangChain client for LLM calls
- Tool schema validation  
- Context-aware decision making
- Confidence tracking
"""

# ============================================================
# MODERN EXPORTS (PRIMARY)
# ============================================================

from .client_langchain import get_llm_client, LangChainLLMClient
from .tool_schemas import (
    ActionType,
    AgentDecision,
    ToolValidator,
    tool_validator,
    PARAMETER_SCHEMAS
)

# Circuit breaker (if available)
try:
    from .circuit_breaker_enhanced import (
        circuit_breaker_manager,
        get_circuit_breaker_manager
    )
    _circuit_breaker_available = True
except ImportError:
    _circuit_breaker_available = False
    circuit_breaker_manager = None
    get_circuit_breaker_manager = None

# Streaming callbacks - LAZY IMPORT (to avoid circular dependency)
_streaming_available = True
initialize_callback_factory = None
get_callback_factory = None


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    'get_llm_client',
    'LangChainLLMClient',
    
    # ReactAgent
    'get_react_agent',
    'initialize_react_agent',
    'ReactAgent',
    
    # Supporting modules
    'initialize_callback_factory',
    'get_callback_factory',
    'circuit_breaker_manager',
    'get_circuit_breaker_manager',
    
    # Schemas (shared)
    'ActionType',
    'AgentDecision',
    'ToolValidator',
    'tool_validator',
    'PARAMETER_SCHEMAS',
]

__version__ = '2.0.0'

# ============================================================
# MODULE INITIALIZATION
# ============================================================

import logging
logger = logging.getLogger(__name__)
