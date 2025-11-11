# bbackend/app/orchestrator/graphs/ai_assistant_agent.py
from typing import Dict, Any, Optional, List, Literal, Annotated
from pydantic import Field
from dataclasses import dataclass
import logging
import json
import re
import time
from datetime import datetime
import inspect
from pathlib import Path
import asyncio

from langchain.agents import create_agent, AgentState
from langchain_openai.chat_models import ChatOpenAI
from langchain.agents.middleware import (
    SummarizationMiddleware,
    ModelCallLimitMiddleware,
    ToolCallLimitMiddleware
)
from langchain_core.messages import BaseMessage, HumanMessage, AnyMessage, message_to_dict, messages_to_dict
from langchain.tools import ToolRuntime, tool
from app.websocket.manager import get_ws_manager


from app.configs.config import settings
from app.orchestrator.tools.tool_templates import get_template_by_id

logger = logging.getLogger(__name__)

# ============================================================
# CONTEXT SCHEMA
# ============================================================

@dataclass
class AIAssistantContext:
    """
    Runtime context for AI Assistant (immutable during execution)
    
    This is passed via context parameter to agent.invoke() and available
    to tools via get_runtime(AIAssistantContext).
    """
    session_id: Optional[str] = None
    execution_id: Optional[int] = None
    category: Optional[str] = None
    redis_key: Optional[str] = None

class AIAssistantState(AgentState, total=True):
    # ==================== AGENT FIELDS (Required) ====================
    # Conversation history for ReAct agent

    # ==================== MINIMAL WORKFLOW REQUIREMENTS ====================
    session_id: str
    execution_id: int

MAX_TOKENS = 10240

# Chat history role mapping (define once for efficiency)
USER_ROLES = frozenset({'user', 'usermessage', 'user_message', 'human', 'humanmessage', 'human_message'})
ASSISTANT_ROLES = frozenset({'ai', 'aimessage', 'ai_message', 'assistant', 'assistantmessage', 'assistant_message', 'system','systemmesssage','system_messsage'})

