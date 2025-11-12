# backend/app/orchestrator/tools/base_tool.py
"""
Base Tool with Timeout Protection

All tools should inherit from BaseTool to get:
- Automatic timeout protection
- Progress tracking
- Error handling
- Metrics collection
"""
import asyncio
import time
import logging
import re
import json
from html import unescape
from typing import TYPE_CHECKING, overload, Dict, Any, Optional, List, Union, Literal

from app.websocket.manager import WebSocketManager
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from langchain_core.tools.base import BaseTool as LangChainBaseTool

if TYPE_CHECKING:
    from app.orchestrator.llm.client_langchain import LangChainLLMClient


logger = logging.getLogger(__name__)

class ToolTimeoutError(Exception):
    """Raised when tool execution exceeds timeout"""
    def __init__(self, tool_name: str, timeout: int):
        self.tool_name = tool_name
        self.timeout = timeout
        self.message = f"{tool_name} timed out after {timeout}s"
        super().__init__(self.message)


class BaseTool(LangChainBaseTool):
    """
    Base class for all tools with timeout protection
    
    Features:
    - Automatic timeout handling
    - WebSocket progress updates
    - Error tracking
    - Execution metrics
    
    Example:
        class MyTool(BaseTool):
            def __init__(self):
                super().__init__(
                    name="My Tool",
                    timeout=300  # 5 minutes
                )
            
            async def _run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
                # Your tool logic here
                return {'success': True, 'data': result}
    """
    

    name: str = "Base Tool"
    tool_id: str = "base-tool"
    description: str = "Base tool description"
    default_timeout: int = 300
    allow_timeout_override: bool = True
    websocket_manager: Optional[Any] = None
    llm_client: Optional[Any] = None 
    
    # Metrics
    total_executions: int = 0
    total_successes: int = 0
    total_failures: int = 0
    total_timeouts: int = 0
    total_execution_time_ms: float = 0
    
    def __init__(self, **data):
        super().__init__(**data)
        logger.debug(
            f"Tool initialized: {self.name} "
            f"(timeout={self.default_timeout}s, override={self.allow_timeout_override})"
        )
    
    def set_websocket_manager(self, ws_manager):
        """Inject WebSocket manager for tool"""
        self.websocket_manager:WebSocketManager = ws_manager
        logger.debug(f"WebSocket manager injected into {self.name}")
    
    def set_llm_client(self, client):
        """Inject LLM client for AI-powered operations"""
        self.llm_client: LangChainLLMClient = client
        logger.info(f"LLM client injected into {self.name}")


