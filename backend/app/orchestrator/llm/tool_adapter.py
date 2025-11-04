# backend/app/orchestrator/llm/tool_adapter.py
"""
LangChain Tool Adapter - Bridge Between BaseTool and LangChain

Wraps existing BaseTool implementations to make them LangChain-compatible
without requiring rewrites of existing tool code.

Architecture:
- Preserves existing tool._execute() interface
- Adds LangChain StructuredTool wrapper
- Handles type conversions (dict ↔ Pydantic)
- Maintains WebSocket and streaming support
- Enables LangSmith tracing

Usage:
    # Wrap existing tool
    from app.orchestrator.tools.analysis_tools import ReviewSentimentAnalysisTool
    
    legacy_tool = ReviewSentimentAnalysisTool()
    langchain_tool = create_langchain_tool(legacy_tool)
    
    # Use with LangChain agent
    agent = create_react_agent(
        llm=llm,
        tools=[langchain_tool],
        prompt=prompt
    )
"""
import asyncio
import logging
import json
from typing import Any, Dict, List, Optional, Type, Callable
from pydantic import BaseModel, Field, create_model

from langchain_core.tools import StructuredTool, BaseTool as LangChainBaseTool

from app.orchestrator.tools.base_tool import BaseTool
from ..tools.output_schemas.tool_output_schemas import get_output_schema, OUTPUT_SCHEMAS

logger = logging.getLogger(__name__)


# ============================================================
# INPUT/OUTPUT TYPE CONVERTERS
# ============================================================

