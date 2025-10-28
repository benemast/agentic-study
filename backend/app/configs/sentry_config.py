# backend/app/configs/sentry_config.py
"""
Sentry configuration and initialization
Centralized error tracking setup with enhanced context
"""
import os
import logging
import traceback
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.openai import OpenAIIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.langchain import LangchainIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


# ============================================================
# SENTRY HOOKS
# ============================================================

def before_send(event, hint):
    """
    Enhanced before_send hook to add comprehensive context to ALL errors
    This runs automatically for every error captured by Sentry
    """
    try:
        # Add exception details if available
        if 'exc_info' in hint:
            exc_type, exc_value, exc_tb = hint['exc_info']
            
            # Add exception type and message
            event.setdefault('tags', {})
            event['tags']['exception_type'] = exc_type.__name__
            
            # Extract the function/module where error occurred
            if exc_tb:
                frame = traceback.extract_tb(exc_tb)[-1]
                event['tags']['error_file'] = frame.filename.split('/')[-1]
                event['tags']['error_function'] = frame.name
                event['tags']['error_line'] = frame.lineno
                
                # Add full traceback to extra context
                event.setdefault('extra', {})
                event['extra']['full_traceback'] = ''.join(traceback.format_tb(exc_tb))
                event['extra']['error_location'] = f"{frame.filename}:{frame.lineno} in {frame.name}"
        
        # Add request context if available
        if 'request' in event.get('contexts', {}):
            request_data = event['contexts']['request']
            event.setdefault('tags', {})
            
            # Add useful request tags
            if 'url' in request_data:
                event['tags']['request_path'] = request_data.get('url', '').split('?')[0]
            if 'method' in request_data:
                event['tags']['request_method'] = request_data.get('method')
        
        # Add database context for SQLAlchemy errors
        if 'sqlalchemy' in str(event.get('exception', {}).get('values', [{}])[0].get('type', '')).lower():
            event.setdefault('tags', {})
            event['tags']['error_category'] = 'database'
            event['tags']['database_error'] = True
        
        # Add OpenAI context for API errors
        if 'openai' in str(event.get('exception', {}).get('values', [{}])[0].get('type', '')).lower():
            event.setdefault('tags', {})
            event['tags']['error_category'] = 'openai_api'
            event['tags']['external_api_error'] = True
        
        # Add WebSocket context
        if 'websocket' in str(event.get('transaction', '')).lower():
            event.setdefault('tags', {})
            event['tags']['error_category'] = 'websocket'
            event['tags']['realtime_communication'] = True
        
        # Better error grouping via fingerprints
        if 'exception' in event:
            exc_values = event['exception'].get('values', [])
            if exc_values:
                exc_type = exc_values[0].get('type', 'Unknown')
                exc_module = exc_values[0].get('module', 'unknown')
                
                # Create fingerprint for better grouping
                event['fingerprint'] = [
                    exc_type,
                    exc_module,
                    event.get('tags', {}).get('error_function', 'unknown')
                ]
        
    except Exception as e:
        # Don't let before_send errors break error reporting
        logger.error(f"Error in Sentry before_send: {e}")
    
    return event


def before_breadcrumb(crumb, hint):
    """
    Enhanced breadcrumb filtering and enrichment
    Automatically adds context to breadcrumbs for better debugging
    """
    try:
        # Enrich HTTP breadcrumbs
        if crumb.get('category') in ['httplib', 'requests', 'httpx']:
            if 'data' in crumb:
                # Add more descriptive info
                url = crumb['data'].get('url', '')
                method = crumb['data'].get('method', 'GET')
                status = crumb['data'].get('status_code', '')
                
                crumb['message'] = f"{method} {url} → {status}"
                
                # Tag OpenAI API calls specifically
                if 'openai.com' in url:
                    crumb['data']['external_api'] = 'openai'
                    crumb['level'] = 'info'
        
        # Enrich database breadcrumbs
        if crumb.get('category') == 'query':
            crumb['data'] = crumb.get('data', {})
            crumb['data']['database_operation'] = True
            
            # Extract table name if possible
            query = crumb.get('message', '')
            if 'FROM' in query.upper():
                try:
                    table = query.upper().split('FROM')[1].split()[0]
                    crumb['data']['table'] = table.lower()
                except:
                    pass
        
        # Enrich WebSocket breadcrumbs
        if 'websocket' in crumb.get('category', '').lower():
            crumb['data'] = crumb.get('data', {})
            crumb['data']['realtime'] = True
        
        # Add timestamp enrichment
        if crumb.get('timestamp'):
            crumb['data'] = crumb.get('data', {})
            crumb['data']['time'] = crumb['timestamp']
        
    except Exception as e:
        logger.error(f"Error in Sentry before_breadcrumb: {e}")
    
    return crumb


# ============================================================
# SENTRY INITIALIZATION
# ============================================================

