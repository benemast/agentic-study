# backend/app/database.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import logging

from app.config import settings

# Configure logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(
    logging.INFO if settings.debug else logging.WARNING
)

logger = logging.getLogger(__name__)

# Create engine with optimized settings for user study scale
engine = create_engine(
    settings.database_url,
    echo=settings.debug,
    poolclass=QueuePool,
    pool_size=settings.db_pool_size,        # Default: 5 connections
    max_overflow=settings.db_max_overflow,  # Default: 10 overflow (15 total)
    pool_pre_ping=True,                     # Health check before using connection
    pool_recycle=3600,                      # Recycle connections after 1 hour
    pool_timeout=30,                        # Wait 30s for connection
    connect_args={
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000"  # 30s query timeout
    } if "postgresql" in settings.database_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for getting database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    try:
        # Import Base and all models
        from app.models.session import Base
        from app.models.demographics import Demographics
        from app.models.ai_chat import ChatMessage, ChatConversation, ChatAnalytics
        from app.models.execution import WorkflowExecution, ExecutionCheckpoint, ExecutionLog
        
        Base.metadata.create_all(bind=engine)
        
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
        
        # Log table names for verification
        table_names = Base.metadata.tables.keys()
        logger.info(f"📊 Tables: {', '.join(table_names)}")
        
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        raise

def check_database_connection() -> bool:
    """Health check for database connectivity"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

def get_database_info() -> dict:
    """Get database connection information for health checks"""
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT version()"))
        version = result.scalar()
        
        # Get pool statistics
        pool = engine.pool
        
        db.close()
        
        return {
            "connected": True,
            "version": version,
            "pool_size": pool.size(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }

# Initialize database on module import
if __name__ == "__main__":
    logger.info("Initializing database...")
    create_tables()