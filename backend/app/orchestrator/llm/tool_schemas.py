# backend/app/orchestrator/llm/tool_schemas.py
"""
Tool schemas and validation for AI Assistant 
integrated with centralized tool registry
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from enum import Enum
import logging

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
    category: str = Field(
        ..., 
        description="Product category: 'shoes' or 'wireless'",
        pattern="^(shoes|wireless)$"
    )
    product_id: Optional[str] = Field(
        None,
        description="Specific product ID to filter by"
    )
    min_rating: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Minimum star rating (1-5)"
    )
    max_rating: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Maximum star rating (1-5)"
    )
    verified_only: Optional[bool] = Field(
        None,
        description="Only include verified purchases"
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
    
    @field_validator('max_rating')
    @classmethod
    def validate_rating_range(cls, v: Optional[int], info) -> Optional[int]:
        """Ensure max_rating >= min_rating"""
        if v is not None and 'min_rating' in info.data:
            min_rating = info.data['min_rating']
            if min_rating is not None and v < min_rating:
                raise ValueError('max_rating must be >= min_rating')
        return v


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
    
    # Alternative: Support single filter (backward compatibility)
    field: Optional[str] = Field(
        None,
        description="[Deprecated] Single field to filter - use 'filters' array instead"
    )
    operator: Optional[str] = Field(
        None,
        description="[Deprecated] Single operator - use 'filters' array instead"
    )
    value: Optional[Any] = Field(
        None,
        description="[Deprecated] Single value - use 'filters' array instead"
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
        default=10,
        ge=1,
        le=100,
        description="Number of reviews to process per batch (internal use)"
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
        ...,  # ✅ Required in frontend schema
        description="Areas to focus recommendations on (can select multiple)"
    )
    max_recommendations: int = Field(
        ...,  # ✅ Required in frontend schema
        ge=1,
        le=10,
        description="Number of recommendations to generate"
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


# ============================================================
# PARAMETER SCHEMA MAPPING
# ============================================================

# Map parameter schemas to tool AI IDs
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
    tool_name: Optional[str] = Field(None, description="Specific tool AI ID to use (e.g., 'gather_data')")
    reasoning: str = Field(..., description="Why this decision was made")
    tool_params: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the tool")
    confidence: float = Field(0.5, ge=0.0, le=1.0, description="Confidence score 0-1")
    alternatives_considered: List[str] = Field(default_factory=list, description="Other options considered")
    
    @field_validator('tool_name')
    def validate_tool_exists(cls, v, values):
        """Ensure tool_name exists in registry"""
        from ..tools.registry import tool_registry

        action = values.get('action')
        
        # If action is 'finish', tool_name should be None
        if action == ActionType.FINISH:
            if v is not None:
                logger.warning(f"Action is 'finish' but tool_name is set: {v}")
                return None
            return v
        
        # For other actions, validate tool exists
        if v is not None:
            tool_def = tool_registry.get_tool_definition(ai_id=v)
            if not tool_def:
                raise ValueError(f"Unknown tool in registry: {v}")
        
        return v
    
    @field_validator('confidence')
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
            tool_ai_id: Tool AI ID (e.g., 'gather_data')
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
            tool_ai_id: Tool AI ID to check
            state: Current workflow state
            
        Returns:
            (can_execute: bool, reason: Optional[str])
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
    Infer appropriate tool AI ID from action type with optional fallback
    
    Maps high-level actions to specific tool IDs and validates they can be 
    executed. If primary tool unavailable, optionally tries fallback tools.
    
    Args:
        action: High-level action (LOAD, FILTER, ANALYZE, etc.)
        state: Current workflow state
        allow_fallback: If True, try alternative tools when primary unavailable
        
    Returns:
        Tool AI ID if valid tool found, None otherwise
        
    Examples:
        >>> map_action_to_tool(ActionType.LOAD, state)
        'load_reviews'
        
        >>> map_action_to_tool(ActionType.ANALYZE, state)
        'review_sentiment_analysis'
    """
    # PRIMARY MAPPINGS
    primary_mapping = {
        ActionType.LOAD: 'load_reviews',
        ActionType.FILTER: 'filter_reviews',
        ActionType.CLEAN: 'clean_data',
        ActionType.SORT: 'sort_reviews',
        ActionType.ANALYZE: 'review_sentiment_analysis',
        ActionType.GENERATE: 'generate_insights',
        ActionType.OUTPUT: 'show_results',
        ActionType.FINISH: None,
    }
    
    # FALLBACK MAPPINGS
    fallback_mapping = {
        ActionType.LOAD: [],  # No fallback - must load data
        ActionType.FILTER: ['sort_reviews'],  # Can sort instead of filter
        ActionType.CLEAN: [],  # No fallback
        ActionType.SORT: ['filter_reviews'],  # Can filter instead of sort
        ActionType.ANALYZE: [],  # No fallback for analysis
        ActionType.GENERATE: [],  # No fallback
        ActionType.OUTPUT: [],  # Must show results
        ActionType.FINISH: [],
    }

    # Get primary tool
    primary_tool_id = primary_mapping.get(action)
    
    # If action maps to None (e.g., FINISH), return None
    if primary_tool_id is None:
        logger.debug(f"Action '{action}' maps to None (no tool needed)")
        return None
    
    # Use singleton validator instead of creating new instance
    validator = get_tool_validator()
    
    # Try primary tool
    can_execute, reason = validator.can_execute_tool(primary_tool_id, state)
    if can_execute:
        logger.debug(f"✅ Mapped action '{action}' to tool '{primary_tool_id}'")
        return primary_tool_id
    
    # LOG: Primary tool cannot execute
    logger.debug(
        f" Primary tool '{primary_tool_id}' cannot execute for action "
        f"'{action}': {reason}"
    )
    
    # FALLBACK: Try alternative tools if enabled
    if allow_fallback:
        fallbacks = fallback_mapping.get(action, [])
        for fallback_tool_id in fallbacks:
            can_execute, _ = validator.can_execute_tool(fallback_tool_id, state)
            if can_execute:
                logger.info(
                    f"Using fallback tool '{fallback_tool_id}' for action '{action}' "
                    f"(primary '{primary_tool_id}' unavailable)"
                )
                return fallback_tool_id
        
        if fallbacks:  # Only log warning if there were fallbacks to try
            logger.warning(
                f"No executable tool found for action '{action}' "
                f"(tried: {primary_tool_id}, {fallbacks})"
            )
    
    return None


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


# ============================================================
# EXPORTS
# ============================================================

# Export validator instance
_tool_validator_instance = None

def get_tool_validator() -> ToolValidator:
    """Get singleton tool validator instance (lazy initialization)"""
    global _tool_validator_instance
    if _tool_validator_instance is None:
        _tool_validator_instance = ToolValidator()
    return _tool_validator_instance

# For backwards compatibility, create a property-like access
class _ToolValidatorProxy:
    """Proxy for lazy tool_validator access"""
    def __getattr__(self, name):
        return getattr(get_tool_validator(), name)

tool_validator = _ToolValidatorProxy()

# Backwards compatibility exports
__all__ = [
    # Models
    'ActionType',
    'AgentDecision',
    'LoadReviewsParams',
    'FilterReviewsParams',
    'SortReviewsParams',
    'CleanDataParams',
    'ReviewSentimentAnalysisParams',
    'GenerateInsightsParams',
    'ShowResultsParams',
    
    # Validator
    'ToolValidator',
    'tool_validator',
    'get_tool_validator',
    
    # Helper functions
    'map_action_to_tool',
    'get_tool_count',
    'list_all_tools',
    
    # Schema mapping
    'PARAMETER_SCHEMAS',
]