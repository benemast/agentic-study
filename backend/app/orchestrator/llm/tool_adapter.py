# backend/app/orchestrator/llm/tool_adapter.py
"""
LangChain Tool Adapter - Bridge Between BaseTool and LangChain

CRITICAL: This adapter preserves ALL ToolDefinition metadata from the registry!

Key Features:
- Iterates through registry._all_definitions (NOT just tool instances)
- Passes tool_def.description to LangChain tools
- Stores tool_def reference on each LangChain tool
- Provides utilities to access ToolDefinition metadata
- Uses LangChain's convert_to_openai_tool for compatibility

Architecture:
  registry._all_definitions
       ↓
  ToolDefinition (has: ai_id, workflow_id, display_name, description, 
                       category, requires_data, prerequisites, etc.)
       ↓
  tool_def.instance (BaseTool)
       ↓
  LangChain StructuredTool (with tool_def reference stored)
       ↓
  OpenAI-compatible tool (via convert_to_openai_tool)
"""
import asyncio
import logging
import json
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Type, Callable
from pydantic import BaseModel, Field, create_model


from langchain_core.tools import StructuredTool, BaseTool as LangChainBaseTool
from langchain_core.utils.function_calling import convert_to_openai_tool


if TYPE_CHECKING:
    from app.orchestrator.tools.base_tool import BaseTool


logger = logging.getLogger(__name__)


# ============================================================
# LANGCHAIN TOOL WRAPPER
# ============================================================

def create_langchain_tool_from_base(
    tool: "BaseTool",
    tool_name: str,
    description: str,
    input_schema: Optional[Type[BaseModel]] = None,
    session_id: Optional[str] = None,
    execution_id: Optional[int] = None
) -> StructuredTool:
    """
    Create LangChain StructuredTool from BaseTool
    
    Uses LangChain's standard utilities for proper OpenAI compatibility.
    
    Args:
        tool: Existing BaseTool instance
        tool_name: Tool name for OpenAI (must match ^[a-zA-Z0-9_-]+$) - use ai_id
        description: Tool description (from ToolDefinition.description)
        input_schema: Optional Pydantic input schema
        session_id: Optional session identifier
        execution_id: Optional execution identifier
        
    Returns:
        LangChain StructuredTool
    """
    # Create execution function with bound context
    async def execute_tool(**kwargs) -> str:
        """Execute the underlying tool with context"""
        # Build input_data in BaseTool format
        input_data = {
            'session_id': session_id,
            'execution_id': execution_id,
            **kwargs
        }
        
        logger.debug(
            f"Executing {tool.name}: "
            f"session={session_id}, execution={execution_id}"
        )
        
        try:
            # Execute underlying tool
            result = await tool._run(input_data)
            
            # Return JSON-serialized result
            return json.dumps(result, default=str)
            
        except Exception as e:
            logger.error(f"Tool execution failed: {tool.name}: {e}", exc_info=True)
            
            # Return error as JSON
            error_result = {
                'success': False,
                'error': str(e),
                'tool_name': tool.name
            }
            return json.dumps(error_result)
    
    # Create args schema if needed
    if not input_schema:
        # Create minimal schema
        input_schema = create_model(
            f"{tool.name}_args",
            tool_params=(Optional[Dict[str, Any]], Field(
                default_factory=dict, 
                description="Tool parameters"
            ))
        )
    
    # Create StructuredTool using LangChain's standard approach
    langchain_tool = StructuredTool(
        name=tool_name,
        description=description,
        coroutine=execute_tool,
        args_schema=input_schema
    )
    
    return langchain_tool


# ============================================================
# REGISTRY CONVERSION - PRESERVES TOOLDEFINITION
# ============================================================

