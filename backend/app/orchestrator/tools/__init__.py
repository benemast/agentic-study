# backend/app/orchestrator/tools/__init__.py
"""
Shared tools for workflow execution

CENTRALIZED TOOL REGISTRY:
All tools are now defined in registry.py - import from there!

To add a new tool:
1. Create tool class in data_tools.py or analysis_tools.py
2. Add one entry to TOOL_DEFINITIONS in registry.py
3. Done! Available in both Workflow Builder and AI Assistant
"""

# Export registry - this is the main import for other modules
from .registry import (
    tool_registry,
    ToolRegistry,
    ToolDefinition,
    TOOL_DEFINITIONS
)

# Export individual tool classes if needed for testing/extending
from .data_tools import (
    BaseTool,
    LoadReviewsTool,
    FilterReviewsTool,
    SortReviewsTool,
    DataCleanerTool
)

from .analysis_tools import (
    ReviewSentimentAnalysisTool,
    GenerateInsightsTool,
    ShowResultsTool
)

__all__ = [
    'tool_registry',
    'ToolRegistry',
    'ToolDefinition',
    'TOOL_DEFINITIONS',
    
    # Individual tool classes (for testing/advanced use)
    'BaseTool',

    'LoadReviewsTool',
    'FilterReviewsTool',
    'SortReviewsTool',
    'DataCleanerTool',

    'ReviewSentimentAnalysisTool',
    'GenerateInsightsTool',
    'ShowResultsTool',
]

__version__ = '1.0.2' 