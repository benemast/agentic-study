# backend/app/configs/langsmith_config.py
"""
LangSmith configuration for LangGraph debugging and tracing

This module initializes LangSmith tracing when enabled via environment variables.
All LangGraph executions will be automatically traced to your LangSmith project.

Features:
- GDPR-compliant PII scrubbing
- Sampling for cost control
- Hierarchical trace structure
- Callback integration (LangSmith + streaming)
- Trace URL generation
"""
import os
import logging
import hashlib
import random
import re
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ============================================================
# PII SCRUBBING (GDPR Compliance)
# ============================================================

def scrub_pii_from_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove PII from state before sending to LangSmith
    Critical for GDPR compliance in user study
    
    Args:
        state: State dictionary potentially containing PII
        
    Returns:
        Scrubbed state safe for external tracing
    """
    scrubbed = state.copy()
    
    # Fields that contain PII
    pii_fields = [
        'session_id',
        'customer_id', 
        'email',
        'ip_address',
        'user_id',
        'participant_id',
        'phone',
        'address',
        'ssn',
        'credit_card'
    ]
    
    for field in pii_fields:
        if field in scrubbed:
            scrubbed[field] = f"<{field}_redacted>"
    
    # Hash session_id for correlation without exposing actual value
    if 'session_id' in state:
        scrubbed['session_hash'] = hashlib.sha256(
            str(state['session_id']).encode()
        ).hexdigest()[:8]
    
    # Scrub nested data structures
    if 'metadata' in scrubbed and isinstance(scrubbed['metadata'], dict):
        scrubbed['metadata'] = scrub_pii_from_state(scrubbed['metadata'])
    
    if 'input_data' in scrubbed and isinstance(scrubbed['input_data'], dict):
        scrubbed['input_data'] = scrub_pii_from_state(scrubbed['input_data'])
    
    return scrubbed


def scrub_pii_from_text(text: str) -> str:
    """
    Scrub PII patterns from text content
    
    NEW: Added from new version for text scrubbing
    
    Args:
        text: Text potentially containing PII
        
    Returns:
        Scrubbed text
    """
    if not text:
        return text
    
    # Email patterns
    text = re.sub(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        '[EMAIL]',
        text
    )
    
    # Phone patterns (US format)
    text = re.sub(
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        '[PHONE]',
        text
    )
    
    # SSN patterns
    text = re.sub(
        r'\b\d{3}-\d{2}-\d{4}\b',
        '[SSN]',
        text
    )
    
    # Credit card patterns (simple)
    text = re.sub(
        r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        '[CARD]',
        text
    )
    
    return text


# ============================================================
# TRACE NAMING (NEW - from new version)
# ============================================================

def generate_trace_name(
    condition: str,
    execution_id: int,
    step_number: Optional[int] = None,
    tool_name: Optional[str] = None,
    operation: Optional[str] = None
) -> str:
    """
    Generate hierarchical trace name
    
    NEW: More detailed naming structure for better LangSmith organization
    
    Args:
        condition: 'workflow_builder' or 'ai_assistant'
        execution_id: Workflow execution ID
        step_number: Optional step number
        tool_name: Optional tool name
        operation: Optional operation type (e.g., 'decision', 'tool_execution')
        
    Returns:
        Formatted trace name
        
    Examples:
        'ai_assistant_456'
        'ai_assistant_456_step-3'
        'ai_assistant_456_step-3_sentiment_analysis'
        'workflow_builder_789_step-1_decision'
    """
    parts = [condition, str(execution_id)]
    
    if step_number is not None:
        parts.append(f"step-{step_number}")
    
    if operation:
        parts.append(operation)
    
    if tool_name:
        parts.append(tool_name)
    
    return "_".join(parts)


# ============================================================
# METADATA BUILDING (Enhanced)
# ============================================================

def build_trace_metadata(
    execution_id: int,
    session_id: str,
    condition: str,
    task_data: Optional[Dict[str, Any]] = {},
    step_number: Optional[int] = None,
    tool_name: Optional[str] = None,
    additional_metadata: Optional[Dict[str, Any]] = {}
) -> Dict[str, Any]:
    """
    Build rich metadata for trace with PII scrubbing
    
    Enhanced with more fields and better organization
    
    Args:
        execution_id: Execution ID
        session_id: Session ID (will be hashed)
        condition: Study condition
        task_data: Task information
        step_number: Optional step number
        tool_name: Optional tool name
        additional_metadata: Additional metadata to include
        
    Returns:
        Metadata dict (PII-scrubbed)
    """
    # Start with base data
    base_data = {
        "execution_id": execution_id,
        "session_id": session_id,
        "condition": condition,
    }
    
    # Scrub PII from base
    metadata = scrub_pii_from_state(base_data)
    
    # Add timing
    metadata['started_at'] = datetime.now(timezone.utc).isoformat()
    
    # Add task-specific metadata
    if task_data:
        if condition == 'workflow_builder':
            workflow = task_data.get('workflow', {})
            nodes = workflow.get('nodes', [])
            metadata["node_count"] = len(nodes)
            metadata["edge_count"] = len(workflow.get('edges', []))
            metadata["task_type"] = "workflow_builder"
        elif condition == 'ai_assistant':
            metadata["task_type"] = "ai_assistant"
            
            # Add task description (truncated and scrubbed)
            task_desc = task_data.get('task_description', '')
            if task_desc:
                truncated = str(task_desc)[:200]
                metadata["task_description_preview"] = scrub_pii_from_text(truncated)
            
            # Add task category if available
            if 'category' in task_data:
                metadata['task_category'] = task_data['category']
    
    # Add step info
    if step_number is not None:
        metadata['step_number'] = step_number
    
    if tool_name:
        metadata['tool_name'] = tool_name
    
    # Merge additional metadata (scrubbed)
    if additional_metadata:
        metadata.update(scrub_pii_from_state(additional_metadata))
    
    # Add tracing flag
    metadata['traced'] = True
    
    return metadata


# ============================================================
# STATE FORMATTING
# ============================================================

def format_input_for_langsmith(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format state for clean LangSmith input display
    Shows only essential execution context
    
    Args:
        state: Full execution state
        
    Returns:
        Minimal input representation
    """
    return {
        'execution_id': state.get('execution_id'),
        'condition': state.get('condition'),
        'step': state.get('step_number', 0),
        'task_type': state.get('metadata', {}).get('task_type', 'unknown'),
        'session_hash': state.get('session_hash', 'unknown')
    }