def create_langchain_tools_from_registry(
    registry,
    session_id: Optional[str] = None,
    execution_id: Optional[int] = None,
    tool_filter: Optional[Callable[["BaseTool"], bool]] = None
) -> List[StructuredTool]:
    """
    Create LangChain tools from tool registry
    
    ⚠️ CRITICAL: This function preserves ALL ToolDefinition metadata!
    
    Flow:
    1. Iterates through registry._all_definitions (ToolDefinition objects)
    2. Extracts tool_def.instance (the BaseTool)
    3. Passes tool_def.description to LangChain tool
    4. Stores tool_def reference on langchain_tool._tool_definition
    5. Result: LangChain tool with full registry metadata access!
    
    Args:
        registry: Tool registry instance
        session_id: Optional session identifier
        execution_id: Optional execution identifier
        tool_filter: Optional filter function (returns True to include tool)
        
    Returns:
        List of LangChain StructuredTool instances (with _tool_definition attribute)
        
    Example:
        tools = create_langchain_tools_from_registry(tool_registry)
        
        # Access ToolDefinition metadata
        tool_def = tools[0]._tool_definition
        print(tool_def.category)           # 'analysis'
        print(tool_def.prerequisites)      # ['load_reviews']
        print(tool_def.when_to_use)        # Full guidance text
    """
    langchain_tools = []
    
    # STEP 1: Iterate through ToolDefinitions (NOT just tool instances!)
    # This is KEY - gives us access to all metadata
    logger.debug(f"Converting {len(registry._all_definitions)} ToolDefinitions to LangChain tools")
    
    for tool_def in registry._all_definitions:
        # STEP 2: Get the BaseTool instance from ToolDefinition
        tool_instance = tool_def.instance
        
        if tool_instance is None:
            logger.warning(f"Could not get instance for tool: {tool_def.ai_id}")
            continue
        
        # Apply filter if provided
        if tool_filter and not tool_filter(tool_instance):
            logger.debug(f"Skipping tool {tool_def.ai_id} (filtered out)")
            continue
        
        # STEP 3: Get input schema from PARAMETER_SCHEMAS
        # This connects to your defined parameter schemas
        from .tool_schemas import PARAMETER_SCHEMAS
        input_schema = PARAMETER_SCHEMAS.get(tool_def.ai_id)
        
        if input_schema:
            logger.debug(f"✓ Found input schema for {tool_def.ai_id}: {input_schema.__name__}")
        else:
            logger.warning(f"⚠️  No input schema found for {tool_def.ai_id} - will use generic schema")
        
        # STEP 4: Create LangChain tool using ToolDefinition metadata
        try:
            langchain_tool = create_langchain_tool_from_base(
                tool=tool_instance,
                tool_name=tool_def.ai_id,
                description=tool_def.description,  # ← RICH DESCRIPTION FROM REGISTRY!
                input_schema=input_schema,
                session_id=session_id,
                execution_id=execution_id
            )
            
            # STEP 5: Store ToolDefinition reference on LangChain tool
            # ⚠️ THIS IS CRITICAL - Preserves full registry metadata!
            langchain_tool._tool_definition = tool_def
            
            # Log with ToolDefinition metadata
            logger.debug(
                f"✓ Created LangChain tool: '{tool_def.display_name}'\n"
                f"    ai_id: {tool_def.ai_id}\n"
                f"    workflow_id: {tool_def.workflow_id}\n"
                f"    category: {tool_def.category}\n"
                f"    requires_data: {tool_def.requires_data}\n"
                f"    prerequisites: {tool_def.prerequisites or 'none'}"
            )
            
            # STEP 6: Verify OpenAI compatibility
            try:
                openai_tool = convert_to_openai_tool(langchain_tool)
                openai_name = openai_tool.get('function', {}).get('name')
                logger.debug(
                    f"✓ Created LangChain tool: '{tool_def.display_name}'\n"
                    f"    ai_id (OpenAI name): {openai_name}\n"
                    f"    workflow_id: {tool_def.workflow_id}\n"
                    f"    category: {tool_def.category}\n"
                    f"    requires_data: {tool_def.requires_data}\n"
                    f"    prerequisites: {tool_def.prerequisites or 'none'}"
                )
            except Exception as e:
                logger.warning(
                    f"Tool {tool_def.ai_id} may not be fully OpenAI compatible: {e}"
                )
            
            langchain_tools.append(langchain_tool)
            
        except Exception as e:
            logger.error(
                f"❌ Failed to create LangChain tool for {tool_def.ai_id}\n"
                f"    display_name: {tool_def.display_name}\n"
                f"    error: {e}"
            )
            # Log full traceback for debugging
            import traceback
            logger.error(traceback.format_exc())
    
    logger.info(
        f"✅ Created {len(langchain_tools)}/{len(registry._all_definitions)} "
        f"LangChain tools from registry (with ToolDefinition metadata preserved)"
    )
    
    return langchain_tools