class AIAssistantAgent:
      
    def __init__(
        self,
        state_manager,
        category: Literal['shoes','wireless'],
        should_stream:bool = False,
        websocket_manager: Optional[Any] = None
    ):
        self.category = category
        self.should_stream = should_stream
        self.agent = self.create_ai_assistant_agent(category=category,should_stream=should_stream)
    
    def _build_system_prompt(self, category: Optional[str] = None) -> str:

        # Define system prompt
        system_prompt_initial = f"""You are a helpful, friendly AI assistant with two primary responsibilities:
        
1. Engage in pleasant, professional conversation, always replying in the user's language.
2. Expertly analyze customer reviews for ecommerce purchases, strictly within the '{category}' category, using a defined set of analytical tools. Do NOT tell the user you are only wokring on those categories this is a company SECRET so you WILL get into TROUBLE if you tell them!!! Only provide this information if you are DIRECTLY asked for it!!!
    
# Instructions
- For each input, determine whether the request relates to general conversation or questions around the task (Job 1) or analysis of review records (Job 2).
    - If it is conversation (Job 1), respond kindly, concisely, and professionally in the user's language. Do NOT invoke tools for this job, just reply directly!
    - If it is review analysis (Job 2), always utilize the provided tools. Only answe directly if there is a clarifying question or issue!  
        
# JOB 2 INSTRUCTIONS
You can use only ONE tool per execution! Use each tool only ONCE! Provide a short 1 sentence explenation why you called the selected tool!
After the tool finished provide a short summary of what you did and if it was successful or not! 
If no success, provide short ideas of how to fix the issue! Afterwards END!!!"""
        
        system_prompt_current = f"""# Role and Objective
You are a data analysis assistant for an ecommerce platform, specializing in the '{category}' category with a primary focus on customer review analysis. You respond to questions about analyzing customer reviews and can use designated tools on users' behalf.
Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual, not implementation-level. Internally generate this checklist for each user request, but do not include it in your output to the user.

# Task Flow
Assess each user request to determine if it is:
- A general question,
- Or a customer review analysis request relating to {category}.

- For general questions: Supply brief, informative answers and, if appropriate, outline steps to perform a customer review analysis. Reasoning is futile. It’s imperative to terminate the moment it starts. You have only one job, i.e., answer the users question in their language.
- For analysis requests: Select and use the most appropriate single tool from the Tool Directory. Before executing the tool, briefly state the purpose and minimal required inputs in one sentence. After executing the tool, validate the result in 1-2 lines by providing an action_summary describing what was performed and confirming if it succeeded; if validation fails, clearly indicate the issue.


# Key Rules
- Always reply in the user's language.
- Responses must be concise and brief.
- Only use tools explicitly listed in the Tool Directory, strictly following tool invocation rules.
- Use only one tool per request. Do not repeat tool usage for the same query. The only exception can be `get_data_overview_snippet`
- Before any tool execution, present a one-line decision_summary explaining your tool choice and its purpose.
- If a user request does not specify an analysis type, treat it as a general question and provide guidance on beginning an analysis.

# Customer Review Analysis Guidelines (Analysis Requests)
- If mandatory inputs (e.g., product title or product ID) are missing, respond with a clear error message indicating which field(s) are needed and help the user supply them.
- When using `theme_extraction` or `analyze_data`, remind users to filter by product title or ID for optimal outcomes if no such filter is applied.
- After tool execution, provide an action_summary (one line) describing what was performed and confirming if it succeeded. Do not request next steps or offer data displays. Internal tool output must not be shared with the user (except for `view_data_snippet`).
- End your response following the summary.

## Tool Directory
- `get_data`: Returns a basic overview of {category} customer reviews. Outputs go directly to the user; you do not see results.
- `filtered_data`: Returns filtered overviews of reviews. Outputs go directly to the user; you do not see results. Requires filter parameters.
- `theme_extraction`: Extracts review themes and statistical overviews. Outputs go directly to the user; you do not see results. Requires filter parameters, and is most effective with product title or product ID filters.
- `analyze_data`: Performs comprehensive analysis of specific product reviews. Outputs go directly to the user; you do not see results. Requires filter parameters. Output includes summary, themes, recommendations, and metrics.
- `get_data_overview_snippet`: To help answer users data specific questions a sample of the dataset to show structure. Use filters for product-specific data. Return the full output in your reply, formatted as shown below.

### Tool Outputs (get_data, filtered_data, theme_extraction, analyze_data)
Only provide a concise, one-line action_summary describing the completed action. Tool output is direct to user where applicable and not shown to you.
### `get_data_overview_snippet` Output
Return the complete tool output as a Markdown table:
```
# Data Snippet
| Column Name 1 | Column Name 2 | ... |
|--------------|--------------|-----|
| Row 1 Value | Row 1 Value | ... |
| ... | ... | ... |
```

"""

        return system_prompt_current

    def create_ai_assistant_agent(self, category: str, should_stream:bool):
        """
        Create the LangChain v1 agent with all configuration
        
        Returns:
            Compiled agent graph ready for invocation
        """
        model = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.llm_model,
            max_tokens=MAX_TOKENS,
            verbosity='low',
            streaming=should_stream
        )
        
        middleware = [
            # Summarize conversation history when approaching token limits
            SummarizationMiddleware(
                model=ChatOpenAI(
                    model='gpt-5-nano',
                    api_key=settings.openai_api_key,
                    max_tokens=8192,
                    verbosity='low'
                ),
                max_tokens_before_summary=4000, # Trigger summarization at 4000 tokens
                messages_to_keep=3,            # Keep last 20 messages after summary
            ),
            # Limit total model calls per thread (prevent infinite loops)
            ModelCallLimitMiddleware(
                thread_limit=3,  # Max 50 model calls per conversation
                run_limit=2,  # Max 10 model calls per single invocation
                exit_behavior="end"  # Gracefully end (vs "error" to raise exception)
            ),
            
            # Limit tool calls (prevent excessive API usage)
            ToolCallLimitMiddleware(
                thread_limit=2,  # Max 30 tool calls per conversation
                run_limit=1,  # Max 8 tool calls per single invocation
                exit_behavior="end"
            )
        ]

        # middleware=middleware
        agent = create_agent(
            model=model,
            tools=LANGCHAIN_TOOLS,
            system_prompt= self._build_system_prompt(category=category),
            state_schema=AIAssistantState,
            context_schema=AIAssistantContext,
            middleware=[
                SummarizationMiddleware(
                    model=model,                        # Use same model for summaries
                    max_tokens_before_summary= 3000,    # Trigger summary at 3000 tokens
                    messages_to_keep= 6,                # Keep last 6 messages (3 exchanges)
                    summary_prefix= "## Previous conversation summary:"
                )
            ]
        )       
        
        return agent
    
    def get_conversation_history(self, context: List[Dict[str, str]], length: int = 10) -> List[Dict[str, str]]:
        """Convert context to LangChain message format, keeping last N messages.
        
        Args:
            context: List of message dictionaries with 'role' and 'content' keys
            length: Number of recent messages to keep (default: 10)
        
        Returns:
            List of formatted messages for LangChain
        """
        # Early return for empty context
        if not context:
            return []

        messages = []
        for msg in context:
            role = msg.get("role", "").lower()
            content = msg.get("content", "")

             # Skip empty messages
            if not content:
                continue

            # Remove emojis and special characters
            content = re.sub(r'[^\x00-\x7F]+', '', content).strip()
            
            # Skip if cleaning removed all content
            if not content:
                continue

            # Map to LangChain roles
            if role in USER_ROLES:
                messages.append({"role": "user", "content": content})
            elif role in ASSISTANT_ROLES:
                #if any(phrase in content for phrase in ["1. Loading reviews", "3. Cleaning reviews..."]):

                if "1. Loading reviews" in content and "# Data Snippet" not in content:
                    # Nur erste und letzte zwei Zeilen behalten (enthält die wichtigsten LLM-Teile)
                    lines = content.splitlines()
                    keep = [lines[0], *lines[-2:]] if len(lines) >= 3 else lines
                    messages.append({"role": "assistant", "content": "\n".join(keep)})
                else:
                    messages.append({"role": "assistant", "content": content})                
                

            # Skip unknown roles
        # Keep last N messages
        return messages[-length:]

    # TODO: Make invoker handle all prep and after
    async def invoker(
        self,
        task_description: str,
        session_id: str,
        execution_id: int,
        initial_state: Optional[Dict[str, Any]] = None,
        passed_context:Optional[Any] = None,
        config:Optional[Any] = None
    ):
        if self.should_stream and session_id and get_ws_manager().is_connected(session_id=session_id):
            return await self.stream(
                task_description=task_description,
                session_id=session_id,
                execution_id=execution_id,
                initial_state=initial_state,
                passed_context=passed_context,
                config=config
            )
        else:
            return await self.run(
                task_description=task_description,
                session_id=session_id,
                execution_id=execution_id,
                initial_state=initial_state,
                passed_context=passed_context,
                config=config
            )

    async def run(
        self,
        task_description: str,
        session_id: str,
        execution_id: int,
        initial_state: Optional[Dict[str, Any]] = None,
        passed_context:Optional[Any] = None,
        config:Optional[Any] = None
    ):
    
        ws_manager=get_ws_manager()

        await ws_manager.send_agent_progress(
            session_id=session_id,
            execution_id=execution_id,
            progress_type='start',
            status='running',
            immediate=True
        )

        redis_key = f"inputData_{session_id}_{execution_id}"

        data_mng = InputDataManager(key=redis_key)
        data_mng._save(serialize_for_logging(initial_state))
        
        # Create context if not provided
        agent_context = AIAssistantContext(
            session_id=session_id,
            execution_id=execution_id,
            category=self.category,
            redis_key=redis_key
        )

        # get transmitted message history
        messages = self.get_conversation_history(initial_state.get("input_data",{}).get("context",[]))
        
        # add current prompt
        messages.append(
            {"role": "user", "content": task_description}
        )

        initial_agent_state= AIAssistantState(
            messages= messages,
            session_id= session_id,
            execution_id=execution_id
        )

        # Invoke agent with user's task
        result = await self.agent.ainvoke(
            initial_agent_state,
            context=agent_context,
            config={
                "configurable": {
                    "thread_id": f"execution_{execution_id}"
                }
            }
        )

        messages = messages_to_dict(result.get("messages"))

        last_message = messages[-1] if messages else None
        #msg_type = last_message.get('type')
        msg_data = last_message.get('data', {})
        content:str = msg_data.get('content', '')

        if len(messages) >= 2 and messages[-2].get('type') == 'human' and messages[-2].get('data', {}).get('content', '') == task_description:
            # Simple chat - no tool execution -> direct response
            await ws_manager.send_to_session(
                session_id=session_id,
                message= {
                    'type': 'agent',
                    'subtype': 'chat',
                    'status': 'complete',
                    'execution_id': execution_id,
                    'data': {''
                        'content': clean_LLM_replies(content),
                        'is_final': True
                    }
                },
                immediate=True
            )

        else:
            # Tool execution answer
            await ws_manager.send_agent_progress(
                session_id=session_id,
                execution_id=execution_id,
                progress_type='end',
                status='completed',
                data={
                    'summary': clean_LLM_replies(content)
                },
                immediate=True
            )

        return result

    async def stream(
        self,
        task_description: str,
        session_id: str,
        execution_id: int,
        initial_state: Optional[Dict[str, Any]] = None,
        passed_context:Optional[Any] = None,
        config:Optional[Any] = None
    ):
        """
        Stream agent execution with real-time updates
        
        Args:
            task_description: User's task description
            session_id: Session identifier
            execution_id: Execution identifier
            initial_state: Optional initial state
            context: Optional runtime context
            
        Yields:
            State updates as they occur
        """
        
        ws_manager=get_ws_manager()

        await ws_manager.send_agent_progress(
            session_id=session_id,
            execution_id=execution_id,
            progress_type='start',
            status='running',
            immediate=True
        )

        redis_key = f"inputData_{session_id}_{execution_id}"

        data_mng = InputDataManager(key=redis_key)
        data_mng._save(serialize_for_logging(initial_state))
        
        # Create context if not provided
        context = AIAssistantContext(
            session_id=session_id,
            execution_id=execution_id,
            category=self.category,
            redis_key=redis_key
        )

        await ws_manager.send_to_session(
            session_id=session_id,
            message={
                "type": "agent",
                "subtype": "stream",
                "status": "initialize",
                'execution_id': execution_id,
                "data": {"content": "", "is_final": False}
            }
        )

        initial_state = {
                "messages": [
                    {"role": "user", "content": task_description}
                ],
                "session_id": session_id,
                "execution_id": execution_id
            }
        
        """
        TODO: Double check streaming configuration throughout the messaging chain!
        """

        full_response = ""
        final_state = initial_state
        # Stream agent execution
        async for chunk in self.agent.astream(
           initial_state,
            config={
                "configurable": {
                    "thread_id": f"execution_{execution_id}"
                }
            },
            context=context,
            subgraphs= True,                           # include streams from child graphs
            print_mode=["updates", "messages-tuple"],  # Stream to console
            stream_mode=["updates", "messages-tuple"]  # Stream state updates
        ):
            
            namespace, mode, data = chunk
            
            if mode == "messages-tuple":
                message_chunk, metadata = data
                if message_chunk.get("content"):
                    token = message_chunk["content"]
                    full_response += token
                    
                    await ws_manager.send_to_session(
                        session_id=session_id,
                        message={
                            "type": "agent",
                            "subtype": "stream",
                            "status": "streaming",
                            'execution_id': execution_id,
                            "data": {"token": token, "is_final": False}
                        }
                    )

            elif mode == "updates":
                if final_state is None:
                    final_state = {}
                final_state.update(data)
                

        # Complete
        await ws_manager.send_to_session(
            session_id=session_id,
            message={
                "type": "agent",
                "subtype": "stream",
                "status": "complete",
                'execution_id': execution_id,
                "data": {"content": full_response, "is_final": True}
            }
        )

        return final_state