class ToolAdapter:
    """
    Adapter that wraps BaseTool for LangChain compatibility
    
    Features:
    - Preserves existing tool implementation
    - Handles type conversions
    - Maintains context (session_id, execution_id)
    - Supports WebSocket streaming
    - Enables LangSmith tracing
    """
    
    def __init__(
        self,
        tool: BaseTool,
        input_schema: Optional[Type[BaseModel]] = None,
        output_schema: Optional[Type[BaseModel]] = None
    ):
        """
        Initialize tool adapter
        
        Args:
            tool: Existing BaseTool instance
            input_schema: Optional Pydantic input schema
            output_schema: Optional Pydantic output schema
        """
        self.tool = tool
        self.input_schema = input_schema
        self.output_schema = output_schema or get_output_schema(tool.name)
        
        logger.debug(
            f"ToolAdapter created: tool={tool.name}, "
            f"has_input_schema={input_schema is not None}, "
            f"has_output_schema={self.output_schema is not None}"
        )
    
    async def _execute_with_context(
        self,
        session_id: Optional[str] = None,
        execution_id: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        Execute tool with LangChain-compatible signature
        
        Converts LangChain's **kwargs to BaseTool's input_data dict
        and returns JSON-serialized result
        
        Args:
            session_id: Session identifier (optional)
            execution_id: Execution identifier (optional)
            **kwargs: Tool parameters
            
        Returns:
            JSON string with tool output
        """
        # Build input_data in BaseTool format
        input_data = {
            'session_id': session_id,
            'execution_id': execution_id,
            **kwargs
        }
        
        logger.debug(
            f"Executing {self.tool.name}: "
            f"session={session_id}, execution={execution_id}"
        )
        
        try:
            # Execute underlying tool
            result = await self.tool.execute(input_data)
            
            # Validate output if schema available
            if self.output_schema:
                try:
                    validated = self.output_schema(**result)
                    result = validated.model_dump()
                except Exception as e:
                    logger.warning(
                        f"Output validation failed for {self.tool.name}: {e}"
                    )
                    # Continue with unvalidated result
            
            # Return JSON-serialized result
            return json.dumps(result, default=str)
            
        except Exception as e:
            logger.error(f"Tool execution failed: {self.tool.name}: {e}", exc_info=True)
            
            # Return error as JSON
            error_result = {
                'success': False,
                'error': str(e),
                'tool_name': self.tool.name
            }
            return json.dumps(error_result)
    
    def get_langchain_tool(
        self,
        session_id: Optional[str] = None,
        execution_id: Optional[int] = None
    ) -> StructuredTool:
        """
        Create LangChain StructuredTool with bound context
        
        Args:
            session_id: Session identifier
            execution_id: Execution identifier
            
        Returns:
            LangChain StructuredTool instance
        """
        # Create coroutine with bound context
        async def execute_with_bound_context(**kwargs) -> str:
            return await self._execute_with_context(
                session_id=session_id,
                execution_id=execution_id,
                **kwargs
            )
        
        # Create input schema dynamically if needed
        args_schema = self._create_args_schema()
        
        # Create StructuredTool
        langchain_tool = StructuredTool(
            name=self.tool.name,
            description=self.tool.description or f"Execute {self.tool.name}",
            coroutine=execute_with_bound_context,
            args_schema=args_schema
        )
        
        return langchain_tool
    
    def _create_args_schema(self) -> Type[BaseModel]:
        """
        Create Pydantic args schema for LangChain
        
        Uses input_schema if provided, otherwise creates dynamic schema
        """
        if self.input_schema:
            return self.input_schema
        
        # Create dynamic schema based on tool requirements
        fields = {}
        
        # Common fields for all tools
        if hasattr(self.tool, 'requires_data') and self.tool.requires_data:
            fields['data'] = (Optional[Dict[str, Any]], Field(None, description="Input data"))
        
        # Tool-specific fields (can be extended)
        # For now, use generic approach
        fields['tool_params'] = (Optional[Dict[str, Any]], Field(default_factory=dict, description="Tool parameters"))
        
        # Create dynamic model
        DynamicSchema = create_model(
            f"{self.tool.name}_args",
            **fields
        )
        
        return DynamicSchema


# ============================================================
# ADAPTER FACTORY FUNCTIONS
# ============================================================

def create_langchain_tool(
    tool: BaseTool,
    input_schema: Optional[Type[BaseModel]] = None,
    output_schema: Optional[Type[BaseModel]] = None,
    session_id: Optional[str] = None,
    execution_id: Optional[int] = None
) -> StructuredTool:
    """
    Create LangChain-compatible tool from BaseTool
    
    Args:
        tool: Existing BaseTool instance
        input_schema: Optional Pydantic input schema
        output_schema: Optional Pydantic output schema  
        session_id: Optional session identifier
        execution_id: Optional execution identifier
        
    Returns:
        LangChain StructuredTool
        
    Example:
        tool = ReviewSentimentAnalysisTool()
        langchain_tool = create_langchain_tool(
            tool=tool,
            input_schema=ReviewSentimentAnalysisParams,
            session_id='sess_123',
            execution_id=456
        )
    """
    adapter = ToolAdapter(
        tool=tool,
        input_schema=input_schema,
        output_schema=output_schema
    )
    
    return adapter.get_langchain_tool(
        session_id=session_id,
        execution_id=execution_id
    )


def create_langchain_tools_from_registry(
    registry,
    session_id: Optional[str] = None,
    execution_id: Optional[int] = None,
    tool_filter: Optional[Callable[[BaseTool], bool]] = None
) -> List[StructuredTool]:
    """
    Create LangChain tools from tool registry
    
    Args:
        registry: Tool registry instance
        session_id: Optional session identifier
        execution_id: Optional execution identifier
        tool_filter: Optional filter function (returns True to include tool)
        
    Returns:
        List of LangChain StructuredTool instances
        
    Example:
        # Create tools for AI Assistant
        from app.orchestrator.tools.registry import tool_registry
        
        tools = create_langchain_tools_from_registry(
            registry=tool_registry,
            session_id='sess_123',
            execution_id=456,
            tool_filter=lambda tool: tool.category in ['data', 'analysis']
        )
    """
    langchain_tools = []
    
    # Get all tool instances from registry
    for tool_def in registry.get_all_definitions():
        tool_instance = registry.get_tool_instance(tool_def.ai_id)
        
        if tool_instance is None:
            logger.warning(f"Could not get instance for tool: {tool_def.ai_id}")
            continue
        
        # Apply filter if provided
        if tool_filter and not tool_filter(tool_instance):
            continue
        
        # Get input schema from parameter schemas if available
        from .tool_schemas import PARAMETER_SCHEMAS
        input_schema = PARAMETER_SCHEMAS.get(tool_def.ai_id)
        
        # Create adapted tool
        try:
            langchain_tool = create_langchain_tool(
                tool=tool_instance,
                input_schema=input_schema,
                session_id=session_id,
                execution_id=execution_id
            )
            
            langchain_tools.append(langchain_tool)
            logger.debug(f"Created LangChain tool: {tool_def.ai_id}")
            
        except Exception as e:
            logger.error(f"Failed to create LangChain tool for {tool_def.ai_id}: {e}")
    
    logger.info(f"Created {len(langchain_tools)} LangChain tools from registry")
    
    return langchain_tools


# ============================================================
# SPECIALIZED ADAPTERS
# ============================================================

class StreamingToolAdapter(ToolAdapter):
    """
    Extended adapter with streaming support
    
    For tools that need real-time progress updates (e.g., sentiment analysis)
    """
    
    def __init__(
        self,
        tool: BaseTool,
        ws_manager,
        input_schema: Optional[Type[BaseModel]] = None,
        output_schema: Optional[Type[BaseModel]] = None
    ):
        """
        Initialize streaming adapter
        
        Args:
            tool: BaseTool instance
            ws_manager: WebSocket manager for progress updates
            input_schema: Optional Pydantic input schema
            output_schema: Optional Pydantic output schema
        """
        super().__init__(tool, input_schema, output_schema)
        self.ws_manager = ws_manager
        
        # Inject WebSocket into tool if supported
        if hasattr(tool, 'websocket_manager'):
            tool.websocket_manager = ws_manager
            logger.debug(f"Injected WebSocket into {tool.name}")


def create_streaming_tool(
    tool: BaseTool,
    ws_manager,
    input_schema: Optional[Type[BaseModel]] = None,
    output_schema: Optional[Type[BaseModel]] = None,
    session_id: Optional[str] = None,
    execution_id: Optional[int] = None
) -> StructuredTool:
    """
    Create streaming-capable LangChain tool
    
    Args:
        tool: BaseTool instance
        ws_manager: WebSocket manager
        input_schema: Optional input schema
        output_schema: Optional output schema
        session_id: Session identifier
        execution_id: Execution identifier
        
    Returns:
        LangChain StructuredTool with streaming support
    """
    adapter = StreamingToolAdapter(
        tool=tool,
        ws_manager=ws_manager,
        input_schema=input_schema,
        output_schema=output_schema
    )
    
    return adapter.get_langchain_tool(
        session_id=session_id,
        execution_id=execution_id
    )


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def get_adapted_tool_names(tools: List[StructuredTool]) -> List[str]:
    """Get names of adapted tools"""
    return [tool.name for tool in tools]


def get_tool_descriptions(tools: List[StructuredTool]) -> Dict[str, str]:
    """Get descriptions of adapted tools"""
    return {tool.name: tool.description for tool in tools}


__all__ = [
    'ToolAdapter',
    'StreamingToolAdapter',
    'create_langchain_tool',
    'create_langchain_tools_from_registry',
    'create_streaming_tool',
    'get_adapted_tool_names',
    'get_tool_descriptions',
]