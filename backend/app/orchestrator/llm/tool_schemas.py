# backend/app/orchestrator/llm/tool_schemas.py
"""
Tool schemas and validation for AI Assistant 
integrated with centralized tool registry
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum
import logging

from app.orchestrator.graphs.shared_state import DataSource

logger = logging.getLogger(__name__)

class ActionType(str, Enum):
    """Available action types"""
    LOAD = "load"
    SORT = "sort"
    FILTER = "filter"
    ANALYZE = "analyze"
    GATHER = "gather"
    CLEAN = "clean"
    COMBINE = "combine"
    GENERATE = "generate"
    OUTPUT = "output"
    FINISH = "finish"

# ============================================================
# PARAMETER SCHEMAS (Pydantic Models)
# ============================================================


class LoadReviewsParams(BaseModel):
    """
    Parameters for load_reviews tool
    
    Used to fetch product reviews with various filters
    """
    category: Literal['shoes', 'wireless'] = Field(
        ..., 
        description="Product category: 'shoes' or 'wireless'",
        pattern="^(shoes|wireless)$"
    )
    limit: Optional[int] = Field(
        None,
        ge=1,
        le=10000,
        description="Maximum number of reviews to load"
    )
    offset: int = Field(
        default=0,
        ge=0,
        description="Pagination offset"
    )
class LoadReviewsConfig(BaseModel):
    config: LoadReviewsParams

class FilterCondition(BaseModel):
    """
    Single filter condition
    
    Operators by field type:
    - String: contains, equals, not_equals, starts_with, ends_with
    - Numeric: ==, !=, >, <, >=, <=
    - Boolean: equals (value must be True/False)
    """
    field: str = Field(
        ...,
        description="Field name to filter on (e.g., 'star_rating', 'product_title', 'verified_purchase')"
    )
    operator: str = Field(
        ...,
        description="Comparison operator - must match field type (e.g., '>=' for numeric, 'contains' for string)"
    )
    value: Any = Field(
        ...,
        description="Value to compare against"
    )
    
    @field_validator('operator')
    @classmethod
    def validate_operator(cls, v: str) -> str:
        """Validate operator is supported"""
        valid_operators = {
            # String operators
            'contains', 'equals', 'not_equals', 'starts_with', 'ends_with',
            # Numeric operators
            '==', '!=', '>', '<', '>=', '<=',
            # Alternative numeric names
            'greater', 'less', 'greater_or_equal', 'less_or_equal'
        }
        
        if v not in valid_operators:
            raise ValueError(f"Invalid operator: {v}. Must be one of: {', '.join(sorted(valid_operators))}")
        
        return v


class FilterReviewsParams(BaseModel):
    """
    Parameters for filter_reviews tool
    
    Filters reviews dynamically on any field with type-appropriate operators.
    
    Available fields:
    - String: review_id, product_id, product_title, product_category, review_headline, review_body
    - Numeric: star_rating (1-5), helpful_votes, total_votes, customer_id
    - Boolean: verified_purchase
    """
    filters: List[FilterCondition] = Field(
        ...,
        description="List of filter conditions to apply (AND logic)",
        min_length=1
    )    
    
    @field_validator('filters')
    @classmethod
    def validate_filters_or_single(cls, v: List[FilterCondition], info) -> List[FilterCondition]:
        """Ensure either filters array or single filter fields are provided"""
        # If filters array is provided, use it
        if v:
            return v
        
        # Otherwise, check for single filter format (backward compatibility)
        field = info.data.get('field')
        operator = info.data.get('operator')
        value = info.data.get('value')
        
        if field and operator and value is not None:
            return [FilterCondition(field=field, operator=operator, value=value)]
        
        raise ValueError("Must provide either 'filters' array or 'field', 'operator', 'value'")


class SortReviewsParams(BaseModel):
    """Parameters for sort_reviews tool"""
    sort_by: str = Field(
        ...,
        description="Field: 'rating', 'helpfulness', 'engagement', etc."
    )
    descending: bool = Field(
        default=True,
        description="Sort direction: True for descending (high to low), False for ascending (low to high)"
    )
    
    @field_validator('sort_by')
    @classmethod
    def validate_sort_field(cls, v: str) -> str:
        valid = ['rating', 'helpfulness', 'helpful', 'engagement', 
                 'votes', 'star_rating', 'helpful_votes', 'total_votes']
        if v.lower() not in valid:
            raise ValueError(f"Invalid sort field: {v}")
        return v.lower()


class CleanDataParams(BaseModel):
    """
    Parameters for clean_data tool
    
    Configure data cleaning operations
    """
    remove_nulls: bool = Field(
        default=True,
        description="Remove records with null/empty values in key fields"
    )
    normalize_text: bool = Field(
        default=True,
        description="Standardize text formatting and remove special characters"
    )
    remove_duplicates: bool = Field(
        default=False,
        description="Remove duplicate reviews based on review ID"
    )


class ReviewSentimentAnalysisParams(BaseModel):
    """
    Parameters for review_sentiment_analysis tool
    
    Analyzes sentiment with optional theme extraction
    """
    # Theme extraction features (from frontend schema)
    extract_themes: bool = Field(
        default=True,
        description="Extract recurring topics/themes from reviews"
    )
    theme_separation: Literal['combined', 'by_sentiment'] = Field(
        default='combined',
        description="How to organize themes: 'combined' (all together) or 'by_sentiment' (positive/negative separate)"
    )
    max_themes_per_category: int = Field(
        default=1,
        ge=1,
        le=10,
        description="Maximum number of themes to extract per category"
    )
    include_percentages: bool = Field(
        default=False,
        description="Calculate percentage of reviews mentioning each theme"
    )
    
    # Additional features (not in frontend but used internally)
    batch_size: int = Field(
        default=20,
        ge=1,
        le=25,
        description="Number of reviews to process per batch"
    )


class GenerateInsightsParams(BaseModel):
    """
    Parameters for generate_insights tool
    
    Generate actionable business recommendations with configurable focus
    """
    focus_area: List[Literal[
        'competitive_positioning',
        'customer_experience',
        'marketing_messages',
        'product_improvements'
    ]] = Field(
        ...,  # Required in frontend schema
        description="Areas to focus recommendations on (can select multiple)"
    )
    max_recommendations: int = Field(
        ...,  # Required in frontend schema
        ge=1,
        le=10,
        description="Number of recommendations to generate per category"
    )
    
    @field_validator('focus_area')
    @classmethod
    def validate_focus_area(cls, v: List[str]) -> List[str]:
        """Validate focus area values"""
        valid_areas = {
            'competitive_positioning',
            'customer_experience',
            'marketing_messages',
            'product_improvements'
        }
        
        if v:
            for area in v:
                if area not in valid_areas:
                    raise ValueError(f"Invalid focus area: {area}. Must be one of: {', '.join(valid_areas)}")
        
        return v


class ShowResultsParams(BaseModel):
    """
    Parameters for show_results tool
    
    Configure which sections and metrics to include in final output
    """
    include_sections: List[Literal[
        'executive_summary',
        'themes',
        'recommendations',
        'statistics',
        'data_preview'
    ]] = Field(
        default=['data_preview'],
        description="Sections to include in the output report. Options: executive_summary, themes, recommendations, statistics, data_preview"
    )
    statistics_metrics: Optional[List[Literal[
        'sentiment_distribution',
        'review_summary',
        'rating_distribution',
        'verified_rate',
        'theme_coverage',
        'sentiment_consistency'
    ]]] = Field(
        default=None,
        description="Specific statistics to display (only if 'statistics' section is included)"
    )
    show_visualizations: Optional[bool] = Field(
        default=False,
        description="Include visualization-ready data structures (only if 'statistics' section is included)"
    )
    max_data_items: Optional[int] = Field(
        default=50,
        ge=1,
        le=1000,
        description="Maximum number of items to show in data preview (only if 'data_preview' section is included)"
    )
    
    @field_validator('statistics_metrics')
    @classmethod
    def validate_metrics_with_statistics(cls, v: Optional[List[str]], info) -> Optional[List[str]]:
        """Only validate metrics if statistics section is included"""
        include_sections = info.data.get('include_sections', [])
        
        # If statistics_metrics provided but statistics section not included, warn
        if v and 'statistics' not in include_sections:
            logger.warning(
                "statistics_metrics provided but 'statistics' not in include_sections. "
                "Metrics will be ignored."
            )
        
        return v
    
    @field_validator('show_visualizations')
    @classmethod
    def validate_visualizations_with_statistics(cls, v: Optional[bool], info) -> Optional[bool]:
        """Only validate visualizations if statistics section is included"""
        include_sections = info.data.get('include_sections', [])
        
        # If show_visualizations enabled but statistics section not included, warn
        if v and 'statistics' not in include_sections:
            logger.warning(
                "show_visualizations enabled but 'statistics' not in include_sections. "
                "Visualizations will be ignored."
            )
        
        return v
    
    @field_validator('max_data_items')
    @classmethod
    def validate_max_items_with_preview(cls, v: Optional[int], info) -> Optional[int]:
        """Only validate max_data_items if data_preview section is included"""
        include_sections = info.data.get('include_sections', [])
        
        # If max_data_items provided but data_preview section not included, warn
        if v and 'data_preview' not in include_sections:
            logger.warning(
                "max_data_items provided but 'data_preview' not in include_sections. "
                "Max items limit will be ignored."
            )
        
        return v


class ToolCallInputData(BaseModel):
    # ==================== WORKING DATA ====================
    records: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Current working set of records (filtered/processed)"
    )
    total: int = Field(
        default=0,
        description="Number of records in current working set"
    )
    category: Literal['shoes', 'wireless'] = Field(
        ..., 
        description="Product category: 'shoes' or 'wireless'",
        pattern="^(shoes|wireless)$"
    )
    config: BaseModel
    product_titles: Dict[str, str] = Field(
        default_factory=dict,
        description="Mapping of product IDs to titles"
    )    
    # ==================== INTERNAL STATE ====================
    state: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional state information"
    )
    # ==================== ANALYSIS OUTPUTS ====================
    sentiment_statistics: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Sentiment analysis statistics"
    )
    theme_analysis: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Theme/topic analysis results"
    )
    insights: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Generated insights from analysis"
    )    
    # ==================== STATE STRUCTURES ====================
    record_store: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Complete record store with all data"
    )
    enrichment_registry: Dict[str, Any] = Field(
        default_factory=dict,
        description="Registry of data enrichments (columns added)"
    )
    results_registry: Dict[str, Any] = Field(
        default_factory=dict,
        description="Registry of tool execution results"
    )
    data_source: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Information about data source (SQL query, etc.)"
    )
    row_operation_history: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="History of row-level operations (filters, sorts, etc.)"
    )
    # ==================== BASE TRACKING ====================
    base_record_ids: List[str] = Field(
        default_factory=list,
        description="Original record IDs from initial load"
    )
    base_record_count: int = Field(
        default=0,
        description="Original number of records loaded"
    )
    base_columns: List[str] = Field(
        default_factory=list,
        description="Original column names from data source"
    )    
    # ==================== EXECUTION CONTEXT ====================
    session_id: str = Field(
        ...,
        description="Session identifier"
    )
    execution_id: int = Field(
        ...,
        description="Execution identifier"
    )
    
    class Config:
        # Allow extra fields for forward compatibility
        extra = 'allow'

class LoadReviewsInputData(ToolCallInputData):
    config: LoadReviewsParams

class FilterReviewsInputData(ToolCallInputData):
    config: FilterCondition

class SortReviewsInputData(ToolCallInputData):
    config: SortReviewsParams

class CleanReviewsInputData(ToolCallInputData):
    config: CleanDataParams

class ReviewSentimentAnalysisInputData(ToolCallInputData):
    config:  ReviewSentimentAnalysisParams

class GenerateInsightsInputData(ToolCallInputData):
    config: GenerateInsightsParams

class ShowResultsInputData(ToolCallInputData):
    config: ShowResultsParams

# ============================================================
# PARAMETER SCHEMA MAPPING
# ============================================================

PARAMETER_SCHEMAS = {
    'load_reviews': LoadReviewsParams,
    'filter_reviews': FilterReviewsParams,
    'sort_reviews': SortReviewsParams,
    'clean_data': CleanDataParams,
    'review_sentiment_analysis': ReviewSentimentAnalysisParams,
    'generate_insights': GenerateInsightsParams,
    'show_results': ShowResultsParams
}

# ============================================================
# AGENT DECISION MODEL
# ============================================================

class AgentDecision(BaseModel):
    """
    Validated agent decision structure
    
    This is what the LLM returns and what gets validated
    """
    action: ActionType = Field(..., description="High-level action to take")
    tool_name: Optional[str] = Field(None, description="Specific tool AI ID to use")
    reasoning: str = Field(..., description="Why this decision was made")
    tool_params: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the tool")
    confidence: float = Field(0.5, ge=0.0, le=1.0, description="Confidence score 0-1")
    alternatives_considered: List[str] = Field(default_factory=list, description="Other options considered")
    
    @model_validator(mode='after')
    def validate_tool_exists(self):
        """
        Ensure tool_name exists in registry and is valid for action
        
        ✅ FIXED: Pydantic V2 compatible using model_validator
        """
        from ..tools.registry import tool_registry
        
        # If action is 'finish', tool_name should be None
        if self.action == ActionType.FINISH:
            if self.tool_name is not None:
                logger.warning(f"Action is 'finish' but tool_name is set: {self.tool_name}")
                self.tool_name = None
            return self
        
        # For other actions, validate tool exists
        if self.tool_name is not None:
            tool_def = tool_registry.get_tool_definition(ai_id=self.tool_name)
            if not tool_def:
                raise ValueError(f"Unknown tool in registry: {self.tool_name}")
        
        return self
    
    @field_validator('confidence')
    @classmethod
    def validate_confidence_range(cls, v):
        """Ensure confidence is in valid range"""
        if not 0.0 <= v <= 1.0:
            logger.warning(f"Invalid confidence: {v}, clamping to [0, 1]")
            return max(0.0, min(1.0, v))
        return v


# ============================================================
# TOOL VALIDATOR (Integrated with Registry)
# ============================================================

class ToolValidator:
    """
    Validates tool calls and parameters
    
    Now uses centralized tool registry for all lookups!
    """
    
    def __init__(self):
        from ..tools.registry import tool_registry 
        self.registry = tool_registry
    
    def validate_tool_params(
        self,
        tool_ai_id: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate tool parameters against schema
        
        Args:
            tool_ai_id: Tool AI ID (e.g., 'load_reviews')
            params: Parameters to validate
            
        Returns:
            Validated parameters dict
            
        Raises:
            ValueError: If validation fails
        """
        # Check tool exists
        tool_def = self.registry.get_tool_definition(ai_id=tool_ai_id)
        if not tool_def:
            raise ValueError(f"Unknown tool: {tool_ai_id}")
        
        # Get parameter schema
        param_model = PARAMETER_SCHEMAS.get(tool_ai_id)
        
        # If tool has no parameters, return empty dict
        if param_model is None:
            return {}
        
        # Validate using Pydantic model
        try:
            validated = param_model(**params)
            return validated.dict()
        except Exception as e:
            logger.error(f"Parameter validation failed for {tool_ai_id}: {e}")
            raise ValueError(f"Invalid parameters for {tool_ai_id}: {e}")
    
    def can_execute_tool(
        self,
        tool_ai_id: str,
        state: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        Check if tool can be executed given current state
        
        Args:
            tool_ai_id: Tool AI ID
            state: Current workflow state
            
        Returns:
            (can_execute, reason_if_not)
        """
        # Use registry's built-in validation
        return self.registry.can_execute_tool(
            tool_id=tool_ai_id,
            state=state,
            id_type='ai'
        )
    
    def get_tool_description(self, tool_ai_id: str) -> str:
        """
        Get human-readable tool description
        
        Args:
            tool_ai_id: Tool AI ID
            
        Returns:
            Tool description from registry
        """
        tool_def = self.registry.get_tool_definition(ai_id=tool_ai_id)
        if not tool_def:
            return "Unknown tool"
        return tool_def.description
    
    def get_available_tools(self, state: Dict[str, Any]) -> List[str]:
        """
        Get list of tools that can be executed in current state
        
        Args:
            state: Current workflow state
            
        Returns:
            List of available tool AI IDs
        """
        working_data = state.get('working_data', {})
        records = working_data.get('records', [])
        has_data = len(records) > 0
        
        # Get available tool definitions from registry
        available_defs = self.registry.get_available_tools(has_data=has_data)
        
        # Return AI IDs
        return [tool_def.ai_id for tool_def in available_defs]
    
    def format_tools_for_prompt(
        self, 
        state: Optional[Dict[str, Any]] = None,
        verbosity: str = "brief"
    ) -> str:
        """
        Format tool descriptions for LLM prompt with tiered verbosity
        
        Args:
            state: Optional state to filter by availability
            verbosity: Description detail level ("brief", "standard", "full")
                - "brief": ~20 tokens/tool, first sentence only
                - "standard": ~100 tokens/tool, core info + use cases  
                - "full": ~250 tokens/tool, complete metadata
            
        Returns:
            Formatted string of available tools
        """
        # Get available tools
        if state:
            working_data = state.get('working_data', {})
            records = working_data.get('records', [])
            has_data = len(records) > 0
            tool_defs = self.registry.get_available_tools(has_data=has_data)
        else:
            tool_defs = self.registry.get_all_definitions()
        
        # Format for prompt with tiered descriptions
        lines = []
        for i, tool_def in enumerate(tool_defs, 1):
            # Get description based on verbosity level
            if verbosity == "brief":
                desc = tool_def.get_brief_description()
            elif verbosity == "standard":
                desc = tool_def.get_standard_description()
            else:  # "full"
                desc = tool_def.get_full_description()
            
            lines.append(f"{i}. {tool_def.ai_id}: {desc}")
        
        return "\n".join(lines)
    
    def get_tool_metadata(self, tool_ai_id: str) -> Optional[Dict[str, Any]]:
        """
        Get complete metadata for a tool
        
        Args:
            tool_ai_id: Tool AI ID
            
        Returns:
            Tool metadata dict or None
        """
        tool_def = self.registry.get_tool_definition(ai_id=tool_ai_id)
        if not tool_def:
            return None
        
        return {
            'ai_id': tool_def.ai_id,
            'workflow_id': tool_def.workflow_id,
            'display_name': tool_def.display_name,
            'description': tool_def.description,
            'category': tool_def.category,
            'requires_data': tool_def.requires_data,
            'has_parameters': tool_def.ai_id in PARAMETER_SCHEMAS and PARAMETER_SCHEMAS[tool_def.ai_id] is not None
        }
    
    def validate_decision(
        self,
        decision_dict: Dict[str, Any],
        state: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        Validate a complete agent decision
        
        Args:
            decision_dict: Decision from LLM
            state: Current workflow state
            
        Returns:
            (is_valid, error_message)
        """
        try:
            # Parse into AgentDecision (validates structure)
            decision = AgentDecision(**decision_dict)
            
            # If not finishing, validate tool
            if decision.action != ActionType.FINISH:
                if not decision.tool_name:
                    return False, f"Action '{decision.action}' requires a tool_name"
                
                # Check tool can execute
                can_execute, reason = self.can_execute_tool(decision.tool_name, state)
                if not can_execute:
                    return False, f"Tool '{decision.tool_name}' cannot execute: {reason}"
                
                # Validate parameters
                try:
                    self.validate_tool_params(decision.tool_name, decision.tool_params)
                except ValueError as e:
                    return False, str(e)
            
            return True, None
            
        except Exception as e:
            return False, f"Decision validation failed: {e}"
    
    def get_tools_by_category(self, category: str) -> List[str]:
        """
        Get all tool AI IDs in a category
        
        Args:
            category: 'data' or 'analysis'
            
        Returns:
            List of tool AI IDs
        """
        tool_defs = self.registry.get_tools_by_category(category)
        return [tool_def.ai_id for tool_def in tool_defs]
    
    def get_all_tool_ids(self) -> List[str]:
        """Get all tool AI IDs"""
        return [tool_def.ai_id for tool_def in self.registry.get_all_definitions()]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def map_action_to_tool(
    action: ActionType,
    state: Dict[str, Any],
    allow_fallback: bool = True
) -> Optional[str]:
    """
    Infer appropriate tool AI ID from action type
    
    Args:
        action: High-level action
        state: Current state
        allow_fallback: Try fallback tools if primary unavailable
        
    Returns:
        Tool AI ID or None
    """
    # Direct mappings
    action_map = {
        ActionType.LOAD: 'load_reviews',
        ActionType.FILTER: 'filter_reviews',
        ActionType.SORT: 'sort_reviews',
        ActionType.CLEAN: 'clean_data',
        ActionType.ANALYZE: 'review_sentiment_analysis',
        ActionType.GENERATE: 'generate_insights',
        ActionType.OUTPUT: 'show_results',
        ActionType.FINISH: None
    }
    
    return action_map.get(action)


def get_tool_count() -> int:
    """Get total number of registered tools"""
    from ..tools.registry import tool_registry
    return tool_registry.get_tool_count()


def list_all_tools() -> Dict[str, Dict[str, Any]]:
    """
    List all tools with metadata
    
    Returns:
        Dict mapping AI ID to metadata
    """
    from ..tools.registry import tool_registry
    result = {}
    for tool_def in tool_registry.get_all_definitions():
        result[tool_def.ai_id] = {
            'ai_id': tool_def.ai_id,
            'workflow_id': tool_def.workflow_id,
            'display_name': tool_def.display_name,
            'description': tool_def.description,
            'category': tool_def.category,
            'requires_data': tool_def.requires_data,
        }
    return result


def create_tool_input(
    base_data: ToolCallInputData,
    config: BaseModel
) -> ToolCallInputData:
    """
    Helper to create complete tool input from base data + config
    
    Args:
        base_data: Base input with all state fields
        config: Tool-specific configuration
    
    Returns:
        Complete tool input
    """
    input_dict = base_data.model_dump()
    input_dict['config'] = config
    return ToolCallInputData(**input_dict)

# ============================================================
# EXPORTS
# ============================================================

# Export validator instance
_tool_validator_instance = None

def get_tool_validator() -> ToolValidator:
    """Get singleton tool validator instance"""
    global _tool_validator_instance
    if _tool_validator_instance is None:
        _tool_validator_instance = ToolValidator()
    return _tool_validator_instance

class _ToolValidatorProxy:
    """Proxy for lazy tool_validator access"""
    def __getattr__(self, name):
        return getattr(get_tool_validator(), name)

tool_validator = _ToolValidatorProxy()

__all__ = [
    'ActionType',
    'AgentDecision',

    # Base
    'ToolCallInputData',
    
    # Load Reviews
    'LoadReviewsParams',
    'LoadReviewsInputData',
    
    # Filter Reviews
    'FilterReviewsParams',
    'FilterReviewsInputData',
    
    # Sentiment Analysis
    'SentimentAnalysisParams',
    'SentimentAnalysisInputData',
    
    # Generate Insights
    'GenerateInsightsParams',
    'GenerateInsightsInputData',
    
    # Show Results
    'ShowResultsParams',
    'ShowResultsInputData',
    
    # Helpers
    'create_tool_input',
    'ToolValidator',
    'tool_validator',
    'get_tool_validator',
    'map_action_to_tool',
    'get_tool_count',
    'list_all_tools',
    'PARAMETER_SCHEMAS',
]