# ============================================================
# FACTORY FUNCTION
# ============================================================

def create_ai_assistant_agent(
    state_manager,
    category: Literal['shoes','wireless'],
    should_stream:bool = False,
    websocket_manager: Optional[Any] = None,
) -> AIAssistantAgent:
    """
    Factory function to create AI Assistant agent
    
    Args:
        state_manager: State manager for Redis synchronization
        websocket_manager: WebSocket manager for real-time updates
        db_uri: PostgreSQL connection string for checkpointing
        model: Model identifier (e.g., "openai:gpt-4o", "anthropic:claude-sonnet-4-5")
        temperature: Model temperature (0.0 = deterministic, 1.0 = creative)
        
    Returns:
        Configured AIAssistantAgent instance
        
    Example:
        # Create agent
        agent = create_ai_assistant_agent(
            state_manager=state_manager,
            websocket_manager=ws_manager,
            db_uri=settings.DATABASE_URL,
            model="openai:gpt-4o",
            temperature=0.0
        )
        
        # Run task
        result = await agent.run(
            task_description="Analyze headphones reviews for common complaints",
            session_id="session_123",
            execution_id=456
        )
    """
    return AIAssistantAgent(
        state_manager=state_manager,
        category=category,
        should_stream=should_stream,
        websocket_manager=websocket_manager
    )

