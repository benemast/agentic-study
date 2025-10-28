# backend/app/configs/langsmith_config.py
"""
LangSmith configuration for LangGraph debugging and tracing

This module initializes LangSmith tracing when enabled via environment variables.
All LangGraph executions will be automatically traced to your LangSmith project.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


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
        
        logger.info("=" * 60)
        logger.info("🔍 LangSmith Tracing Enabled")
        logger.info(f"   Project: {settings.langsmith_project}")
        logger.info(f"   Endpoint: {settings.langsmith_endpoint}")
        logger.info("   All LangGraph executions will be traced")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize LangSmith: {e}")
        logger.warning("Continuing without LangSmith tracing")
        return False


def get_langsmith_url(run_id: Optional[str] = None) -> Optional[str]:
    """
    Generate LangSmith URL for a specific run
    
    Args:
        run_id: The LangSmith run ID
        
    Returns:
        str: URL to view the trace, or None if LangSmith is not configured
    """
    project = os.environ.get("LANGCHAIN_PROJECT")
    
    if not project or not run_id:
        return None
    
    return f"https://smith.langchain.com/o/your-org/projects/p/{project}/r/{run_id}"


# Optional: Context manager for temporary tracing configuration
class LangSmithContext:
    """Context manager for temporarily modifying LangSmith settings"""
    
    def __init__(self, project: Optional[str] = None, tags: Optional[list] = None):
        self.project = project
        self.tags = tags or []
        self.original_project = None
        
    def __enter__(self):
        if self.project:
            self.original_project = os.environ.get("LANGCHAIN_PROJECT")
            os.environ["LANGCHAIN_PROJECT"] = self.project
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.original_project:
            os.environ["LANGCHAIN_PROJECT"] = self.original_project


# Export main functions
__all__ = [
    'init_langsmith',
    'get_langsmith_url',
    'LangSmithContext',
]