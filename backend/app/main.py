# backend/app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import traceback

from app.routers import sessions, demographics, ai_chat, sentry, orchestrator, websocket, reviews, monitoring
from app.database import create_tables, check_database_connection, get_database_info
from app.websocket.handlers import register_handlers

from app.configs.config import settings
from app.configs.logging_config import setup_logging

# Import Sentry configuration
from app.configs.sentry_config import (
    init_sentry,
    sentry_context_middleware,
    sentry_exception_handler,
    sentry_http_exception_handler,
)

from app.configs.langsmith_config import init_langsmith


setup_logging(debug=settings.debug)
# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address) if settings.rate_limit_enabled else None

# Initialize Sentry
sentry_enabled = init_sentry(settings)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info("Starting Agentic Study API")
    logger.info(f"Environment: {'DEBUG' if settings.debug else 'PRODUCTION'}")
    logger.info(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'local'}")
    
    # Check database connection
    if not check_database_connection():
        logger.error("Database connection failed during startup")
        raise Exception("Database connection failed")
    
    # Create tables
    try:
        create_tables()
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    # Register WebSocket handlers ONCE at startup
    register_handlers()

    # Initialize LangSmith tracing
    langsmith_enabled = init_langsmith(settings)
    if langsmith_enabled:
        logger.info("LangSmith tracing initialized successfully")
    else:
        logger.info("Running without LangSmith tracing")
    
    logger.info("Agentic Study API started successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down Agentic Study API")

# Initialize FastAPI app
app = FastAPI(
    title="Agentic Study API",
    description="API for user study comparing AI workflows with agentic chat",
    version="2.0.0",
    debug=settings.debug,
    lifespan=lifespan
)

# Add rate limiter to app state
if limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add Sentry middleware (if enabled)
if sentry_enabled:
    app.middleware("http")(sentry_context_middleware)

# CORS Configuration - MUST be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - be more specific in production
    # allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "FETCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# ============================================================
# ENHANCED EXCEPTION HANDLERS
# ============================================================

# Add Sentry exception handlers (only if enabled)
if sentry_enabled:
    app.add_exception_handler(Exception, sentry_exception_handler)
    app.add_exception_handler(HTTPException, sentry_http_exception_handler)
else:
    # Fallback exception handlers without Sentry
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )


# OPTIONS handler for CORS
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    """Handle CORS preflight requests"""
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, FETCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        }
    )

# Include routers
app.include_router(sessions.router)
app.include_router(demographics.router)
app.include_router(ai_chat.router)
app.include_router(orchestrator.router)
app.include_router(websocket.router)
app.include_router(sentry.router)
app.include_router(reviews.router)
app.include_router(monitoring.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Agentic Study API",
        "version": "2.0.0",
        "status": "running"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    db_info = get_database_info()
    
    return {
        "status": "healthy" if db_info.get("connected") else "unhealthy",
        "version": "2.0.0",
        "database": db_info,
        "sentry_enabled": settings.sentry_dsn is not None,
        "cors_configured": True,
        "cors_origins": settings.get_cors_origins(),
        "rate_limiting": settings.rate_limit_enabled,
        "debug_mode": settings.debug
    }

@app.get("/api/version")
async def get_version():
    """API version and feature flags"""
    return {
        "api_version": "2.0.0",
        "features": {
            "session_management": "enabled",
            "demographics_collection": "enabled",
            "ai_chat": "enabled",
            "rate_limiting": settings.rate_limit_enabled,
            "caching": settings.redis_enabled,
            "langgraph": "pending",  # Will be enabled in future
        }
    }

# Global exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Handle 404 errors with CORS headers"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Resource not found",
            "path": str(request.url.path),
            "status_code": 404
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true"
        }
    )

@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception):
    """Handle 500 errors with logging"""
    logger.error(f"Internal server error: {exc}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true"
        }
    )

@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception):
    """Handle 500 errors with logging and CORS"""
    logger.error(f"Internal server error: {exc}")
    logger.error(traceback.format_exc())
    
    origin = request.headers.get("origin", "*")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        },
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, FETCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Expose-Headers": "*",
        }
    )

# CORS test endpoints
@app.get("/api/test-cors")
async def test_cors():
    """Test CORS configuration"""
    return {
        "message": "CORS is working",
        "origins": settings.get_cors_origins()
    }

@app.options("/api/test-cors")
async def test_cors_options():
    """OPTIONS preflight for CORS testing"""
    return {"message": "OPTIONS request successful"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )