# backend/app/orchestrator/tools/registry.py
"""
Centralized Tool Registry - Single Source of Truth for All Tools

This registry serves as the ONLY place where tools are defined.
Both WorkflowBuilderGraph and AIAssistantGraph use this registry.

Adding a new tool:
1. Create tool class in data_tools.py or analysis_tools.py
2. (Optional) Create parameter schema in llm/tool_schemas.py
3. Add one entry to TOOL_DEFINITIONS below
4. Done! Tool is now available in both conditions.
"""
from typing import Dict, Any, Type, Optional
from enum import Enum
import logging

from .data_tools import (
    BaseTool,
    FilterReviewsTool,
    SortReviewsTool,
    LoadReviewsTool,
    DataCleanerTool,
    
    CombineDataTool
)
from .analysis_tools import (
    ReviewSentimentAnalysisTool,
    GenerateInsightsTool,

    ShowResultsTool
)

logger = logging.getLogger(__name__)

class ToolDefinition:
    """
    Complete definition of a tool with all its metadata
    
    This contains everything needed to use the tool in both conditions
    """
    
    def __init__(
        self,
        tool_class: Type[BaseTool],
        workflow_id: str,
        ai_id: str,
        display_name: str,
        description: str,
        category: str,
        requires_data: bool = False,
        parameter_schema_name: Optional[str] = None
    ):
        """
        Define a tool with all its metadata
        
        Args:
            tool_class: The tool class (e.g., GatherDataTool)
            workflow_id: ID used in Workflow Builder frontend (e.g., 'gather-data')
            ai_id: ID used by AI Assistant (e.g., 'gather_data')
            display_name: Human-readable name (e.g., 'Gather Data')
            description: What the tool does
            category: Tool category ('data' or 'analysis')
            requires_data: Whether tool needs existing data to run
            parameter_schema_name: Name of Pydantic schema in tool_schemas.py (e.g., 'GatherDataParams')
        """
        self.tool_class = tool_class
        self.workflow_id = workflow_id
        self.ai_id = ai_id
        self.display_name = display_name
        self.description = description
        self.category = category
        self.requires_data = requires_data
        self.parameter_schema_name = parameter_schema_name
        
        # Create single instance (singleton per tool type)
        self._instance = None
    
    @property
    def instance(self) -> BaseTool:
        """Get singleton instance of the tool"""
        if self._instance is None:
            self._instance = self.tool_class()
        return self._instance
    
    def to_dict(self) -> Dict[str, Any]:
        """Export tool metadata as dict"""
        return {
            'workflow_id': self.workflow_id,
            'ai_id': self.ai_id,
            'display_name': self.display_name,
            'description': self.description,
            'category': self.category,
            'requires_data': self.requires_data,
            'has_parameters': self.parameter_schema_name is not None
        }


# ============================================================
# TOOL DEFINITIONS - SINGLE SOURCE OF TRUTH
# ============================================================
# Add new tools here! This is the ONLY place you need to edit.

