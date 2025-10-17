# backend/app/orchestrator/llm/tool_schemas.py
"""
Tool schemas and validation for AI Assistant 
integrated with centralized tool registry
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator
from enum import Enum
import logging


from ..tools.registry import tool_registry, ToolDefinition

logger = logging.getLogger(__name__)

class ActionType(str, Enum):
    """Available action types"""
    GATHER = "gather"
    FILTER = "filter"
    CLEAN = "clean"
    SORT = "sort"
    COMBINE = "combine"
    ANALYZE = "analyze"
    GENERATE = "generate"
    OUTPUT = "output"
    FINISH = "finish"

# ============================================================
# PARAMETER SCHEMAS (Pydantic Models)
# ============================================================

class GatherDataParams(BaseModel):
    """Parameters for gather_data tool"""
    source: str = Field(default="default", description="Data source identifier")
    query: str = Field(default="", description="Query string for filtering")


class FilterDataParams(BaseModel):
    """Parameters for filter_data tool"""
    min_value: Optional[int] = Field(None, description="Minimum value threshold")
    max_value: Optional[int] = Field(None, description="Maximum value threshold")


class SortDataParams(BaseModel):
    """Parameters for sort_data tool"""
    field: str = Field(default="value", description="Field to sort by")
    descending: bool = Field(default=False, description="Sort in descending order")


# Map parameter schemas to tool AI IDs
PARAMETER_SCHEMAS = {
    'gather_data': GatherDataParams,
    'filter_data': FilterDataParams,
    'sort_data': SortDataParams,
    # Tools without parameters return None
    'clean_data': None,
    'combine_data': None,
    'sentiment_analysis': None,
    'generate_insights': None,
    'show_results': None,
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
    
    @validator('tool_name')
    def validate_tool_exists(cls, v, values):
        """Ensure tool_name exists in registry"""
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
    
    @validator('confidence')
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
    
    def format_tools_for_prompt(self, state: Optional[Dict[str, Any]] = None) -> str:
        """
        Format tool descriptions for LLM prompt
        
        Args:
            state: Optional state to filter by availability
            
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
        
        # Format for prompt
        lines = []
        for i, tool_def in enumerate(tool_defs, 1):
            lines.append(f"{i}. {tool_def.ai_id}: {tool_def.description}")
            
            # Add parameter info if available
            param_schema = PARAMETER_SCHEMAS.get(tool_def.ai_id)
            if param_schema:
                fields = param_schema.__fields__
                param_names = list(fields.keys())
                if param_names:
                    lines.append(f"   Parameters: {', '.join(param_names)}")
        
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
    state: Dict[str, Any]
) -> Optional[str]:
    """
    Infer appropriate tool AI ID from action type
    
    Args:
        action: High-level action
        state: Current workflow state
        
    Returns:
        Tool AI ID or None
    """
    # Simple action -> tool mapping
    mapping = {
        ActionType.GATHER: 'gather_data',
        ActionType.FILTER: 'filter_data',
        ActionType.CLEAN: 'clean_data',
        ActionType.SORT: 'sort_data',
        ActionType.COMBINE: 'combine_data',
        ActionType.ANALYZE: 'sentiment_analysis',
        ActionType.GENERATE: 'generate_insights',
        ActionType.OUTPUT: 'show_results',
    }
    
    tool_ai_id = mapping.get(action)
    
    # Validate tool can be executed
    if tool_ai_id:
        validator = ToolValidator()
        can_execute, _ = validator.can_execute_tool(tool_ai_id, state)
        if can_execute:
            return tool_ai_id
    
    return None


def get_tool_count() -> int:
    """Get total number of registered tools"""
    return tool_registry.get_tool_count()


def list_all_tools() -> Dict[str, Dict[str, Any]]:
    """
    List all tools with metadata
    
    Returns:
        Dict mapping AI ID to metadata
    """
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
tool_validator = ToolValidator()

# Backwards compatibility exports
__all__ = [
    # Models
    'ActionType',
    'AgentDecision',
    'GatherDataParams',
    'FilterDataParams',
    'SortDataParams',
    
    # Validator
    'ToolValidator',
    'tool_validator',
    
    # Helper functions
    'map_action_to_tool',
    'get_tool_count',
    'list_all_tools',
    
    # Schema mapping
    'PARAMETER_SCHEMAS',
]