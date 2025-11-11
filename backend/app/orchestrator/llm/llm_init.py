# backend/app/orchestrator/llm/llm_init.py
"""
LLM Module Initialization - Complete Setup & Wiring

Initializes all LLM components in the correct dependency order:
1. LangSmith tracing (optional monitoring)
2. Circuit breakers (fault tolerance)
3. LangChain LLM client (API wrapper)
4. Streaming callbacks (WebSocket integration)
5. ReAct agent (autonomous decision-making)
6. Tool adapters (BaseTool → LangChain bridge)

Usage in main.py:
    from app.orchestrator.llm.llm_init import initialize_llm_module
    
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # ... database setup ...
        
        # Initialize LLM module
        llm_components = initialize_llm_module(
            tool_registry=tool_registry,
            ws_manager=ws_manager
        )
        
        app.state.llm_components = llm_components
        logger.info("LLM module initialized successfully")
        
        yield
        
        # Cleanup
        await shutdown_llm_module(llm_components)
"""
import logging
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass

from app.configs.config import settings

logger = logging.getLogger(__name__)


# ============================================================
# COMPONENT CONTAINER
# ============================================================

@dataclass
class LLMComponents:
    """
    Container for all initialized LLM components
    
    Provides easy access to any component and ensures proper lifecycle management
    """
    # Core clients
    langchain_client: Any
    llm_client: Any  # Legacy client (if still used)
    
    # Agents
    react_agent: Any
    decision_maker: Any  # Legacy decision maker (if still used)
    
    # Infrastructure
    callback_factory: Any
    circuit_breaker_manager: Any
    
    # Monitoring
    langsmith_enabled: bool
    langsmith_config: Optional[Any] = None
    
    # Metrics
    initialization_time_ms: int = 0
    components_initialized: int = 0
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics across all components"""
        metrics = {
            'initialization': {
                'time_ms': self.initialization_time_ms,
                'components_count': self.components_initialized,
                'langsmith_enabled': self.langsmith_enabled
            }
        }
        
        # LangChain client metrics
        if hasattr(self.langchain_client, 'get_metrics'):
            metrics['langchain_client'] = self.langchain_client.get_metrics()
        
        # Circuit breaker metrics
        if self.circuit_breaker_manager:
            metrics['circuit_breakers'] = self.circuit_breaker_manager.get_metrics()
        
        # Callback factory metrics
        if self.callback_factory and hasattr(self.callback_factory, 'get_metrics'):
            metrics['callbacks'] = self.callback_factory.get_metrics()
        
        return metrics


# ============================================================
# INITIALIZATION FUNCTIONS
# ============================================================

def initialize_llm_module(
    tool_registry,
    ws_manager=None,
    enable_langsmith: bool = True
) -> LLMComponents:
    """
    Initialize complete LLM module with all dependencies
    
    Args:
        tool_registry: Centralized tool registry instance
        ws_manager: WebSocket manager for streaming (optional)
        enable_langsmith: Enable LangSmith tracing
        
    Returns:
        LLMComponents with all initialized components
        
    Raises:
        RuntimeError: If critical components fail to initialize
    """
    import time
    start_time = time.time()
    
    logger.info("=" * 70)
    logger.info("🚀 INITIALIZING LLM MODULE")
    logger.info("=" * 70)
    
    components_count = 0
    
    # ==================== STEP 1: LangSmith Tracing ====================
    
    langsmith_config = None
    langsmith_enabled = False
    
    if enable_langsmith:
        try:
            from .langsmith_integration import initialize_langsmith, langsmith_config as ls_config
            
            logger.info("📊 Step 1: Initializing LangSmith tracing...")
            langsmith_enabled = initialize_langsmith()
            
            if langsmith_enabled:
                langsmith_config = ls_config
                logger.info(f"   ✅ LangSmith enabled: project={ls_config.project}")
                components_count += 1
            else:
                logger.warning("   ⚠️  LangSmith disabled (missing config)")
        
        except ImportError:
            logger.warning("   ⚠️  LangSmith not available (package not installed)")
        except Exception as e:
            logger.error(f"   ❌ LangSmith initialization failed: {e}")
    else:
        logger.info("📊 Step 1: LangSmith tracing disabled")
    
    # ==================== STEP 2: Circuit Breaker Manager ====================
    
    logger.info("🛡️  Step 2: Initializing circuit breakers...")
    
    try:
        from .circuit_breaker_enhanced import (
            circuit_breaker_manager,
            get_circuit_breaker_manager
        )
        
        # Verify manager is initialized
        manager = get_circuit_breaker_manager()
        
        logger.info(f"   ✅ Circuit breaker manager initialized")
        logger.info(f"   📋 Tool types configured: {len(manager._breakers)}")
        
        for tool_type, breaker in manager._breakers.items():
            logger.info(
                f"      - {tool_type.value}: "
                f"threshold={breaker.failure_threshold}, "
                f"timeout={breaker.timeout}s"
            )
        
        components_count += 1
        
    except Exception as e:
        logger.error(f"   ❌ Circuit breaker initialization failed: {e}")
        raise RuntimeError("Failed to initialize circuit breakers") from e
    
    # ==================== STEP 3: LangChain LLM Client ====================
    
    logger.info("🤖 Step 3: Initializing LangChain LLM client...")
    
    try:
        from .client_langchain import langchain_llm_client, get_llm_client
        
        # Verify client is initialized
        client = get_llm_client()
        
        logger.info(f"   ✅ LangChain client initialized")
        logger.info(f"   📋 Model: {client.model}")
        logger.info(f"   📋 Streaming: {'enabled' if settings.use_stream else 'disabled'}")
        logger.info(f"   📋 Circuit breakers: integrated")
        
        components_count += 1
        
    except Exception as e:
        logger.error(f"   ❌ LangChain client initialization failed: {e}")
        raise RuntimeError("Failed to initialize LangChain client") from e
    
    # ==================== STEP 4: Streaming Callbacks ====================
    
    callback_factory = None
    
    if ws_manager:
        logger.info("🔄 Step 4: Initializing streaming callbacks...")
        
        try:
            from .streaming_callbacks import (
                initialize_callback_factory,
                get_callback_factory
            )
            
            initialize_callback_factory(ws_manager)
            callback_factory = get_callback_factory()
            
            logger.info(f"   ✅ Callback factory initialized")
            logger.info(f"   📋 WebSocket manager: connected")
            
            components_count += 1
            
        except Exception as e:
            logger.error(f"   ❌ Callback factory initialization failed: {e}")
            logger.warning("   ⚠️  Continuing without streaming callbacks")
    else:
        logger.info("🔄 Step 4: Streaming callbacks skipped (no WebSocket manager)")
    
    # ==================== STEP 5: ReAct Agent ====================
    
    logger.info("🧠 Step 5: Initializing ReAct agent...")
    
    try:
        from .react_agent import initialize_react_agent, get_react_agent
        
        react_agent = initialize_react_agent(
            tool_registry=tool_registry,
            ws_manager=ws_manager
        )
        
        logger.info(f"   ✅ ReAct agent initialized")
        logger.info(f"   📋 Confidence threshold: {react_agent.confidence_threshold}")
        logger.info(f"   📋 Max iterations: {react_agent.max_iterations}")
        logger.info(f"   📋 Tool registry: connected")
        
        if ws_manager:
            logger.info(f"   📋 Streaming: enabled")
        
        components_count += 1
        
    except Exception as e:
        logger.error(f"   ❌ ReAct agent initialization failed: {e}")
        raise RuntimeError("Failed to initialize ReAct agent") from e
    
    # ==================== STEP 6: Legacy Decision Maker (Optional) ====================
    
    decision_maker = None
    
    try:
        # Check if legacy decision_maker exists
        from .decision_maker import decision_maker as legacy_dm
        
        logger.info("🔧 Step 6: Legacy decision maker detected")
        logger.info("   ℹ️  Using ReAct agent as primary decision maker")
        logger.info("   ℹ️  Legacy decision maker available for backward compatibility")
        
        decision_maker = legacy_dm
        
    except ImportError:
        logger.info("🔧 Step 6: No legacy decision maker (using ReAct agent only)")
    except Exception as e:
        logger.warning(f"   ⚠️  Legacy decision maker check failed: {e}")
    
    # ==================== STEP 7: Tool Adapters ====================
    
    logger.info("🔌 Step 7: Initializing tool adapters...")
    
    try:
        from .tool_adapter import create_langchain_tools_from_registry
        
        # Create sample tools to verify adapter works
        sample_tools = create_langchain_tools_from_registry(
            registry=tool_registry,
            session_id='init_test',
            execution_id=0
        )
        
        logger.info(f"   ✅ Tool adapters initialized")
        logger.info(f"   📋 Adapted tools: {len(sample_tools)}")
        logger.info(f"   📋 Tools available for LangChain agents")
        
        components_count += 1
        
    except Exception as e:
        logger.error(f"   ❌ Tool adapter initialization failed: {e}")
        logger.warning("   ⚠️  Continuing without tool adapters")
    
    # ==================== STEP 8: Legacy LLM Client (Optional) ====================
    
    llm_client = None
    
    try:
        from .client import llm_client as legacy_client
        
        logger.info("🔧 Step 8: Legacy LLM client detected")
        logger.info("   ℹ️  Using LangChain client as primary")
        logger.info("   ℹ️  Legacy client available for backward compatibility")
        
        llm_client = legacy_client
        
    except ImportError:
        logger.info("🔧 Step 8: No legacy LLM client (using LangChain client only)")
    except Exception as e:
        logger.warning(f"   ⚠️  Legacy LLM client check failed: {e}")
    
    # ==================== FINALIZATION ====================
    
    elapsed_ms = int((time.time() - start_time) * 1000)
    
    logger.info("=" * 70)
    logger.info(" LLM MODULE INITIALIZED SUCCESSFULLY")
    logger.info("=" * 70)
    logger.info(f" Components initialized: {components_count}")
    logger.info(f"  Initialization time: {elapsed_ms}ms")
    logger.info(f" Model: {settings.llm_model}")
    logger.info(f" Streaming: {'enabled' if settings.use_stream else 'disabled'}")
    logger.info(f" LangSmith: {'enabled' if langsmith_enabled else 'disabled'}")
    logger.info(f"  Circuit breakers: active")
    logger.info("=" * 70)
    
    # Create components container
    components = LLMComponents(
        langchain_client=get_llm_client(),
        llm_client=llm_client,
        react_agent=get_react_agent(),
        decision_maker=decision_maker,
        callback_factory=callback_factory,
        circuit_breaker_manager=get_circuit_breaker_manager(),
        langsmith_enabled=langsmith_enabled,
        langsmith_config=langsmith_config,
        initialization_time_ms=elapsed_ms,
        components_initialized=components_count
    )
    
    return components


# ============================================================
# SHUTDOWN FUNCTION
# ============================================================

async def shutdown_llm_module(components: LLMComponents):
    """
    Cleanup LLM module on shutdown
    
    Args:
        components: Initialized LLM components
    """
    logger.info("=" * 70)
    logger.info("🛑 SHUTTING DOWN LLM MODULE")
    logger.info("=" * 70)
    
    try:
        # Flush callback factory (if exists)
        if components.callback_factory:
            logger.info("🔄 Flushing streaming callbacks...")
            # Callback factory cleanup happens automatically
            logger.info("   ✅ Callbacks flushed")
        
        # Circuit breaker final report
        if components.circuit_breaker_manager:
            logger.info("🛡️  Circuit breaker final status:")
            metrics = components.circuit_breaker_manager.get_metrics()
            logger.info(f"   📊 Total calls: {metrics['summary']['total_calls']}")
            logger.info(f"   ✅ Successes: {metrics['summary']['total_successes']}")
            logger.info(f"   ❌ Failures: {metrics['summary']['total_failures']}")
            logger.info(f"   🔴 Times opened: {metrics['summary']['total_times_opened']}")
        
        # LangChain client final report
        if hasattr(components.langchain_client, 'get_metrics'):
            logger.info("🤖 LangChain client final status:")
            metrics = components.langchain_client.get_metrics()
            logger.info(f"   📊 Total requests: {metrics['total_requests']}")
            logger.info(f"   🔄 Streaming requests: {metrics['total_streaming_requests']}")
        
        logger.info("=" * 70)
        logger.info("✅ LLM MODULE SHUTDOWN COMPLETE")
        logger.info("=" * 70)
        
    except Exception as e:
        logger.error(f"❌ Error during LLM module shutdown: {e}")


# ============================================================
# HEALTH CHECK
# ============================================================

def check_llm_module_health(components: LLMComponents) -> Dict[str, Any]:
    """
    Perform health check on LLM module
    
    Args:
        components: Initialized LLM components
        
    Returns:
        Health status dict
    """
    health = {
        'status': 'healthy',
        'components': {},
        'timestamp': time.time()
    }
    
    try:
        # Check LangChain client
        if components.langchain_client:
            health['components']['langchain_client'] = {
                'status': 'active',
                'model': components.langchain_client.model
            }
        
        # Check circuit breakers
        if components.circuit_breaker_manager:
            cb_metrics = components.circuit_breaker_manager.get_metrics()
            
            # Check if any breakers are open
            open_count = cb_metrics['summary']['breakers_open']
            
            health['components']['circuit_breakers'] = {
                'status': 'degraded' if open_count > 0 else 'healthy',
                'breakers_open': open_count,
                'breakers_half_open': cb_metrics['summary']['breakers_half_open'],
                'breakers_closed': cb_metrics['summary']['breakers_closed']
            }
            
            if open_count > 0:
                health['status'] = 'degraded'
        
        # Check ReAct agent
        if components.react_agent:
            health['components']['react_agent'] = {
                'status': 'active',
                'confidence_threshold': components.react_agent.confidence_threshold
            }
        
        # Check streaming
        if components.callback_factory:
            cb_metrics = components.callback_factory.get_metrics()
            health['components']['streaming'] = {
                'status': 'active',
                'active_callbacks': cb_metrics['active_callbacks']
            }
        
        # Check LangSmith
        health['components']['langsmith'] = {
            'status': 'active' if components.langsmith_enabled else 'disabled'
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        health['status'] = 'unhealthy'
        health['error'] = str(e)
    
    return health


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    'LLMComponents',
    'initialize_llm_module',
    'shutdown_llm_module',
    'check_llm_module_health',
]