TOOL_DEFINITIONS = [
    # DATA TOOLS
    ToolDefinition(
        tool_class=LoadReviewsTool,
        workflow_id='load-reviews',  # Used in Workflow Builder UI
        ai_id='load_reviews',  # Used by AI Assistant
        display_name='Load Product Reviews',
        description='Load product reviews from database with filtering options (category, rating, verified purchases)',
        category='data',
        requires_data=False,  # Can be used without prior data
        parameter_schema_name='LoadReviewsParams'
    ),
    
    ToolDefinition(
        tool_class=FilterReviewsTool,
        workflow_id='filter-reviews',
        ai_id='filter_reviews',
        display_name='Filter Reviews',
        description='Filter reviews by rating, helpfulness, verified status, or text content',
        category='data',
        requires_data=True,
        parameter_schema_name='FilterReviewsParams'
    ),

    ToolDefinition(
        tool_class=SortReviewsTool,
        workflow_id='sort-reviews',
        ai_id='sort_reviews',
        display_name='Sort Reviews',
        description='Sort reviews by rating, helpfulness, engagement, or other fields',
        category='data',
        requires_data=True,
        parameter_schema_name='SortReviewsParams'
    ),

    
    ToolDefinition(
        tool_class=DataCleanerTool,
        workflow_id='clean-data',
        ai_id='clean_data',
        display_name='AI Data Cleaner',
        description='Use AI to automatically detect and remove low-quality, spam, or malformed reviews while ensuring data integrity.',
        category='data',
        requires_data=True,
        parameter_schema_name=None
    ),
    
    
    ToolDefinition(
        tool_class=CombineDataTool,
        workflow_id='combine-data',
        ai_id='combine_data',
        display_name='Combine Data',
        description='Combine or merge multiple datasets.',
        category='data',
        requires_data=True,
        parameter_schema_name=None
    ),

    # ANALYSIS TOOLS
    ToolDefinition(
        tool_class=ReviewSentimentAnalysisTool,
        workflow_id='review-sentiment-analysis',  # Used in Workflow Builder UI
        ai_id='review_sentiment_analysis',  # Used by AI Assistant
        display_name='Analyze Review Sentiment',
        description='Analyze sentiment of product reviews (positive/neutral/negative) based on ratings and text keywords',
        category='analysis',
        requires_data=True,  # Needs reviews from load_reviews
        parameter_schema_name='ReviewSentimentAnalysisParams'
    ),

    ToolDefinition(
        tool_class=GenerateInsightsTool,
        workflow_id='generate-insights',
        ai_id='generate_insights',
        display_name='Generate Insights',
        description='Generate actionable insights and recommendations from analyzed data.',
        category='analysis',
        requires_data=True,
        parameter_schema_name=None
    ),
    
    ToolDefinition(
        tool_class=ShowResultsTool,
        workflow_id='show-results',
        ai_id='show_results',
        display_name='Show Results',
        description='Format and display final results. Use when ready to output.',
        category='analysis',
        requires_data=True,
        parameter_schema_name=None
    ),
]


# ============================================================
# TOOL REGISTRY CLASS
# ============================================================

