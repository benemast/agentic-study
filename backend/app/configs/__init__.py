# backend/app/orchestrator/llm/__init__.py
"""
LLM Integration Module for AI Assistant

Provides intelligent decision making for autonomous agent execution:
- Robust LLM client with retry logic
- Tool schema validation
- Context-aware decision making
- Confidence tracking
"""

from .config import (
    settings,
    Settings
)

from .langsmith_config import (
    init_langsmith,
    get_langsmith_url,
    LangSmithContext,
    create_run_config,
    scrub_pii_from_state,
    format_input_for_langsmith,
    format_output_for_langsmith,
    should_trace_execution,  
)
from .sentry_config import (
    before_breadcrumb,
    before_send, 
    sentry_context_middleware,
    sentry_exception_handler, 
    sentry_http_exception_handler, 
    init_sentry,
)

from .logging_config import (
    setup_logging,
    setup_slow_query_logging,
    rotate_logs,
    get_log_stats,
    clean_old_logs,
    LogContext,
)

__all__ = [
    'settings',

    # Client
    'init_langsmith',
    'get_langsmith_url',
    'LangSmithContext',
    'create_run_config',
    'scrub_pii_from_state',
    'format_input_for_langsmith',
    'format_output_for_langsmith',
    'should_trace_execution',
    
    # Schemas
    'before_breadcrumb',
    'before_send',
    'sentry_context_middleware',
    'sentry_exception_handler',
    'sentry_http_exception_handler',
    'init_sentry',
    
    # Decision Maker
    'setup_logging',
    'setup_slow_query_logging',
    'rotate_logs',
    'get_log_stats',
    'clean_old_logs',
    'LogContext',
]

__version__ = '1.0.0'