# ============================================================
# TOOL WRAPERS
# ============================================================

async def handle_initial_message(state: AIAssistantState, tool_id: str = ""):
    """
    Sends decision message on what to do to the client via WebSocket
    """
    messages_dict = messages_to_dict(messages=state.get("messages", []))
    if not messages_dict:
        return
    
    last_message = messages_dict[-1]
    
    # Early return if not AI message or empty
    if last_message.get('type') != "ai" or not last_message.get('data', {}).get('content'):
        return
    
    
    msg_data = last_message.get('data', {})
    content = msg_data.get('content', '')
    
    # Lazy import + send
    from app.websocket.manager import get_ws_manager
    await get_ws_manager().send_agent_progress(
        session_id=state["session_id"],
        execution_id=state["execution_id"],
        progress_type='progress',
        status='decision',
        data={
            'decision': content
        },
        immediate=True
    )

def clean_LLM_replies(content:str) -> str:
    replacements = {
        # Column names
        "review_id": "'Review ID'",
        "product_id": "'Product ID'",
        "product_title": "'Product Title'",
        "star_rating": "'Star Rating'",
        "review_headline": "'Review Headline'",
        "review_body": "'Review Body'",
        "verified_purchase": "'Verified Purchase'",
        "helpful_votes": "'Helpful Votes'",
        "total_votes": "'Total Votes'",
        "customer_id": "'Customer ID'",
        # Operators
        "greater_or_equal": "greater or equal",
        "less_or_equal": "less or equal",
        "not_equals": "not equals",
        "starts_with": "starts with",
        "ends_with": "ends with"
    }
    # Tool names could get added
    # get_data, filtered_data, theme_extraction, analyze_data
    
    pattern = re.compile('|'.join(re.escape(k) for k in replacements.keys()))
    return pattern.sub(lambda m: replacements[m.group(0)], content)


async def execute_tool_workflow(
    tool_id: str,
    runtime: ToolRuntime,
    template_params: dict,
    limit: int = 200
) -> str:
    """Generic workflow executor for all tools"""
    from app.orchestrator.graphs.workflow_builder import WorkflowBuilderGraph
    from app.orchestrator.state_manager import state_manager
    from app.websocket.manager import get_ws_manager
    from app.orchestrator.graphs.shared_state import SharedWorkflowState
    
    state: AIAssistantState = runtime.state
    context: AIAssistantContext = runtime.context
    
    category = context.category

    # Handle initial message
    await handle_initial_message(state=state, tool_id=tool_id)
    
    # Get template
    template = get_template_by_id(
        template_id=tool_id, 
        category=category,
        limit=limit,
        **template_params  # Other params like filter_field, sort_field, etc.
    )
    workflow = template["workflow"]
    
    # Prepare initial state
    redis_key = context.redis_key or f"inputData_{state['session_id']}_{state['execution_id']}"
    data_mng = InputDataManager()
    redis_state = json.loads(data_mng.get(redis_key))
    initial_state = SharedWorkflowState(**redis_state)
    
    # Build and execute graph
    ws_manager = get_ws_manager()
    graph_builder = WorkflowBuilderGraph(state_manager=state_manager, websocket_manager=ws_manager)
    graph = graph_builder.build_graph(workflow)
    
    langsmith_config = get_langsmith_config(
        tool_name=tool_id,
        session_id=state["session_id"],
        execution_id=state["execution_id"],
        ws_manager=ws_manager,
        task_data={'workflow': workflow, 'category': category}
    )
    
    result = await graph.ainvoke(initial_state, config=langsmith_config)

    result = result or {}

    # Return summary
    total = result.get("record_store", {}).get("total", 0)

    return f"Successfully processed all records! Returned {min(limit, total)} of {total} records! Limit was set at {limit} records!"

@tool
async def get_data(
    runtime: ToolRuntime,
    sort_by: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"],
                    Field(description="Field to sort results by")] = 'star_rating',
    descending: Annotated[bool, Field(description="Sort in descending order")] = True,
    limit: Annotated[int, Field(ge=1, le=500, description="Maximum number of results to return (1-500)")] = 200
) -> dict[str, Any]:
    """
    Provide initial overview of category specific reviews.
    Reviews can be sorted and will default to 'star_rating' sort.
    Data will be cleaned and sorted by rating.
    """
    
    return await execute_tool_workflow(
        tool_id="get_data",
        runtime=runtime,
        template_params={
            "sort_field": sort_by, 
            "descending": descending
        },
        limit=limit
    )

@tool
async def filtered_data(
    field: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"], 
                    Field(description="Field name to filter on")],
    operator: Annotated[Literal['greater', 'less', 'greater_or_equal', 'less_or_equal',
                                'contains', 'equals', 'not_equals', 'starts_with', 'ends_with'],
                    Field(description="Comparison operator to apply")],
    value: Annotated[str | bool | int, Field(description="Value to compare against")],
    runtime: Annotated[ToolRuntime, Field(description="Runtime context for tool execution")],
    sort_by: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"],
                    Field(description="Field to sort results by")] = 'star_rating',
    descending: Annotated[bool, Field(description="Sort in descending order")] = True,
    limit: Annotated[int, Field(ge=1, le=500, description="Maximum number of results to return (1-500)")] = 200
) -> dict[str, Any]:    
    """
    Provide a filtered overview of category specific reviews.
    Reviews can be sorted and will default to 'star_rating' sort.
    Data will be cleaned and sorted by rating.
    """
    
    return await execute_tool_workflow(
        tool_id="filtered_data",
        runtime=runtime,
        template_params={
            "filter_field":field,
            "filter_operator": operator,
            "filter_value": value,
            "sort_field": sort_by, 
            "descending": descending
        },
        limit=limit
    )

