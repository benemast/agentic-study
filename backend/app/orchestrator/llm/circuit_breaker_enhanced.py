# backend/app/orchestrator/llm/circuit_breaker_enhanced.py
"""
Enhanced Circuit Breaker with Per-Tool-Type Configuration

Extends existing circuit breaker with operation-aware thresholds:
- DECISION: Critical path, low tolerance (3 failures)
- DATA: Medium tolerance (5 failures)
- ANALYSIS: High tolerance for batches (5 failures, longer timeout)
- GENERATION: Low tolerance, expensive (2 failures)
- OUTPUT: Medium tolerance (5 failures)
"""
import asyncio
import time
import logging
from typing import Dict, Any, Optional, Callable
from enum import Enum
from datetime import datetime

from .circuit_breaker import CircuitBreaker, CircuitBreakerOpen

logger = logging.getLogger(__name__)


class ToolType(str, Enum):
    """Tool type categories for circuit breaker configuration"""
    DECISION = "decision"
    DATA = "data"
    ANALYSIS = "analysis"
    GENERATION = "generation"
    OUTPUT = "output"


# ============================================================
# TOOL TYPE CONFIGURATION
# ============================================================

TOOL_TYPE_CONFIG: Dict[ToolType, Dict[str, Any]] = {
    ToolType.DECISION: {
        'description': 'Decision-making (critical path)',
        'tools': ['decision_maker'],
        'circuit_breaker': {
            'failure_threshold': 3,
            'timeout': 60,
            'half_open_max_calls': 2,
            'success_threshold': 2
        }
    },
    ToolType.DATA: {
        'description': 'Data operations',
        'tools': ['load_reviews', 'filter_reviews', 'sort_reviews', 'data_cleaner', 'combine_data'],
        'circuit_breaker': {
            'failure_threshold': 5,
            'timeout': 90,
            'half_open_max_calls': 3,
            'success_threshold': 2
        }
    },
    ToolType.ANALYSIS: {
        'description': 'Analysis operations (batch processing)',
        'tools': ['review_sentiment_analysis', 'sentiment_analysis'],
        'circuit_breaker': {
            'failure_threshold': 5,
            'timeout': 120,  # Longer for batch operations
            'half_open_max_calls': 3,
            'success_threshold': 2
        }
    },
    ToolType.GENERATION: {
        'description': 'Generation operations (expensive)',
        'tools': ['generate_insights'],
        'circuit_breaker': {
            'failure_threshold': 2,  # Low tolerance for expensive ops
            'timeout': 90,
            'half_open_max_calls': 2,
            'success_threshold': 2
        }
    },
    ToolType.OUTPUT: {
        'description': 'Output formatting',
        'tools': ['show_results','chat'],
        'circuit_breaker': {
            'failure_threshold': 5,
            'timeout': 60,
            'half_open_max_calls': 3,
            'success_threshold': 2
        }
    }
}


# ============================================================
# TOOL TYPE MAPPER
# ============================================================

class ToolTypeMapper:
    """Maps tool names to tool types for circuit breaker selection"""
    
    def __init__(self):
        # Build reverse lookup: tool_name -> tool_type
        self._tool_to_type: Dict[str, ToolType] = {}
        
        for tool_type, config in TOOL_TYPE_CONFIG.items():
            for tool_name in config['tools']:
                self._tool_to_type[tool_name] = tool_type
        
        logger.info(
            f"ToolTypeMapper initialized: {len(self._tool_to_type)} tools mapped "
            f"across {len(TOOL_TYPE_CONFIG)} types"
        )
    
    def get_tool_type(self, tool_name: str) -> ToolType:
        """
        Get tool type for a given tool name
        
        Args:
            tool_name: Tool identifier (e.g., 'review_sentiment_analysis')
            
        Returns:
            ToolType enum
            
        Defaults to DATA if tool not found
        """
        tool_type = self._tool_to_type.get(tool_name, ToolType.DATA)
        
        if tool_name not in self._tool_to_type:
            logger.warning(
                f"Tool '{tool_name}' not in type mapping, defaulting to {tool_type.value}"
            )
        
        return tool_type
    
    def get_config(self, tool_type: ToolType) -> Dict[str, Any]:
        """Get full configuration for a tool type"""
        return TOOL_TYPE_CONFIG.get(tool_type, TOOL_TYPE_CONFIG[ToolType.DATA])


# ============================================================
# ENHANCED CIRCUIT BREAKER MANAGER
# ============================================================

