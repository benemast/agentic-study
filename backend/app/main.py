from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import logging
import os
import json

from app.routers import sessions
from app.database import create_tables, check_database_connection

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Agentic Study API")
    
    # Check database connection
    if not check_database_connection():
        logger.error("❌ Database connection failed during startup")
        raise Exception("Database connection failed")
    
    # Create tables
    try:
        create_tables()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    logger.info("✅ Agentic Study API started successfully")
    yield
    
    # Shutdown
    logger.info("🔄 Shutting down Agentic Study API")

app = FastAPI(
    title="Agentic Study API",
    description="Enhanced API for collecting user study data on agentic AI workflows",
    version="2.0.0",
    debug=os.getenv("DEBUG", "False").lower() == "true",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*.localhost"]
)

# Get CORS origins from environment
cors_origins_str = os.getenv("CORS_ORIGINS", '["http://localhost:5173"]')
cors_origins = json.loads(cors_origins_str)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include enhanced session routes
app.include_router(sessions.router)

@app.get("/")
async def root():
    return {
        "message": "Agentic Study API v2.0",
        "status": "online",
        "features": [
            "Enhanced session management",
            "Auto-sync capabilities", 
            "Session validation",
            "Comprehensive analytics",
            "Error handling & recovery",
            "Cross-device session sharing"
        ]
    }

@app.get("/api/health")
async def health_check():
    db_healthy = check_database_connection()
    
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": "2024-01-15T10:30:00Z"
    }

@app.get("/api/version")
async def get_version():
    return {
        "api_version": "2.0.0",
        "features": {
            "session_management": "enhanced",
            "real_time_sync": "enabled",
            "cross_device": "enabled",
            "analytics": "comprehensive",
            "error_handling": "robust"
        }
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Resource not found", "status_code": 404}

@app.exception_handler(500)
async def server_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {"error": "Internal server error", "status_code": 500}