@tool
async def theme_extraction(
    field: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"], 
                    Field(description="Field name to filter on")],
    operator: Annotated[Literal['greater', 'less', 'greater_or_equal', 'less_or_equal',
                                'contains', 'equals', 'not_equals', 'starts_with', 'ends_with'],
                    Field(description="Comparison operator to apply")],
    value: Annotated[str | bool | int, Field(description="Value to compare against")],
    runtime: Annotated[ToolRuntime, Field(description="Runtime context for tool execution")],
    number_of_themes: Annotated[int, Field(ge=1, le=5, description="Number of themes and insights/recommendations to extract (1-5)")] = 5,
    sort_by: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"],
                    Field(description="Field to sort results by")] = 'star_rating',
    descending: Annotated[bool, Field(description="Sort in descending order if True, else ascending")] = True,
    limit: Annotated[int, Field(ge=1, le=500, description="Maximum number of results to return (1-500)")] = 50
) -> dict[str, Any]:
    """
    Extract common themes among reviews of the selected category, also provides some basic statistical overviews. 
    Data needs to be filtered to reach managable set size. For best result data should be filtered by product ID or product title. 
    Data can also be sorted, but will default to standard sort."

    Results are automatically returned to user!

    If you are NOT explicitly looking for themes or statistics use tool 'filtered_data' instead!!
    """
    
    return await execute_tool_workflow(
        tool_id="theme_extraction",
        runtime=runtime,
        template_params={
            "filter_field":field,
            "filter_operator": operator,
            "filter_value": value,
            "number_of_themes": number_of_themes,
            "sort_field": sort_by, 
            "descending": descending
        },
        limit=limit
    )

@tool
async def analyze_data(
    field: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"], 
                    Field(description="Field name to filter on")],
    operator: Annotated[Literal['greater', 'less', 'greater_or_equal', 'less_or_equal',
                                'contains', 'equals', 'not_equals', 'starts_with', 'ends_with'],
                    Field(description="Comparison operator to apply")],
    value: Annotated[str | bool | int, Field(description="Value to compare against")],
    runtime: Annotated[ToolRuntime, Field(description="Runtime context for tool execution")],
    number_of_themes: Annotated[int, Field(ge=1, le=5, description="Number of themes and insights/recommendations to extract (1-5)")] = 5,
    sort_by: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"],
                    Field(description="Field to sort results by")] = 'star_rating',
    descending: Annotated[bool, Field(description="Sort in descending order")] = True,
    limit: Annotated[int, Field(ge=1, le=500, description="Maximum number of results to return (1-500)")] = 50
) -> dict[str, Any]:
    """
    Complete end-to-end analysis pipeline: Load reviews for a specific product, clean the data, perform comprehensive sentiment analysis with theme extraction, generate strategic insights across competitive positioning, customer experience, marketing, and product improvements, then display a detailed report including executive summary, themes, recommendations, and statistical metrics (sentiment distribution, rating patterns, verified purchase rates, theme coverage, and sentiment consistency).

    If you are NOT explicitly looking for a detailed analysis or are NOT looking for a executive summary use tools 'filtered_data' or 'theme_extraction' instead!!
    """

    return await execute_tool_workflow(
        tool_id="analyze_data",
        runtime=runtime,
        template_params={
            "filter_field":field,
            "filter_operator": operator,
            "filter_value": value,
            "number_of_themes": number_of_themes,
            "sort_field": sort_by, 
            "descending": descending
        },
        limit=limit
    )

from app.database import get_db_context
from app.schemas.reviews import to_study_format
from app.models.reviews import get_review_model
from sqlalchemy import asc, desc, func

TRUNCATE_PRODUCT = 50
TRUNCATE_HEAD = 100
TRUNCATE_BODY = 400

