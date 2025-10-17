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
    GatherDataTool,
    FilterDataTool,
    CleanDataTool,
    SortDataTool,
    CombineDataTool
)

from .analysis_tools import (
    SentimentAnalysisTool,
    GenerateInsightsTool,
    ShowResultsTool
)

__all__ = [
    # ✅ PRIMARY EXPORTS - Use these!
    'tool_registry',        # Global registry instance
    'ToolRegistry',         # Registry class
    'ToolDefinition',       # Tool definition class
    'TOOL_DEFINITIONS',     # List of all tool definitions
    
    # Individual tool classes (for testing/advanced use)
    'BaseTool',
    'GatherDataTool',
    'FilterDataTool',
    'CleanDataTool',
    'SortDataTool',
    'CombineDataTool',
    'SentimentAnalysisTool',
    'GenerateInsightsTool',
    'ShowResultsTool',
]

__version__ = '2.0.0'  # Incremented for tool registry introduction