# Convienience helpers
    # ========== OVERLOAD SIGNATURES ========== ↓

    @overload
    async def _call_llm(
        self,
        session_id: str,
        execution_id: int,
        condition: str,
        tool_name: str,
        *,
        messages: Union[List[BaseMessage], List[Dict[str, str]]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        step_number: Optional[int] = None,
        parsed: bool = False,
        verbosity: Optional[Literal["low", "medium", "high"]] = None,
        **kwargs
    ) -> dict:
        """Call LLM with pre-formatted messages"""
        ...

    @overload
    async def _call_llm(
        self,
        session_id: str,
        execution_id: int,
        condition: str,
        tool_name: str,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        step_number: Optional[int] = None,
        parsed: bool = False,
        verbosity: Optional[Literal["low", "medium", "high"]] = None,
        **kwargs
    ) -> dict:
        """Call LLM with system and user prompts"""
        ...

    @overload
    async def _call_llm(
        self,
        session_id: str,
        execution_id: int,
        condition: str,
        tool_name: str,
        *,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        step_number: Optional[int] = None,
        parsed: bool = False,
        verbosity: Optional[Literal["low", "medium", "high"]] = None,
        **kwargs
    ) -> dict:
        """Call LLM with only user prompt (no system prompt)"""
        ...

    # ========== ACTUAL IMPLEMENTATION ========== ↓

    async def _call_llm(
        self,
        session_id: str,
        execution_id: int,
        condition: str,
        tool_name: str,
        messages: List[BaseMessage] | List[Dict[str, str]] | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        step_number: int | None = None,
        parsed: bool = False,
        verbosity: Literal["low", "medium", "high"] = "low",
        reasoning_effort: Literal["minimal","low", "medium", "high"] = "low",
        **kwargs
    ) -> dict:
        """
        Helper to call LLM with streaming callback
        
        Supports two calling patterns:
        1. Pre-formatted messages: _call_llm(..., messages=[...])
        2. Individual prompts: _call_llm(..., system_prompt="...", user_prompt="...")
        
        Args:
            session_id: Session ID
            execution_id: Execution ID
            tool_name: Name of the tool making the call
            step_number: Current step number
            messages: Pre-formatted messages (LangChain BaseMessage or dict format)
            system_prompt: System prompt (used if messages not provided)
            user_prompt: User prompt (required if messages not provided)
            temperature: Temperature setting
            max_tokens: Max tokens
            verbosity: Verbosity level ('low', 'medium', 'high')
            **kwargs: Additional arguments passed to llm_client.chat_completion
            
        Returns:
            LLM response dict
            
        Raises:
            ValueError: If neither messages nor user_prompt provided, or if both approaches mixed
            
        Examples:
            # Using messages
            response = await self._call_llm(
                session_id=session_id,
                execution_id=execution_id,
                tool_name='sentiment_analysis',
                step_number=1,
                messages=[
                    SystemMessage(content="You are a sentiment analyzer"),
                    HumanMessage(content="Analyze this review...")
                ]
            )
            
            # Using prompts
            response = await self._call_llm(
                session_id=session_id,
                execution_id=execution_id,
                tool_name='sentiment_analysis',
                step_number=1,
                system_prompt="You are a sentiment analyzer",
                user_prompt="Analyze this review..."
            )
            
            # User prompt only
            response = await self._call_llm(
                session_id=session_id,
                execution_id=execution_id,
                tool_name='quick_task',
                step_number=1,
                user_prompt="Summarize this text..."
            )
        """

        from app.orchestrator.llm.streaming_callbacks import get_callback_factory

        # ========== VALIDATION ========== ↓
        # Must have either messages OR user_prompt (minimum)
        if messages is None and user_prompt is None:
            raise ValueError(
                "Must provide either 'messages' or at minimum 'user_prompt'. "
                f"Got: messages={messages is not None}, user_prompt={user_prompt is not None}"
            )
        
        # Can't mix both approaches
        if messages is not None and (system_prompt is not None or user_prompt is not None):
            raise ValueError(
                "Cannot provide both 'messages' and individual prompts. "
                "Use either 'messages' OR 'system_prompt'/'user_prompt'."
            )
        # ========== END VALIDATION ========== ↑
        
        # Build messages if using prompt approach
        if messages is None:
            messages = []
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            messages.append(HumanMessage(content=user_prompt))

        # Create streaming callback
        callback_factory = get_callback_factory()
        callback = callback_factory.create_callback(
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            tool_name=tool_name,
            step_number=step_number
        )
        
        from app.configs.config import settings
        # Call LLM with streaming
        response = await self.llm_client.chat_completion(
            tool_name=tool_name,
            messages=messages,
            callbacks=[callback],
            stream=settings.langchain_stream,
            temperature=temperature,
            max_tokens=max_tokens,
            verbosity=verbosity,
            reasoning_effort=reasoning_effort,
            session_id=session_id,
            **kwargs
        )

        if parsed:
           response = self._clean_llm_response(response)

        return response

    def _clean_llm_response(self, response:str) -> str:
         # Extract and parse JSON with robust cleaning
        try:
            content = response['content']
            
            # ========== STEP 1: Extract from markdown blocks ==========
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            # ========== STEP 2: Clean the content ==========
            content = self._clean_json_content(content)
            
            # ========== STEP 3: Parse JSON ==========
            response = json.loads(content)
            
        except KeyError as e:
            logger.error(f"Missing 'content' key in response: {e}")
            return {"error": "Invalid response structure"}
        except IndexError as e:
            logger.error(f"Failed to extract JSON from markdown: {e}")
            return {"error": "Malformed JSON markdown block"}
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}\nContent: {content[:500]}")
            return {"error": "Invalid JSON format"}
        except Exception as e:
            logger.error(f"Unexpected error parsing response: {e}")
            return {"error": "Parsing failed"}
        
        return response
            

    async def _call_llm_simple_forceNoReasoning(
        self,
        system_prompt:str,
        user_prompt:str, 
        model:str = None,
        max_tokens:int = 4096,
        parsed: bool = False,
    ):
        start_time = time.time()

        from app.configs.config import settings
        from langchain_openai import ChatOpenAI

        if not model:
            model = settings.llm_model

        messages = [
            {"role": "developer", "content": "# Juice: 0 !important"}, # this forces 0 reasoning tokens!
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        openAI = ChatOpenAI(
            api_key=settings.openai_api_key,
            model = model,
            max_tokens=max_tokens,
            verbosity='low',
            reasoning_effort='low',
        )
        result = await openAI.ainvoke(messages)

        elapsed_ms = int((time.time() - start_time) * 1000)

        response = {
            'content': result.content,
            'model': model,
            'latency_ms': elapsed_ms,
            'streamed': False,
            'cached': False
        }

        if parsed:
           response = self._clean_llm_response(response)

        return response


    @staticmethod
    def _clean_json_content(content: str) -> str:
        """
        Clean JSON content by removing trailing/leading garbage
        
        Handles cases like:
        - Trailing punctuation: {...}\n-
        - Leading text: "Here's the JSON: {...}"
        - Multiple JSON objects: {...}\n{...} (takes first)
        
        Args:
            content: Raw content string
            
        Returns:
            Cleaned JSON string ready for parsing
        """
        content = content.strip()
        
        # Find the start of JSON (first { or [)
        start_idx = -1
        for i, char in enumerate(content):
            if char in '{[':
                start_idx = i
                break
        
        if start_idx == -1:
            return content  # No JSON found, return as-is
        
        # Find the end of JSON by tracking brackets/braces
        bracket_count = 0
        brace_count = 0
        in_string = False
        escape_next = False
        end_idx = -1
        
        for i in range(start_idx, len(content)):
            char = content[i]
            
            # Handle escape sequences
            if escape_next:
                escape_next = False
                continue
            
            if char == '\\':
                escape_next = True
                continue
            
            # Track string state
            if char == '"':
                in_string = not in_string
                continue
            
            # Only count brackets outside strings
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0 and bracket_count == 0:
                        end_idx = i + 1
                        break
                elif char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1
                    if bracket_count == 0 and brace_count == 0:
                        end_idx = i + 1
                        break
        
        # Extract the clean JSON
        if end_idx > start_idx:
            return content[start_idx:end_idx].strip()
        
        # Fallback: couldn't find proper end, take from start to end
        return content[start_idx:].strip()



    def _log_to_file(self, data: dict, filename: str = None):
        """
        Log to a JSON file
        
        Args:
            data: Dictionary of data to log
            filename: Optional custom filename (without .json extension)
        
        Returns:
            Path: Filepath where data was logged
        """
        import json
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
            
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            log_data = {
                "timestamp": timestamp,
                "data": data
            }

            # Write results to file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Data logged to: {filepath}")
            return filepath
        
        except Exception as e:
            logger.info(f"Failed to log data to file: {e}")
            return None

    def _log_results_to_file(self, data: dict, add_timestamp: bool = False):
        """
        Log results data to a JSON file with class name prefix
        
        Args:
            data: Dictionary of results to log
        
        Returns:
            Path: Filepath where data was logged
        """
        from datetime import datetime
        
        class_name = self.__class__.__name__
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S") if add_timestamp else ""
        filename = f"{class_name}_results_{timestamp}" if add_timestamp else f"{class_name}_results"
        
        return self._log_to_file(data, filename)

    def _log_input_to_file(self, data: dict, add_timestamp: bool = False):
        """
        Log input data to a JSON file with class name prefix
        
        Args:
            data: Dictionary of input data to log
        
        Returns:
            Path: Filepath where data was logged
        """
        from datetime import datetime
        
        class_name = self.__class__.__name__
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S") if add_timestamp else ""
        filename = f"{class_name}_input_{timestamp}"
        
        return self._log_to_file(data, filename)


    def _sample_reviews_strategically(
        self, 
        reviews: List[Dict[str, Any]], 
        target_count: int
    ) -> List[Dict[str, Any]]:
        """Sample reviews maintaining rating distribution"""
        # Group by rating
        by_rating = {}
        for review in reviews:
            rating = review.get('star_rating', 3)
            if rating not in by_rating:
                by_rating[rating] = []
            by_rating[rating].append(review)
        
        # Calculate sampling proportions
        sampled = []
        for rating in sorted(by_rating.keys()):
            rating_reviews = by_rating[rating]
            proportion = len(rating_reviews) / len(reviews)
            sample_size = max(1, int(target_count * proportion))
            
            # Sample this rating group
            if len(rating_reviews) <= sample_size:
                sampled.extend(rating_reviews)
            else:
                import random
                sampled.extend(random.sample(rating_reviews, sample_size))
        
        return sampled[:target_count]
    
    def _sample_reviews_multi_strategically(
        self, 
        reviews: List[Dict[str, Any]], 
        target_count: int
    ) -> List[Dict[str, Any]]:
        """
        Sample reviews maintaining rating and length distributions.
        Stratification: Rating × Length (2 dimensions)
        Prioritizes longer reviews (avoids "Works." type reviews)
        """
        import random
        import math
        
        # Calculate length threshold
        avg_length = sum(len(r.get('review_body', '')) for r in reviews) / len(reviews)
        
        # Group by: rating and length (prioritize long reviews)
        long_groups = {}  # rating -> [long reviews]
        short_groups = {}  # rating -> [short reviews]
        
        for review in reviews:
            rating = review.get('star_rating', 3)
            is_long = len(review.get('review_body', '')) >= avg_length
            
            if is_long:
                if rating not in long_groups:
                    long_groups[rating] = []
                long_groups[rating].append(review)
            else:
                if rating not in short_groups:
                    short_groups[rating] = []
                short_groups[rating].append(review)
        
        # Calculate allocation per rating
        all_ratings = set(long_groups.keys()) | set(short_groups.keys())
        rating_counts = {
            rating: len(long_groups.get(rating, [])) + len(short_groups.get(rating, []))
            for rating in all_ratings
        }
        
        allocations = []
        total_allocated = 0
        
        for rating in all_ratings:
            proportion = rating_counts[rating] / len(reviews)
            ideal_size = target_count * proportion
            allocated = math.floor(ideal_size)
            
            allocations.append({
                'rating': rating,
                'long_reviews': long_groups.get(rating, []),
                'short_reviews': short_groups.get(rating, []),
                'allocated': allocated,
                'remainder': ideal_size - allocated
            })
            total_allocated += allocated
        
        # Distribute remaining slots
        remaining = target_count - total_allocated
        allocations.sort(key=lambda x: x['remainder'], reverse=True)
        
        for i in range(remaining):
            if i < len(allocations):
                total_available = len(allocations[i]['long_reviews']) + len(allocations[i]['short_reviews'])
                if allocations[i]['allocated'] < total_available:
                    allocations[i]['allocated'] += 1
        
        # Sample from each rating group (prioritize long reviews)
        sampled = []
        for allocation in allocations:
            long_reviews = allocation['long_reviews']
            short_reviews = allocation['short_reviews']
            needed = allocation['allocated']
            
            if needed == 0:
                continue
            
            # First: sample from long reviews
            if len(long_reviews) >= needed:
                sampled.extend(random.sample(long_reviews, needed))
            else:
                # Take all long reviews
                sampled.extend(long_reviews)
                remaining_needed = needed - len(long_reviews)
                
                # Then: fill with short reviews only if necessary
                if remaining_needed > 0 and short_reviews:
                    sampled.extend(random.sample(short_reviews, min(remaining_needed, len(short_reviews))))
        
        # Final shuffle and exact truncation
        random.shuffle(sampled)
        return sampled[:target_count]
    
    def _calculate_batches(self, total_reviews: int, batch_size: int, batch_padding: float = 0.0) -> List[tuple[int, int]]:
        """
        Calculate batch ranges with intelligent sizing
        
        If remaining reviews are ≤ (batch_size * (1 + batch_padding)), include them in last batch
        to avoid tiny final batches
        
        Args:
            total_reviews: Total number of reviews to batch
            batch_size: Target reviews per batch
            batch_padding: Tolerance ratio for final batch (0.1 = 10% padding)
        
        Returns: 
            List of (start_idx, end_idx) tuples
            
        Examples:
            batch_size=50, padding=0.1:
            - 100 reviews → [(0,50), (50,100)]
            - 110 reviews → [(0,50), (50,110)] ✓ (avoids 10-review batch)
            - 54 reviews → [(0,54)] ✓ (single batch)
        """
        batches = []
        idx = 0
        
        while idx < total_reviews:
            remaining = total_reviews - idx
            
            # If remaining is small enough, take it all in one batch
            if remaining <= batch_size * (1 + batch_padding):
                batches.append((idx, total_reviews))
                break
            else:
                batches.append((idx, idx + batch_size))
                idx += batch_size
        
        return batches

    def _strip_html(self, text: str) -> str:
        """Remove HTML tags and unescape HTML entities, preserving line breaks"""
        # Unescape HTML entities (&amp; → &, &lt; → <, etc.)
        text = unescape(text)
        # Convert <br>, <br/>, <br /> to newlines
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        # Convert block elements to newlines
        text = re.sub(r'</(p|div|h[1-6])>', '\n', text, flags=re.IGNORECASE)
        # Remove remaining HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Clean up excessive whitespace (but preserve single newlines)
        text = re.sub(r' +', ' ', text)  # Multiple spaces → single space
        text = re.sub(r'\n{3,}', '\n\n', text)  # 3+ newlines → 2 newlines
        return text.strip()

# START: Websocket Notification helpers
    
    # =====================================
    # LEVEL 1: Direct WebSocket Send (Maximum Flexibility)
    # =====================================
    
    async def _send_websocket(
        self,
        session_id: Optional[str],
        message: Dict[str, Any],
        priority: str = 'normal',
        immediate: bool = False,
        broadcast: Optional[bool] = None,
    ) -> bool:
        """
        Send WebSocket message (LOWEST LEVEL - Direct Access to WS Manager)
        
        Provides direct access to all WebSocket manager capabilities:
        - Custom message structure (no automatic fields added)
        - Priority control ('normal' or 'high')
        - Batching control (immediate=True bypasses batching)
        - Broadcast option (send to all connections vs first connection)
        
        Args:
            session_id: Session to send to (required)
            message: Complete message payload (sent as-is)
            priority: Message priority - 'normal' or 'high' (default: 'normal')
            immediate: Bypass batching, send immediately (default: False)
            broadcast: Send to all connections instead of just first (default: False)
            
        Returns:
            True if sent successfully, False otherwise
        
        Examples:
            # Basic send
            await self._send_websocket(session_id, {'type': 'custom', 'data': 'value'})
            
            # High priority, immediate
            await self._send_websocket(
                session_id, 
                {'type': 'critical_alert', 'message': 'Error!'},
                priority='high',
                immediate=True
            )
            
            # Broadcast to all tabs
            await self._send_websocket(
                session_id,
                {'type': 'sync', 'state': {...}},
                broadcast=True
            )
        """
        if not self.websocket_manager or not session_id:
            return False
        
        try:
            if broadcast or (not broadcast and self.websocket_manager.get_session_connection_count(session_id) > 1):
                # Send to ALL connections for this session
                await self.websocket_manager.broadcast_to_session(session_id, message)
            else:
                # Send to first connection (default)
                await self.websocket_manager.send_to_session(
                    session_id=session_id,
                    message=message,
                    priority=priority,
                    immediate=immediate
                )
            return True
            
        except Exception as e:
            logger.warning(
                f"Failed to send WebSocket message: {e}",
                extra={
                    'tool_name': self.name,
                    'session_id': session_id,
                    'message_type': message.get('type'),
                    'error': str(e)
                }
            )
            return False
    
    # =====================================
    # LEVEL 2: Structured Message Builder (Convenient + Flexible)
    # =====================================
    
    async def _send_tool_message(
        self,
        session_id: str,
        execution_id: int,
        condition: Literal['ai_assistant', 'workflow_builder'] | None,
        message_type:  Literal['start','progress','end', 'error'],
        status: Literal['start', 'running', 'completed', 'failed', 'exception'] | str | None,
        data: Optional[Dict[str, Any]] = {},
        priority: str = 'normal',
        immediate: bool = False,
        broadcast: Optional[bool] = None,
        add_tool_name: bool = True,
        add_timestamp: bool = True,
        **kwargs
    ) -> bool:
        """
        Send tool message with optional standard fields (MID LEVEL)
        
        Builds structured message with configurable automatic fields.
        All WebSocket manager features available.
        
        Args:
            session_id: Session to send to
            message_type: Message type (e.g., 'tool_progress', 'tool_error')
            execution_id: Execution ID (optional, auto-added if provided)
            priority: 'normal' or 'high' (default: 'normal')
            immediate: Bypass batching (default: False)
            broadcast: Send to all connections (default: False)
            add_tool_name: Auto-add 'tool_name' field (default: True)
            add_timestamp: Auto-add 'timestamp' field (default: True)
            **kwargs: Additional custom fields
            
        Returns:
            True if sent successfully
        
        Examples:
            # Minimal message
            await self._send_tool_message(
                session_id, 
                'data_loaded',
                records=1000
            )
            
            # Full control
            await self._send_tool_message(
                session_id,
                message_type='critical_update',
                execution_id=123,
                priority='high',
                immediate=True,
                broadcast=True,
                add_tool_name=True,
                add_timestamp=True,
                custom_field='value',
                nested={'data': 'structure'}
            )
            
            # Minimal with no auto-fields
            await self._send_tool_message(
                session_id,
                'clean_event',
                add_tool_name=False,
                add_timestamp=False,
                data='minimal'
            )
        """
        # Build message payload
        payload = {
            'type': 'tool',
            'subtype': message_type,
            }
        
        # Add optional standard fields
        if execution_id:
            payload['execution_id'] = execution_id
        if condition:
            payload['condition'] = condition
        if status:
            payload['status'] = status
        if add_tool_name:
            payload['tool_name'] = self.name
            payload['tool_id'] = self.tool_id
        if add_timestamp:
            payload['timestamp'] = time.time()        
        if data:
            payload['data'] = data
        

        # Add all custom fields
        payload.update(kwargs)
        
        # Send using base function
        return await self._send_websocket(
            session_id=session_id,            
            message=payload,
            priority=priority,
            immediate=immediate,
            broadcast=broadcast
        )
    
    # =====================================
    # LEVEL 3: Progress Tracking Helpers (High-Level Convenience)
    # =====================================
    
    async def _send_tool_status(
        self,
        session_id: str,
        execution_id: int,
        condition: Literal['ai_assistant', 'workflow_builder'],
        progress: int,
        message_type:  Literal['start','progress','end', 'error'],
        status: Literal['start', 'running', 'completed', 'failed', 'exception'] | str | None,
        step: str = None,
        message: str = None,
        data: Optional[Dict[str, Any]] = None,
        priority: str = 'normal',
        immediate: bool = False
    ) -> bool:
        """
        Send progress update (HIGH LEVEL - Progress Tracking)
        
        Standard progress tracking with all WebSocket options.
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            progress: Progress percentage (0-100, -1 for error)
            message: Progress message
            step: Current step name
            details: Additional details dict
            priority: 'normal' or 'high'
            immediate: Bypass batching
            
        Returns:
            True if sent successfully
        """
        kwargs = {'progress': progress}
        
        if message:
            data['message'] = message
        if step:
            kwargs['step_num'] = step
        
        return await self._send_tool_message(
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            message_type=message_type,
            status=status,
            data=data,
            priority=priority,
            immediate=immediate,
            **kwargs
        )
    
    async def _send_tool_start(
        self,
        session_id: str,
        execution_id: int,
        condition: Literal['ai_assistant', 'workflow_builder'],
        message: str | None = None,
        details: Dict[str, Any] = None,
        status: str | None = 'start',
        immediate: bool = False
    ) -> bool:
        """
        Send progress start notification
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            message: Start message (default: "{tool_name} starting...")
            total_steps: Total number of steps (optional)
            immediate: Bypass batching (default: False)
        """
        
        return await self._send_tool_status(
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            progress=0,
            message_type='start',
            status=status,
            message=message or f"{self.name} starting...",
            data=details,
            immediate=immediate
        )
    
    async def _send_tool_update(
        self,
        session_id: str,
        execution_id: int,
        condition: Literal['ai_assistant', 'workflow_builder'],
        progress: int | None = None,
        message: str | None = None,
        details: Dict[str, Any] = None,
        status: str | None = 'running',
        immediate: bool = False
    ) -> bool:
        """
        Send progress update (convenience wrapper)
        
        Always uses normal priority and batching for efficiency.
        """
        
        return await self._send_tool_status(
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            message_type='progress',
            status=status,
            progress=progress,
            message=message,
            data=details,
            priority='normal',
            immediate=immediate
        )
    
    async def _send_tool_complete(
        self,
        session_id: str,
        execution_id: int,
        condition: Literal['ai_assistant', 'workflow_builder'],
        message: str | None = None,
        details: Dict[str, Any] = {},
        status: str | None = 'completed',
        immediate: bool = False
    ) -> bool:
        """


        Send progress completion notification
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            message: Completion message (default: "{tool_name} complete")
            summary: Summary statistics
            immediate: Send immediately (default: True for completion)
        """

        data = {
            'success': details.pop('success', True),
            'results': details
        }

        return await self._send_tool_status(
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            message_type='end',
            status=status,
            progress=100,
            message=message or f"{self.name} complete",
            data=data,
            immediate=immediate
        )
    
    async def _send_tool_error(
        self,
        session_id: str,
        execution_id: int,
        condition: Literal['ai_assistant', 'workflow_builder'],
        error_message: str,
        error_type: str = None,
        details: Dict[str, Any] = {},
        status: str | None = 'failed',
        immediate: bool = True
    ) -> bool:
        """
        Send progress error notification
        
        Always high priority and immediate.
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            error_message: Error description
            error_type: Error type classification
            details: Additional error details
        """
        error_details = details
        error_details["success"] = details.pop('success', False)
        if error_message:
            error_details['error'] = error_message
        if error_type:
            error_details['error_type'] = error_type
        
        return await self._send_tool_status(
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            message_type='error',
            status=status,
            progress=-1,
            message=f"Error: {error_message}",
            data=error_details,
            priority='high',
            immediate=immediate
        )
    
    
    # =====================================
    # LEVEL 4: Broadcast Helpers (Multi-Tab Sync)
    # =====================================
    
    async def _broadcast_state_sync(
        self,
        session_id: str,
        execution_id: int,
        state_update: Dict[str, Any],
        immediate: bool = True
    ) -> bool:
        """
        Broadcast state update to all connections (multi-tab sync)
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            state_update: State changes to sync
            immediate: Send immediately (default: True for sync)
        """
        return await self._send_tool_message(
            session_id=session_id,
            message_type='state_sync',
            execution_id=execution_id,
            broadcast=True,
            immediate=immediate,
            state=state_update
        )

# END: Websocket Notification helpers
    
    def _extract_session_info(self, input_data: Dict[str, Any]) -> tuple[Optional[str], Optional[int]]:
        """
        Extract session_id and execution_id from input_data
        
        Supports both formats:
        1. NEW (top-level): input_data['session_id']
        2. OLD (nested): input_data['state']['session_id']
        
        Args:
            input_data: Tool input data
            
        Returns:
            Tuple of (session_id, execution_id)
        """
        # Try new format first (top-level) - PREFERRED
        session_id = input_data.get('session_id')
        execution_id = input_data.get('execution_id')
        condition = input_data.get('condition')
        
        # Fallback to legacy format (nested in 'state')
        if not session_id:
            state = input_data.get('state', {})
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            condition = state.get('condition')
            
            if session_id:
                logger.debug(
                    f"{self.name}: Using legacy nested 'state' format. "
                    "Consider passing session_id/execution_id at top level for better compatibility."
                )
        
        return session_id, execution_id, condition
    
    async def run(
        self,
        input_data: Dict[str, Any],
        timeout: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Execute tool with timeout protection
        
        Args:
            input_data: Tool input data
            timeout: Optional timeout override (seconds)
            
        Returns:
            Result dict with 'success', 'data', 'error', etc.
        """
        # Determine timeout
        if timeout and self.allow_timeout_override:
            effective_timeout = timeout
        else:
            effective_timeout = self.default_timeout
        
        # Update metrics
        self.total_executions += 1
        
        # Extract session info for progress updates
        session_id, execution_id, condition = self._extract_session_info(input_data)
        
        # Send tool start notification
        await self._send_tool_start(
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            details={
                'progress': 0,
                'timeout_seconds': effective_timeout                
            },
            status='tool_execution_start'
        )
        
        # Execute with timeout
        start_time = time.time()
        
        try:
            # Run tool with timeout protection
            result = await asyncio.wait_for(
                self._run(input_data),
                timeout=effective_timeout
            )
            
            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)
            self.total_execution_time_ms += execution_time_ms
            
            # Update metrics
            if result.get('success'):
                self.total_successes += 1
            else:
                self.total_failures += 1
            
            # Add execution time to result if not present
            if 'execution_time_ms' not in result:
                result['execution_time_ms'] = execution_time_ms
            
            # Send tool complete notification
            await self._send_tool_complete(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                details={
                    'success': result.get('success'),
                    'execution_time_ms': execution_time_ms
                },
                status='tool_execution_complete'
            )
            
            logger.info(
                f"{self.name} completed: {execution_time_ms}ms, success={result.get('success')}",
                extra={
                    'tool_name': self.name,
                    'execution_time_ms': execution_time_ms,
                    'success': result.get('success'),
                    'session_id': session_id,
                    'execution_id': execution_id
                }
            )
            
            return result
            
        except asyncio.TimeoutError:
            # Tool execution timeout
            self.total_timeouts += 1
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            logger.error(
                f"{self.name} TIMEOUT after {effective_timeout}s (actual: {execution_time_ms}ms)",
                extra={
                    'tool_name': self.name,
                    'timeout_seconds': effective_timeout,
                    'execution_time_ms': execution_time_ms,
                    'session_id': session_id,
                    'execution_id': execution_id
                }
            )
            
            # Send timeout notification
            await self._send_tool_message(
                session_id=session_id,
                message_type='tool_execution_timeout',
                execution_id=execution_id,
                timeout_seconds= effective_timeout,
                execution_time_ms= execution_time_ms
            )
            
            # Return timeout error
            return {
                'success': False,
                'error': 'timeout',
                'error_message': f'{self.name} execution timeout ({effective_timeout}s)',
                'error_type': 'ToolTimeoutError',
                'tool_name': self.name,
                'timeout_seconds': effective_timeout,
                'execution_time_ms': execution_time_ms,
                'data': None,
                'metadata': {
                    'timeout': True,
                    'recoverable': True  # Caller can retry
                }
            }
            
        except Exception as e:
            # Tool execution error
            self.total_failures += 1
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            logger.error(
                f"{self.name} error: {e.__class__.__name__}: {str(e)[:200]}",
                extra={
                    'tool_name': self.name,
                    'error_type': e.__class__.__name__,
                    'error_message': str(e)[:500],  # ✅ Increased from 200 to 500
                    'execution_time_ms': execution_time_ms,
                    'session_id': session_id,
                    'execution_id': execution_id
                },
                exc_info=True
            )
            
            # Send error notification
            await self._send_tool_message(
                session_id=session_id,
                message_type='tool_execution_error',
                execution_id=execution_id,
                error_type=e.__class__.__name__,
                error_message=str(e)[:200],
                execution_time_ms=execution_time_ms
            )
            
            # Return error result
            return {
                'success': False,
                'error': 'execution_error',
                'error_message': str(e),
                'error_type': e.__class__.__name__,
                'tool_name': self.name,
                'execution_time_ms': execution_time_ms,
                'data': None,
                'metadata': {
                    'timeout': False,
                    'recoverable': self._is_recoverable_error(e)
                }
            }
    
    def _is_recoverable_error(self, error: Exception) -> bool:
        """
        Determine if error is recoverable (can retry)
        
        Override in subclass for custom logic
        
        Args:
            error: Exception that occurred
            
        Returns:
            True if error is recoverable
        """
        # Default: network errors and timeouts are recoverable
        recoverable_types = (
            asyncio.TimeoutError,
            ConnectionError,
            TimeoutError,
        )
        
        return isinstance(error, recoverable_types)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get tool execution metrics"""
        avg_execution_time = (
            self.total_execution_time_ms / self.total_executions
            if self.total_executions > 0
            else 0
        )
        
        success_rate = (
            self.total_successes / self.total_executions * 100
            if self.total_executions > 0
            else 0
        )
        
        return {
            'tool_name': self.name,
            'total_executions': self.total_executions,
            'total_successes': self.total_successes,
            'total_failures': self.total_failures,
            'total_timeouts': self.total_timeouts,
            'success_rate': round(success_rate, 2),
            'avg_execution_time_ms': round(avg_execution_time, 2),
            'total_execution_time_ms': self.total_execution_time_ms,
            'default_timeout_seconds': self.default_timeout
        }
    
    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"name='{self.name}', "
            f"timeout={self.default_timeout}s, "
            f"executions={self.total_executions})"
        )


class ToolExecutionContext:
    """
    Context manager for tool execution with automatic cleanup
    
    Usage:
        async with ToolExecutionContext(tool, input_data) as ctx:
            result = await tool._run(input_data)
            ctx.set_result(result)
    """
    
    def __init__(self, tool: BaseTool, input_data: Dict[str, Any]):
        self.tool = tool
        self.input_data = input_data
        self.start_time = None
        self.result = None
        self.error = None
    
    async def __aenter__(self):
        self.start_time = time.time()
        logger.debug(f"Starting {self.tool.name} execution")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        execution_time = int((time.time() - self.start_time) * 1000)
        
        if exc_type:
            logger.error(
                f"{self.tool.name} failed after {execution_time}ms: "
                f"{exc_type.__name__}: {exc_val}"
            )
        else:
            logger.debug(
                f"{self.tool.name} completed in {execution_time}ms"
            )
        
        return False  # Don't suppress exceptions
    
    def set_result(self, result: Dict[str, Any]):
        """Set execution result"""
        self.result = result