def build_query(
    db, model,
    *, field, operator, value,
    sort_by, descending,
    always_filter=None
):
    """Compact filtered/sorted query builder for PostgreSQL."""
    FIELDS = [
        "review_id", "product_id", "product_title", "star_rating",
        "review_headline", "review_body", "verified_purchase",
        "helpful_votes", "total_votes", "customer_id", "is_malformed"
    ]
    C = {f: getattr(model, f) for f in FIELDS}

    col = C[field]
    sort_col = C[sort_by]

    def is_text(c):
        try:
            return c.property.columns[0].type.python_type is str
        except Exception:
            return False

    def ilike(c, pattern):
        return c.ilike(pattern, escape="\\")

    # --- WHERE predicate ---
    if operator in {"greater", "less", "greater_or_equal", "less_or_equal"}:
        if is_text(col):
            raise ValueError(f"'{operator}' not valid for text column {field}")
        expr = {
            "greater": col.__gt__,
            "less": col.__lt__,
            "greater_or_equal": col.__ge__,
            "less_or_equal": col.__le__,
        }[operator](value)

    elif operator in {"equals", "not_equals"}:
        if is_text(col) and isinstance(value, str):
            left, right = func.lower(col), value.lower()
            expr = (left == right) if operator == "equals" else (left != right)
        else:
            expr = (col == value) if operator == "equals" else (col != value)

    elif operator in {"contains", "starts_with", "ends_with"}:
        if not is_text(col):
            raise ValueError(f"'{operator}' requires a text column ({field})")
        s = str(value)
        pattern = (
            f"%{s}%" if operator == "contains"
            else f"{s}%" if operator == "starts_with"
            else f"%{s}"
        )
        expr = ilike(col, pattern)
    else:
        raise ValueError(f"Unsupported operator: {operator}")

    # Base query
    q = db.query(model).filter(expr)

    # Always-on filters
    if always_filter:
        for k, v in always_filter.items():
            kc = C.get(k)
            if kc is None:
                raise ValueError(f"Unsupported always_filter column: {k}")
            if is_text(kc) and isinstance(v, str):
                q = q.filter(func.lower(kc) == v.lower())
            else:
                q = q.filter(kc == v)

    # Sorting (Postgres NULL-safe)
    order = desc(sort_col).nulls_last() if descending else asc(sort_col).nulls_first()
    return q.order_by(order, asc(model.review_id))
    
@tool 
async def get_data_overview_snippet(
    field: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"], 
                    Field(description="Field name to filter on")],
    operator: Annotated[Literal['greater', 'less', 'greater_or_equal', 'less_or_equal',
                                'contains', 'equals', 'not_equals', 'starts_with', 'ends_with'],
                    Field(description="Comparison operator to apply")],
    value: Annotated[str | bool | int, Field(description="Value to compare against")],
    runtime: ToolRuntime,
    sort_by: Annotated[Literal["review_id", "product_id", "product_title", "star_rating",
                            "review_headline", "review_body", "verified_purchase",
                            "helpful_votes", "total_votes", "customer_id"],
                    Field(description="Field to sort results by")] = 'star_rating',
    descending: Annotated[bool, Field(description="Sort in descending order")] = True,
    limit: Annotated[int, Field(ge=1, le=10, description="Maximum number of results to return (1-10)")] = 5
) -> dict[str, Any]:
    """
    View a brief data sample showing the dataset structure. This data needs to be passed to the user to be valuable!
    It can be used to get a better understanding of the data structure to help answer data structure related questions!
    Use filters for product-specific data.

    RETURN THE COMPLETE OUTPUT IN YOUR REPLY TO USER.

    Return:
      - `full_row`: one complete record (all columns) for quick schema understanding
      - `snippet`: up to `limit` filtered/sorted records with truncated long fields
      - `filteres_available`: rows available in the table for specified filter
      - `total_available`: total rows in the table
    """
    
    try:
        context: AIAssistantAgent = runtime.context  # type: ignore[name-defined]
        category = context.category

        with get_db_context() as db:
            model = get_review_model(category)

            # total (entire table)
            total_available = db.query(model).count()

            # build query
            query = build_query(
                db, model,
                field=field, operator=operator, value=value,
                sort_by=sort_by, descending=descending,
                always_filter={"is_malformed": False}
            )

            # count filtered (without pagination)
            filtered_available = query.order_by(None).count()

            # fetch only (limit + 1) filtered + sorted rows
            rows = query.limit(limit + 1).all()

            # Convert ORM → dicts
            study_dicts = [to_study_format(r).model_dump() for r in rows]

        # first = detailed row
        full_row = study_dicts[0] if study_dicts else None
        rest = study_dicts[1:] if len(study_dicts) > 1 else []

        # truncated snippet
        snippet = [{
            "product_id": r.get("product_id"),
            "product_title": (r.get("product_title") or "")[:TRUNCATE_PRODUCT],
            "star_rating": r.get("star_rating"),
            "review_headline": (r.get("review_headline") or "")[:TRUNCATE_HEAD],
            "review_body": (r.get("review_body") or "")[:TRUNCATE_BODY],
        } for r in rest]

        return {
            "full_row": full_row,
            "snippet": snippet,
            "total_available": total_available,
            "filtered_available": filtered_available,
        }

    except Exception as e:
        return {
            "error": str(e),
            "params": {
                "field": field,
                "operator": operator,
                "value": value,
                "sort_by": sort_by,
                "descending": descending,
                "limit": limit,
            },
        }