# ============================================================
# UTILITY FUNCTIONS - ACCESS TOOLDEFINITION METADATA
# ============================================================

def get_adapted_tool_names(tools: List[StructuredTool]) -> List[str]:
    """Get names of adapted tools"""
    return [tool.name for tool in tools]


def get_tool_descriptions(tools: List[StructuredTool]) -> Dict[str, str]:
    """Get descriptions of adapted tools"""
    return {tool.name: tool.description for tool in tools}


def get_tool_definition(tool: StructuredTool) -> Optional[Any]:
    """
    Get the original ToolDefinition from a LangChain tool
    
    Returns the full ToolDefinition object with all metadata:
    - ai_id, workflow_id, display_name
    - description, category, requires_data
    - prerequisites, position_constraint
    - when_to_use, when_not_to_use
    - estimated_time, optimal_dataset_size
    - parameter_schema_name
    
    Args:
        tool: LangChain StructuredTool
        
    Returns:
        ToolDefinition or None if not available
        
    Example:
        tool_def = get_tool_definition(langchain_tool)
        if tool_def:
            print(f"Category: {tool_def.category}")
            print(f"Prerequisites: {tool_def.prerequisites}")
            print(f"When to use: {tool_def.when_to_use}")
    """
    return getattr(tool, '_tool_definition', None)


def get_tools_by_category(
    tools: List[StructuredTool],
    category: str
) -> List[StructuredTool]:
    """
    Filter tools by category using ToolDefinition metadata
    
    Categories: 'input', 'data', 'analysis', 'generation', 'output'
    
    Args:
        tools: List of LangChain tools
        category: Category to filter by
        
    Returns:
        Filtered list of tools
    """
    filtered = []
    for tool in tools:
        tool_def = get_tool_definition(tool)
        if tool_def and tool_def.category == category:
            filtered.append(tool)
    return filtered


def get_tools_requiring_data(
    tools: List[StructuredTool]
) -> List[StructuredTool]:
    """
    Get tools that require data input
    
    Uses ToolDefinition.requires_data metadata
    """
    filtered = []
    for tool in tools:
        tool_def = get_tool_definition(tool)
        if tool_def and tool_def.requires_data:
            filtered.append(tool)
    return filtered


def get_tool_prerequisites(tool: StructuredTool) -> List[str]:
    """
    Get prerequisite tool names for a tool
    
    Args:
        tool: LangChain StructuredTool
        
    Returns:
        List of prerequisite tool ai_ids
    """
    tool_def = get_tool_definition(tool)
    return tool_def.prerequisites if tool_def and tool_def.prerequisites else []


def check_prerequisites_met(
    tool: StructuredTool,
    executed_tool_names: List[str]
) -> tuple[bool, List[str]]:
    """
    Check if tool's prerequisites have been met
    
    Args:
        tool: LangChain StructuredTool
        executed_tool_names: List of already executed tool names
        
    Returns:
        Tuple of (prerequisites_met, missing_prerequisites)
    """
    prerequisites = get_tool_prerequisites(tool)
    
    if not prerequisites:
        return True, []
    
    missing = [p for p in prerequisites if p not in executed_tool_names]
    return len(missing) == 0, missing


