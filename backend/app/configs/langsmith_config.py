# backend/app/configs/langsmith_config.py
"""
LangSmith configuration for LangGraph debugging and tracing

This module initializes LangSmith tracing when enabled via environment variables.
All LangGraph executions will be automatically traced to your LangSmith project.
"""
import os
import logging
import hashlib
import random
from typing import Optional, Dict, Any

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
        'participant_id'
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
    task_data: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None
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
        
    Returns:
        Config dict for graph.ainvoke(state, config=...)
        
    Example:
        config = create_run_config(42, "abc123", "workflow_builder")
        final_state = await graph.ainvoke(initial_state, config=config)
    """
    # Start with base data
    base_data = {
        "execution_id": execution_id,
        "session_id": session_id,
        "condition": condition,
    }
    
    # Scrub PII
    safe_metadata = scrub_pii_from_state(base_data)
    
    # Add task-specific metadata
    if task_data:
        if condition == 'workflow_builder':
            workflow = task_data.get('workflow', {})
            nodes = workflow.get('nodes', [])
            safe_metadata["node_count"] = len(nodes)
            safe_metadata["edge_count"] = len(workflow.get('edges', []))
            safe_metadata["task_type"] = "workflow_builder"
        elif condition == 'ai_assistant':
            safe_metadata["task_type"] = "ai_assistant"
            task_desc = task_data.get('task_description', '')
            # Truncate description to avoid huge metadata
            safe_metadata["task_description_preview"] = task_desc[:100] if task_desc else ""
    
    # Merge additional metadata (also scrubbed)
    if metadata:
        safe_metadata.update(scrub_pii_from_state(metadata))
    
    return {
        "run_name": f"{condition}_{execution_id}",
        "tags": [
            condition,
            f"exec_{execution_id}",
            safe_metadata.get("task_type", "unknown")
        ],
        "metadata": safe_metadata
    }


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
    project = os.environ.get("LANGSMITH_PROJECT") or os.environ.get("LANGCHAIN_PROJECT")
    
    if not project or not run_id:
        return None
    
    # Note: Update 'your-org' with your actual LangSmith organization
    return f"https://smith.langchain.com/o/your-org/projects/p/{project}/r/{run_id}"


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
    'format_input_for_langsmith',
    'format_output_for_langsmith',
    
    # Sampling
    'should_trace_execution',
    
    # Utilities
    'get_langsmith_url',
    'LangSmithContext',
]