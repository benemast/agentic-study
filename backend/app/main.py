# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import logging
import os
import json
import traceback

from app.routers import sessions, demographics
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
    logger.info("Starting Agentic Study API")
    
    # Check database connection
    if not check_database_connection():
        logger.error("Database connection failed during startup")
        raise Exception("Database connection failed")
    
    # Create tables
    try:
        create_tables()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    logger.info("Agentic Study API started successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down Agentic Study API")

app = FastAPI(
    title="Agentic Study API",
    description="Enhanced API for collecting user study data on agentic AI workflows",
    version="1.0.6",
    debug=os.getenv("DEBUG", "False").lower() == "true",
    lifespan=lifespan
)

# CORS Configuration
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

# Add any additional origins from environment
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    try:
        additional_origins = json.loads(cors_origins_env)
        cors_origins.extend(additional_origins)
    except json.JSONDecodeError:
        logger.warning("Failed to parse CORS_ORIGINS environment variable")

logger.info(f"CORS Origins configured: {cors_origins}")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Referer",
        "User-Agent"
    ],
    expose_headers=["*"],
    max_age=3600,
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=[
        "localhost", 
        "127.0.0.1", 
        "*.localhost", 
        "localhost:5173", 
        "127.0.0.1:5173",
        "localhost:8000",
        "127.0.0.1:8000"
    ]
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Log incoming request
    logger.info(f"{request.method} {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    
    # Handle CORS preflight requests
    if request.method == "OPTIONS":
        response = JSONResponse({"message": "OK"})
        response.headers.update({
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin, Referer, User-Agent",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600"
        })
        return response
    
    try:
        response = await call_next(request)
        logger.info(f"Response: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "detail": str(e)},
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Credentials": "true"
            }
        )

# Include routers
app.include_router(sessions.router)
app.include_router(demographics.router)

@app.get("/")
async def root():
    return {
        "message": "Agentic Study API v2.0",
        "status": "online",
        "cors_origins": cors_origins,
        "features": [
            "Enhanced session management",
            "Auto-sync capabilities", 
            "Session validation",
            "Comprehensive analytics",
            "Demographics collection",
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
        "cors_configured": True,
        "origins": cors_origins
    }

@app.get("/api/version")
async def get_version():
    return {
        "api_version": "1.0.6",
        "features": {
            "session_management": "enhanced",
            "demographics_collection": "enabled",
            "real_time_sync": "enabled",
            "cross_device": "enabled",
            "analytics": "comprehensive",
            "error_handling": "robust",
            "cors_support": "comprehensive"
        }
    }

# Global exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"error": "Resource not found", "status_code": 404},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true"
        }
    )

@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true"
        }
    )

@app.get("/api/test-cors")
async def test_cors():
    return {"message": "CORS is working"}

@app.options("/api/test-cors")
async def test_cors_options():
    return {"message": "OPTIONS request successful"}