def get_tool_metadata_summary(tools: List[StructuredTool]) -> Dict[str, Any]:
    """
    Get comprehensive summary of all tools with ToolDefinition metadata
    
    Returns:
        Dictionary with:
        - total_tools: Count
        - by_category: Breakdown by category
        - requires_data_count: Number requiring data
        - tools: List of tool info dicts
    """
    summary = {
        'total_tools': len(tools),
        'by_category': {},
        'requires_data_count': 0,
        'tools': []
    }
    
    for tool in tools:
        tool_def = get_tool_definition(tool)
        
        tool_info = {
            'name': tool.name,
            'description': tool.description[:100] + '...' if len(tool.description) > 100 else tool.description,
        }
        
        if tool_def:
            tool_info.update({
                'ai_id': tool_def.ai_id,
                'workflow_id': tool_def.workflow_id,
                'display_name': tool_def.display_name,
                'category': tool_def.category,
                'requires_data': tool_def.requires_data,
                'position_constraint': tool_def.position_constraint.value if tool_def.position_constraint else None,
                'prerequisites': tool_def.prerequisites or [],
                'estimated_time': tool_def.estimated_time,
            })
            
            # Count by category
            category = tool_def.category
            summary['by_category'][category] = summary['by_category'].get(category, 0) + 1
            
            # Count requiring data
            if tool_def.requires_data:
                summary['requires_data_count'] += 1
        
        summary['tools'].append(tool_info)
    
    return summary


def verify_openai_compatibility(tools: List[StructuredTool]) -> Dict[str, Any]:
    """
    Verify that all tools are OpenAI compatible
    
    Uses LangChain's convert_to_openai_tool to check compatibility
    
    Returns:
        Dictionary with compatibility info:
        - total: Total tools
        - compatible: Number compatible
        - incompatible: List of incompatible tools with errors
        - tools: Detailed list of all tools
    """
    results = {
        'total': len(tools),
        'compatible': 0,
        'incompatible': [],
        'tools': []
    }
    
    for tool in tools:
        try:
            openai_tool = convert_to_openai_tool(tool)
            results['compatible'] += 1
            results['tools'].append({
                'name': tool.name,
                'compatible': True,
                'openai_name': openai_tool.get('function', {}).get('name')
            })
        except Exception as e:
            results['incompatible'].append({
                'name': tool.name,
                'error': str(e)
            })
            results['tools'].append({
                'name': tool.name,
                'compatible': False,
                'error': str(e)
            })
    
    return results


# ============================================================
# BACKWARDS COMPATIBILITY
# ============================================================

def create_langchain_tool(
    tool: "BaseTool",
    input_schema: Optional[Type[BaseModel]] = None,
    output_schema: Optional[Type[BaseModel]] = None,
    description: Optional[str] = None,
    tool_name: Optional[str] = None,
    session_id: Optional[str] = None,
    execution_id: Optional[int] = None
) -> StructuredTool:
    """
    Backwards compatible wrapper
    
    Deprecated: Use create_langchain_tool_from_base instead
    """
    if description is None:
        description = getattr(tool, 'description', None) or f"Execute {tool.name}"
    
    if tool_name is None:
        # Try to get a valid name from tool
        tool_name = getattr(tool, 'name', 'unknown_tool')
        # Remove spaces and special chars for OpenAI compatibility
        tool_name = tool_name.replace(' ', '_').replace('-', '_').lower()
    
    return create_langchain_tool_from_base(
        tool=tool,
        tool_name=tool_name,
        description=description,
        input_schema=input_schema,
        session_id=session_id,
        execution_id=execution_id
    )


__all__ = [
    # Core functions
    'create_langchain_tool_from_base',
    'create_langchain_tools_from_registry',
    
    # ToolDefinition access utilities
    'get_tool_definition',
    'get_tools_by_category',
    'get_tools_requiring_data',
    'get_tool_prerequisites',
    'check_prerequisites_met',
    'get_tool_metadata_summary',
    
    # General utilities
    'get_adapted_tool_names',
    'get_tool_descriptions',
    'verify_openai_compatibility',
    
    # Backwards compatibility
    'create_langchain_tool',
]