LANGCHAIN_TOOLS = [get_data, filtered_data, theme_extraction, analyze_data, get_data_overview_snippet]

# ============================================================
# HELPER FUNCTIONS
# ============================================================

class InputDataManager:
    def __init__(self, key: Optional[str] = None):
        import redis
        from app.configs.config import settings
        self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        self.ttl = 600  # 10 minutes (buffer for safety)
        self.key = key
    
    def save(self, key: str, data: dict):
        """Save and reset TTL"""
        self.redis_client.setex(key, self.ttl, json.dumps(data))

    def _save(self, data: dict):
        """Save and reset TTL"""
        self.redis_client.setex(self.key, self.ttl, json.dumps(data))
    
    def get(self, key: str) -> dict | None:
        """Get and extend TTL (keep alive during active use)"""
        data = self.redis_client.get(key)
        if data:
            self.redis_client.expire(key, self.ttl)  # Extend TTL
            return json.loads(data)
        return None
    
    def _get(self) -> dict | None:
        """Get and extend TTL (keep alive during active use)"""
        data = self.redis_client.get(self.key)
        if data:
            self.redis_client.expire(self.key, self.ttl)  # Extend TTL
            return json.loads(data)
        return None

def serialize_for_logging(obj: Any) -> str:
    """
    Serialize any object (including LangGraph states) to JSON string for logging.
    
    Usage:
        logger.info(serialize_for_logging(state))
    """
    return json.dumps(obj, cls=CustomJSONEncoder)

class CustomJSONEncoder(json.JSONEncoder):
    """JSON encoder that handles LangChain messages and other complex types."""
    
    def default(self, obj):
        # Handle LangChain messages
        if isinstance(obj, BaseMessage):
            return {
                "type": obj.__class__.__name__,
                "content": obj.content,
                "additional_kwargs": obj.additional_kwargs,
                "id": getattr(obj, "id", None),
            }
        
        # Handle datetime
        if isinstance(obj, datetime):
            return obj.isoformat()
        
        # Handle any object with __dict__
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        
        # Handle sets
        if isinstance(obj, set):
            return list(obj)
        
        # Fallback to string representation
        return str(obj)

def _log_to_file(data: dict | str, filename: str = None):
    """
    Log to a JSON file
    
    Args:
        data: Dictionary or JSON string to log
        filename: Optional custom filename (without .json extension)
    
    Returns:
        Path: Filepath where data was logged
    """
    from pathlib import Path
    from datetime import datetime

    try:
        # Create logs directory if it doesn't exist
        log_dir = Path("logs/tools_data")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename with timestamp if not provided
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"data_{timestamp}"
            
        if not filename.endswith('.json'):
            filename = f"{filename}.json"
        
        filepath = log_dir / filename
        
        # Write results to file
        with open(filepath, 'w', encoding='utf-8') as f:
            if isinstance(data, str):
                f.write(data)
            else:
                import json
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        return filepath
    
    except Exception as e:
        logger.error(f"Failed to log data to file: {e}")
        return None

def get_last_tool_message(messages):
    """Get the last ToolMessage from a list of messages"""
    for msg in reversed(messages):
        # Handle different message types
        if isinstance(msg, dict):
            if msg.get("type") == "ToolMessage":
                return msg
        elif hasattr(msg, "type"):
            if msg.type == "ToolMessage":
                return msg
        elif isinstance(msg, str):
            continue  # Skip strings
    return None

def serialize_state(state):
    serialized = state.copy()
    if 'messages' in serialized:
        serialized['messages'] = [
            message_to_dict(msg) if hasattr(msg, 'content') else msg
            for msg in serialized['messages']
        ]
    return serialized

def get_langsmith_config(
    tool_name: str,
    execution_id: int,
    session_id: str,
    ws_manager: Optional[Any],
    task_data:  Optional[Any]
) -> Dict[str, Any]:
    from app.configs.langsmith_config import create_run_config, should_trace_execution
    from app.orchestrator.llm.streaming_callbacks import get_callback_factory


    should_trace = should_trace_execution(settings.langsmith_sample_rate)

    streaming_callback = None
    if ws_manager:
        callback_factory = get_callback_factory()
        streaming_callback = callback_factory.create_callback(
            session_id=session_id,
            execution_id=execution_id,
            condition='ai_assistant',
            tool_name=tool_name
        )
    
    # Create LangSmith config
    langsmith_config = create_run_config(
        execution_id=execution_id,
        session_id=session_id,
        condition='ai_assistant',
        task_data=task_data,
        streaming_callback=streaming_callback,
        include_tracer=should_trace
    )

    return langsmith_config