class CircuitBreakerManager:
    """
    Manages multiple circuit breakers (one per tool type)
    
    Features:
    - Per-tool-type circuit breakers
    - Operation-aware thresholds
    - Unified metrics across all breakers
    - Lazy initialization
    
    Usage:
        manager = CircuitBreakerManager()
        
        # Automatically selects correct circuit breaker
        result = await manager.call(
            tool_name='review_sentiment_analysis',
            func=llm_function,
            *args,
            **kwargs
        )
    """
    
    def __init__(self):
        self.mapper = ToolTypeMapper()
        self._breakers: Dict[ToolType, CircuitBreaker] = {}
        
        # Initialize all circuit breakers
        for tool_type, config in TOOL_TYPE_CONFIG.items():
            cb_config = config['circuit_breaker']
            
            self._breakers[tool_type] = CircuitBreaker(
                failure_threshold=cb_config['failure_threshold'],
                timeout=cb_config['timeout'],
                half_open_max_calls=cb_config['half_open_max_calls'],
                success_threshold=cb_config['success_threshold']
            )
            
            logger.info(
                f"Circuit breaker created for {tool_type.value}: "
                f"threshold={cb_config['failure_threshold']}, "
                f"timeout={cb_config['timeout']}s"
            )
    
    def get_breaker(self, tool_name: str) -> CircuitBreaker:
        """
        Get appropriate circuit breaker for a tool
        
        Args:
            tool_name: Tool identifier
            
        Returns:
            CircuitBreaker instance
        """
        tool_type = self.mapper.get_tool_type(tool_name)
        return self._breakers[tool_type]
    
    async def call(
        self,
        tool_name: str,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with appropriate circuit breaker protection
        
        Args:
            tool_name: Tool identifier (determines which breaker to use)
            func: Async function to call
            *args, **kwargs: Arguments for function
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerOpen: If circuit is open
            Exception: Original exception from function
        """
        breaker = self.get_breaker(tool_name)
        tool_type = self.mapper.get_tool_type(tool_name)
        
        try:
            return await breaker.call(func, *args, **kwargs)
        except CircuitBreakerOpen as e:
            # Enhance error with tool context
            logger.error(
                f"Circuit breaker OPEN for {tool_name} ({tool_type.value}): {e.message}"
            )
            raise CircuitBreakerOpen(
                f"Circuit breaker open for {tool_type.value} operations: {e.message}"
            )
    
    def get_state(self, tool_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get circuit breaker state
        
        Args:
            tool_name: Optional tool name to get specific breaker state
            
        Returns:
            State dict (single breaker or all breakers)
        """
        if tool_name:
            breaker = self.get_breaker(tool_name)
            tool_type = self.mapper.get_tool_type(tool_name)
            return {
                'tool_name': tool_name,
                'tool_type': tool_type.value,
                **breaker.get_state()
            }
        
        # Return all breakers
        return {
            tool_type.value: breaker.get_state()
            for tool_type, breaker in self._breakers.items()
        }
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics across all circuit breakers"""
        metrics = {
            'breakers': {},
            'summary': {
                'total_calls': 0,
                'total_failures': 0,
                'total_successes': 0,
                'total_times_opened': 0,
                'breakers_open': 0,
                'breakers_half_open': 0,
                'breakers_closed': 0
            }
        }
        
        for tool_type, breaker in self._breakers.items():
            state = breaker.get_state()
            metrics['breakers'][tool_type.value] = state
            
            # Aggregate summary
            metrics['summary']['total_calls'] += state['total_calls']
            metrics['summary']['total_failures'] += state['total_failures']
            metrics['summary']['total_successes'] += state['total_successes']
            metrics['summary']['total_times_opened'] += state['times_opened']
            
            # Count states
            if state['state'] == 'open':
                metrics['summary']['breakers_open'] += 1
            elif state['state'] == 'half_open':
                metrics['summary']['breakers_half_open'] += 1
            else:
                metrics['summary']['breakers_closed'] += 1
        
        return metrics
    
    async def force_open(self, tool_name: str):
        """Manually open circuit breaker for a tool"""
        breaker = self.get_breaker(tool_name)
        await breaker.force_open()
        logger.warning(f"Circuit breaker manually opened for {tool_name}")
    
    async def force_close(self, tool_name: str):
        """Manually close circuit breaker for a tool (use with caution!)"""
        breaker = self.get_breaker(tool_name)
        await breaker.force_close()
        logger.warning(f"Circuit breaker manually closed for {tool_name}")


# ============================================================
# GLOBAL INSTANCE
# ============================================================

# Singleton instance
circuit_breaker_manager = CircuitBreakerManager()


def get_circuit_breaker_manager() -> CircuitBreakerManager:
    """Get global circuit breaker manager instance"""
    return circuit_breaker_manager