def init_sentry(settings):
    """
    Initialize Sentry with enhanced configuration
    
    Args:
        settings: Application settings object with sentry_dsn, environment, etc.
    
    Returns:
        bool: True if Sentry was initialized, False otherwise
    """
    if not settings.sentry_dsn:
        logger.warning("⚠️  Sentry DSN not configured - error tracking disabled")
        return False
    
    try:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.sentry_environment,
            
            # Release tracking (optional - set via environment variable)
            release=os.getenv('SENTRY_RELEASE', None),
            
            # Sampling rates
            traces_sample_rate=settings.sentry_traces_sample_rate,
            profiles_sample_rate=settings.sentry_profiles_sample_rate,
            
            # Only use the integrations you explicitly provide
            default_integrations=True,

            # Enhanced integrations
            integrations=[
                # FastAPI integration with automatic request context
                FastApiIntegration(
                    transaction_style="endpoint",  # Use endpoint names for transactions
                    failed_request_status_codes=[400, 499, 500, 599],  # Track client and server errors
                ),
                
                # SQLAlchemy integration for database queries
                SqlalchemyIntegration(),
                
                # OpenAI integration for API calls
                OpenAIIntegration(),
                
                # Asyncio integration for async errors
                AsyncioIntegration(),

                # Redis integration for caching and message brokering
                RedisIntegration(),
                
                # LangChain/LangGraph integration
                LangchainIntegration(
                    include_prompts=True,  # Capture prompts (be careful with PII!)
                    max_spans=1000,         # Increase span limit for complex graphs
                ),
                
                # Logging integration to capture log messages
                LoggingIntegration(
                    level=logging.INFO,  # Capture info and above
                    event_level=logging.ERROR  # Send errors as events
                ),
            ],
            
            # Enhanced hooks
            before_send=before_send,
            before_breadcrumb=before_breadcrumb,
            
            # Privacy settings
            send_default_pii=False,  # Don't send PII automatically (GDPR compliant)
            
            # Performance monitoring
            enable_tracing=True,
            
            # Breadcrumb settings
            max_breadcrumbs=100,  # Keep more breadcrumbs for context
            
            # Additional options
            attach_stacktrace=True,  # Always attach stack traces
            debug=settings.debug,  # Enable debug mode in development
            
            # Error filtering - ignore common non-critical errors
            ignore_errors=[
                KeyboardInterrupt,
                SystemExit,
            ],
            
            # Request body settings
            max_request_body_size="medium",  # Capture request bodies for debugging
            
            # Value length limits
            max_value_length=2048,  # Increase value length for better context
        )
        
        logger.info(f"✅ Sentry initialized for {settings.sentry_environment} environment")
        logger.info(f"   - Traces sample rate: {settings.sentry_traces_sample_rate}")
        logger.info(f"   - Profiles sample rate: {settings.sentry_profiles_sample_rate}")
        logger.info(f"   - Enhanced context: ENABLED")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


# ============================================================
# MIDDLEWARE
# ============================================================

async def sentry_context_middleware(request: Request, call_next):
    """
    Middleware to automatically add request context to ALL Sentry events
    This runs for every HTTP request
    
    Usage: app.middleware("http")(sentry_context_middleware)
    """
    with sentry_sdk.push_scope() as scope:
        # Add request details
        scope.set_tag("request_method", request.method)
        scope.set_tag("request_path", request.url.path)
        
        # Add session ID if available
        session_id = request.headers.get("X-Session-ID") or request.query_params.get("session_id")
        if session_id:
            scope.set_user({"id": session_id})
            scope.set_tag("session_id", session_id)
        
        # Add request context
        scope.set_context("request", {
            "url": str(request.url),
            "method": request.method,
            "headers": dict(request.headers),
            "query_params": dict(request.query_params),
        })
        
        # Set transaction name
        scope.set_transaction_name(f"{request.method} {request.url.path}")
        
        response = await call_next(request)
        
        # Add response status
        scope.set_tag("response_status", response.status_code)
        
        return response


# ============================================================
# EXCEPTION HANDLERS
# ============================================================

async def sentry_exception_handler(request: Request, exc: Exception):
    """
    Enhanced global exception handler with automatic Sentry reporting
    
    Usage: app.add_exception_handler(Exception, sentry_exception_handler)
    """
    # Add additional context for this specific error
    with sentry_sdk.push_scope() as scope:
        scope.set_context("exception_handler", {
            "handler": "sentry_exception_handler",
            "request_url": str(request.url),
            "request_method": request.method,
        })
        sentry_sdk.capture_exception(exc)
    
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    
    # Check if in debug mode
    from app.configs import settings
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.debug else "An error occurred",
        },
    )


async def sentry_http_exception_handler(request: Request, exc):
    """
    HTTP exception handler with Sentry tracking for 500 errors
    
    Usage: app.add_exception_handler(HTTPException, sentry_http_exception_handler)
    """
    from fastapi import HTTPException
    
    # Only report server errors (500+) to Sentry
    if isinstance(exc, HTTPException) and exc.status_code >= 500:
        with sentry_sdk.push_scope() as scope:
            scope.set_context("http_exception", {
                "status_code": exc.status_code,
                "detail": exc.detail,
                "request_url": str(request.url),
            })
            sentry_sdk.capture_exception(exc)
    
    return JSONResponse(
        status_code=exc.status_code if isinstance(exc, HTTPException) else 500,
        content={"error": exc.detail if isinstance(exc, HTTPException) else str(exc)},
    )