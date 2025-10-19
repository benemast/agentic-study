# backend/app/database.py
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
import logging

from app.config import settings
from app.logging_config import setup_slow_query_logging 

# Configure logging
logger = logging.getLogger(__name__)

# Create engine with optimized settings for user study scale
engine = create_engine(
    settings.database_url,

    # echo=settings.debug, # Enable SQL echo for debugging
    echo=False,  # Disable SQL echo to reduce log noise
    # echo_pool=settings.debug,  # Log pool checkouts/checkins in debug mode
    # pool_logging_name="agentic_study_db_pool",
    echo_pool=False,  # Disable pool echo to reduce log noise

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

# Setup slow query logging (logs queries > 1 second to slow_queries.log)
setup_slow_query_logging(engine, threshold_ms=1000)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# ============================================================
# DATABASE DEPENDENCIES
# ============================================================

def get_db():
    """
    Dependency for FastAPI endpoints
    
    Usage:
        @app.get("/endpoint")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database sessions outside of FastAPI
    
    Usage:
        with get_db_context() as db:
            db.query(Model).all()
    """
    db = SessionLocal()
    try:
        yield db
        # Auto-commit on successful completion
        db.commit()
    except Exception as e:
        # Auto-rollback on error
        db.rollback()
        logger.error(f"Database error in context: {e}")
        raise
    finally:
        db.close()


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def create_tables():
    """
    Create all database tables
    
    Note: In production, use Alembic migrations instead
    """
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        raise


def check_database_connection() -> bool:
    """
    Check if database connection is working
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


def get_database_info() -> dict:
    """
    Get database server information
    
    Returns:
        dict: Database version and connection info
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            
            # Get pool statistics
            pool = engine.pool
            
            return {
                "connected": True,
                "version": version,
                "url": settings.database_url.split('@')[1] if '@' in settings.database_url else 'local',
                "pool_size": pool.size(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
            }
    except Exception as e:
        logger.error(f"Failed to get database info: {e}")
        return {
            "connected": False,
            "error": str(e)
        }


# ============================================================
# DATABASE UTILITIES
# ============================================================

def reset_database():
    """
    WARNING: Drop all tables and recreate them
    
    Only use in development!
    """
    if not settings.debug:
        raise RuntimeError("Cannot reset database in production!")
    
    logger.warning("⚠️  Resetting database - dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database reset complete")


def get_table_counts():
    """
    Get row counts for all tables
    
    Returns:
        dict: Table names and row counts
    """
    counts = {}
    try:
        with engine.connect() as conn:
            for table in Base.metadata.sorted_tables:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table.name}"))
                counts[table.name] = result.scalar()
        return counts
    except Exception as e:
        logger.error(f"Failed to get table counts: {e}")
        return {}