class ToolRegistry:
    """
    Central registry for all tools
    
    Provides unified access to tools for both Workflow Builder and AI Assistant
    """
    
    def __init__(self):
        # Build lookup dictionaries from definitions
        self._by_workflow_id: Dict[str, ToolDefinition] = {}
        self._by_ai_id: Dict[str, ToolDefinition] = {}
        self._all_definitions = TOOL_DEFINITIONS
        
        # Index all tools
        for tool_def in TOOL_DEFINITIONS:
            self._by_workflow_id[tool_def.workflow_id] = tool_def
            self._by_ai_id[tool_def.ai_id] = tool_def
        
        logger.info(f"✅ Tool Registry initialized with {len(TOOL_DEFINITIONS)} tools")
    
    # ==================== WORKFLOW BUILDER ACCESS ====================
    
    def get_workflow_tool(self, workflow_id: str) -> Optional[BaseTool]:
        """
        Get tool by Workflow Builder ID (e.g., 'gather-data')
        
        Used by: WorkflowBuilderGraph
        """
        tool_def = self._by_workflow_id.get(workflow_id)
        if tool_def:
            return tool_def.instance
        return None
    
    def get_workflow_registry(self) -> Dict[str, BaseTool]:
        """
        Get complete workflow tool registry
        
        Returns: {'gather-data': GatherDataTool(), ...}
        Used by: WorkflowBuilderGraph.TOOL_REGISTRY
        """
        return {
            tool_def.workflow_id: tool_def.instance
            for tool_def in self._all_definitions
        }
    
    # ==================== AI ASSISTANT ACCESS ====================
    
    def get_ai_tool(self, ai_id: str) -> Optional[BaseTool]:
        """
        Get tool by AI Assistant ID (e.g., 'gather_data')
        
        Used by: AIAssistantGraph
        """
        tool_def = self._by_ai_id.get(ai_id)
        if tool_def:
            return tool_def.instance
        return None
    
    def get_ai_registry(self) -> Dict[str, BaseTool]:
        """
        Get complete AI tool registry
        
        Returns: {'gather_data': GatherDataTool(), ...}
        Used by: AIAssistantGraph.AVAILABLE_TOOLS
        """
        return {
            tool_def.ai_id: tool_def.instance
            for tool_def in self._all_definitions
        }
    
    # ==================== METADATA & VALIDATION ====================
    
    def get_tool_definition(
        self,
        workflow_id: Optional[str] = None,
        ai_id: Optional[str] = None
    ) -> Optional[ToolDefinition]:
        """Get complete tool definition by either ID"""
        if workflow_id:
            return self._by_workflow_id.get(workflow_id)
        if ai_id:
            return self._by_ai_id.get(ai_id)
        return None
    
    def get_all_definitions(self) -> list[ToolDefinition]:
        """Get all tool definitions"""
        return self._all_definitions.copy()
    
    def get_available_tools(self, has_data: bool = False) -> list[ToolDefinition]:
        """
        Get tools available based on current state
        
        Args:
            has_data: Whether data exists in working_data
            
        Returns:
            List of available tool definitions
        """
        if has_data:
            # All tools available
            return self._all_definitions.copy()
        else:
            # Only tools that don't require data
            return [
                tool_def for tool_def in self._all_definitions
                if not tool_def.requires_data
            ]
    
    def get_tools_by_category(self, category: str) -> list[ToolDefinition]:
        """Get all tools in a category ('data' or 'analysis')"""
        return [
            tool_def for tool_def in self._all_definitions
            if tool_def.category == category
        ]
    
    def can_execute_tool(
        self,
        tool_id: str,
        state: Dict[str, Any],
        id_type: str = 'ai'
    ) -> tuple[bool, Optional[str]]:
        """
        Check if tool can be executed in current state
        
        Args:
            tool_id: Tool identifier
            state: Current workflow state
            id_type: 'ai' or 'workflow'
            
        Returns:
            (can_execute, reason_if_not)
        """
        # Get tool definition
        if id_type == 'ai':
            tool_def = self._by_ai_id.get(tool_id)
        else:
            tool_def = self._by_workflow_id.get(tool_id)
        
        if not tool_def:
            return False, f"Unknown tool: {tool_id}"
        
        # Check if tool requires data
        if tool_def.requires_data:
            working_data = state.get('working_data', {})
            records = working_data.get('records', [])
            
            if not records:
                return False, f"{tool_def.display_name} requires existing data"
        
        return True, None
    
    # ==================== UTILITY ====================
    
    def list_all_tools(self) -> Dict[str, Dict[str, Any]]:
        """Export all tools as dict for API/frontend"""
        return {
            tool_def.workflow_id: tool_def.to_dict()
            for tool_def in self._all_definitions
        }
    
    def get_tool_count(self) -> int:
        """Get total number of registered tools"""
        return len(self._all_definitions)
    
    def validate_workflow_definition(self, workflow: Dict[str, Any]) -> tuple[bool, list[str]]:
        """
        Validate that all tools in workflow exist
        
        Args:
            workflow: Workflow definition with nodes
            
        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        nodes = workflow.get('nodes', [])
        
        for node in nodes:
            template_id = node.get('data', {}).get('template_id')
            if template_id and template_id not in self._by_workflow_id:
                errors.append(f"Unknown tool in node {node.get('id')}: {template_id}")
        
        return len(errors) == 0, errors


# ============================================================
# GLOBAL REGISTRY INSTANCE
# ============================================================

# Single global instance - import this everywhere
tool_registry = ToolRegistry()


# ============================================================
# BACKWARDS COMPATIBILITY (Optional)
# ============================================================
# These can be removed once all code uses tool_registry directly

def get_workflow_tools() -> Dict[str, BaseTool]:
    """Get workflow tool registry (backwards compatible)"""
    return tool_registry.get_workflow_registry()


def get_ai_tools() -> Dict[str, BaseTool]:
    """Get AI tool registry (backwards compatible)"""
    return tool_registry.get_ai_registry()