def format_output_for_langsmith(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format state for clean LangSmith output display
    Shows execution results and metrics
    
    Args:
        state: Final execution state
        
    Returns:
        Summary output representation
    """
    working_data = state.get('working_data', {})
    
    return {
        'status': state.get('status'),
        'steps_completed': state.get('step_number', 0),
        'execution_time_ms': state.get('total_time_ms', 0),
        'errors_count': len(state.get('errors', [])),
        'warnings_count': len(state.get('warnings', [])),
        'data_produced': bool(working_data.get('records')),
        'records_count': len(working_data.get('records', [])) if isinstance(working_data.get('records'), list) else 0,
        'checkpoints_created': state.get('checkpoints_created', 0)
    }


# ============================================================
# SAMPLING LOGIC
# ============================================================

def should_trace_execution(sample_rate: float = 1.0) -> bool:
    """
    Probabilistic sampling for cost control in production
    
    Args:
        sample_rate: Fraction of traces to send (0.0-1.0)
        
    Returns:
        True if this execution should be traced
        
    Example:
        - sample_rate=1.0 → trace everything (development)
        - sample_rate=0.1 → trace 10% (production cost control)
    """
    if sample_rate >= 1.0:
        return True
    if sample_rate <= 0.0:
        return False
    
    return random.random() < sample_rate


# ============================================================
# RUN CONFIGURATION
# ============================================================

def create_run_config(
    execution_id: int,
    session_id: str,
    condition: str,
    task_data: Optional[Dict[str, Any]] = {},
    metadata: Optional[Dict[str, Any]] = {},
    step_number: Optional[int] = None,
    tool_name: Optional[str] = None,
    streaming_callback = None,
    include_tracer: bool = True
) -> Dict[str, Any]:
    """
    Create standardized and sanitized LangSmith run configuration
    
    This generates clean, PII-free metadata for LangSmith traces with
    consistent naming and tagging for research analysis.
    
    Args:
        execution_id: Execution record ID
        session_id: User session ID (will be hashed)
        condition: 'workflow_builder' or 'ai_assistant'
        task_data: Optional task data for additional context
        metadata: Optional additional metadata
        step_number: Optional step number for nested traces
        tool_name: Optional tool name for nested traces
        streaming_callback: Optional WebSocket streaming callback
        include_tracer: If True, include LangSmith tracer callback
        
    Returns:
        Config dict for graph.ainvoke(state, config=...)
        
    Example:
        # Basic usage (backward compatible)
        config = create_run_config(42, "abc123", "workflow_builder")
        
        # With streaming
        config = create_run_config(
            42, "abc123", "ai_assistant",
            streaming_callback=callback
        )
        
        # Nested trace for tool
        config = create_run_config(
            42, "abc123", "ai_assistant",
            step_number=3,
            tool_name="sentiment_analysis"
        )
        
        final_state = await graph.ainvoke(initial_state, config=config)
    """
     # Import here to avoid circular dependency
    from app.configs.config import settings

    # Generate hierarchical trace name
    trace_name = generate_trace_name(
        condition=condition,
        execution_id=execution_id,
        step_number=step_number,
        tool_name=tool_name
    )

    # Build rich metadata
    trace_metadata = build_trace_metadata(
        execution_id=execution_id,
        session_id=session_id,
        condition=condition,
        task_data=task_data,
        step_number=step_number,
        tool_name=tool_name,
        additional_metadata=metadata
    )
    
    # Build config
    config = {
        "run_name": trace_name,
        "tags": [
            condition,
            f"exec_{execution_id}",
            trace_metadata.get("task_type", "unknown"),
            getattr(settings, 'sentry_environment', 'development')
        ],
        "metadata": trace_metadata,
        "callbacks": []
    }
    
    # Add tool tag if present
    if tool_name:
        config['tags'].append(f"tool-{tool_name}")
    
    # Add LangSmith tracer callback if requested
    if include_tracer and settings.langsmith_enabled:
        try:
            from langchain_core.tracers import LangChainTracer
            from langsmith import Client
            
            tracer = LangChainTracer(
                project_name=settings.langsmith_project,
                client=Client(
                    api_key=settings.langsmith_api_key,
                    api_url=settings.langsmith_endpoint
                )
            )
            
            config["callbacks"].append(tracer)
            logger.debug(f"LangSmith tracer added: {trace_name}")
            
        except Exception as e:
            logger.warning(f"Failed to create LangSmith tracer: {e}")
            # Continue without tracer - don't fail execution
    
    # Add streaming callback if provided
    if streaming_callback is not None:
        config["callbacks"].append(streaming_callback)
        logger.debug(f"Streaming callback added: {trace_name}")
    
    return config


# ============================================================
# INITIALIZATION
# ============================================================

def init_langsmith(settings) -> bool:
    """
    Initialize LangSmith tracing for LangGraph
    
    Args:
        settings: Application settings object
        
    Returns:
        bool: True if LangSmith was successfully initialized
        
    Environment Variables Set:
        - LANGSMITH_TRACING: Enables tracing
        - LANGSMITH_ENDPOINT: LangSmith API endpoint
        - LANGSMITH_API_KEY: Your API key
        - LANGSMITH_PROJECT: Project name for organizing traces
    """
    
    if not settings.langsmith_enabled:
        logger.info("LangSmith tracing is disabled")
        return False
    
    try:
        # Set environment variables for LangChain/LangGraph
        os.environ["LANGSMITH_TRACING"] = str(settings.langsmith_tracing).lower()
        os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
        os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
        os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
        
        # Get environment and sample rate
        env = getattr(settings, 'sentry_environment', 'development')
        sample_rate = getattr(settings, 'langsmith_sample_rate', 1.0)
        
        logger.info("=" * 60)
        logger.info("LangSmith Tracing Enabled")
        logger.info(f"   Project: {settings.langsmith_project}")
        logger.info(f"   Endpoint: {settings.langsmith_endpoint}")
        logger.info(f"   Environment: {env}")
        logger.info(f"   Sample Rate: {sample_rate * 100:.0f}%")
        logger.info(f"   PII Scrubbing: Enabled")
        logger.info(f"   Callback Support: Enabled")
        logger.info(f"   All LangGraph executions will be traced")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize LangSmith: {e}")
        logger.warning("Continuing without LangSmith tracing")
        return False


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def get_langsmith_url(run_id: Optional[str] = None) -> Optional[str]:
    """
    Generate LangSmith URL for a specific run
    
    Args:
        run_id: The LangSmith run ID
        
    Returns:
        str: URL to view the trace, or None if LangSmith is not configured
    """
    from .config import settings

    project = settings.langsmith_project
    
    if not project or not run_id:
        return None
    
    # Note: Update 'your-org' with your actual LangSmith organization
    org = settings.langsmith_org_id
    
    return f"https://smith.langchain.com/o/{org}/projects/p/{project}/r/{run_id}"


def check_langsmith_status() -> Dict[str, Any]:
    """
    Check LangSmith configuration status
    
    NEW: Added from new version for diagnostics
    
    Returns:
        Status dict with configuration info
    """
    from app.configs.config import settings
    
    return {
        'enabled': settings.langsmith_enabled,
        'project': settings.langsmith_project,
        'endpoint': settings.langsmith_endpoint,
        'environment': getattr(settings, 'sentry_environment', 'development'),
        'sample_rate': getattr(settings, 'langsmith_sample_rate', 1.0),
        'scrub_pii': True,  # Always enabled
        'callback_support': True,  # Now available
        'api_configured': bool(settings.langsmith_api_key)
    }


# ============================================================
# CONTEXT MANAGER
# ============================================================

class LangSmithContext:
    """
    Context manager for temporarily modifying LangSmith settings
    
    Useful for:
    - Testing with different projects
    - Temporary tag additions
    - Environment-specific tracing
    
    Example:
        with LangSmithContext(project="test-project", tags=["debug"]):
            result = await graph.ainvoke(state)
    """
    
    def __init__(
        self, 
        project: Optional[str] = None, 
        tags: Optional[list] = None,
        enabled: Optional[bool] = None
    ):
        self.project = project
        self.tags = tags or []
        self.enabled = enabled
        
        # Store originals
        self.original_project = None
        self.original_tracing = None
        
    def __enter__(self):
        # Save current settings
        if self.project:
            self.original_project = os.environ.get("LANGSMITH_PROJECT")
            os.environ["LANGSMITH_PROJECT"] = self.project
        
        if self.enabled is not None:
            self.original_tracing = os.environ.get("LANGSMITH_TRACING")
            os.environ["LANGSMITH_TRACING"] = str(self.enabled).lower()
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore original settings
        if self.original_project is not None:
            os.environ["LANGSMITH_PROJECT"] = self.original_project
        
        if self.original_tracing is not None:
            os.environ["LANGSMITH_TRACING"] = self.original_tracing


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    # Initialization
    'init_langsmith',
    
    # Configuration
    'create_run_config',
    
    # PII & Formatting
    'scrub_pii_from_state',
    'scrub_pii_from_text',
    'format_input_for_langsmith',
    'format_output_for_langsmith',
    
    # Trace Naming
    'generate_trace_name',
    'build_trace_metadata',
    
    # Sampling
    'should_trace_execution',
    
    # Utilities
    'get_langsmith_url',
    'check_langsmith_status',
    'LangSmithContext',
]