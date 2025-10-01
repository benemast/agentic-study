# backend/app/database.py
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool, QueuePool
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create engine with debugging based on environment
engine = create_engine(
    DATABASE_URL, 
    echo=DEBUG,  # Show SQL queries only in debug mode
    poolclass=QueuePool,  # Explicit pool class
    pool_size=20,          # Increased from 10 to 20
    max_overflow=40,       # Increased from 20 to 40 (60 total connections)
    pool_pre_ping=True,    # Check connection health
    pool_recycle=3600,     # Recycle connections after 1 hour
    pool_timeout=30,       # Wait 30s for connection from pool
    connect_args={
        "connect_timeout": 10,  # PostgreSQL connection timeout
        "options": "-c statement_timeout=30000"  # 30s query timeout
    } if "postgresql" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()

# Create tables with error handling
def create_tables():
    try:
        # Use absolute imports
        import sys
        from pathlib import Path
        
        # Add parent directory to path if running as script
        if __name__ == "__main__":
            backend_path = Path(__file__).parent.parent
            if str(backend_path) not in sys.path:
                sys.path.insert(0, str(backend_path))
        
        from app.models.session import Base
        # Import all models to ensure they're registered with Base
        from app.models.demographics import Demographics
        from app.models.ai_chat import ChatMessage, ChatConversation, ChatAnalytics
        
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        print("📊 Tables: sessions, interactions, session_errors, demographics, chat_messages, chat_conversations, chat_analytics")
    except Exception as e:
        print(f"❌ Failed to create database tables: {e}")
        raise

# Database health check
def check_database_connection():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

# Initialize database
if __name__ == "__main__":
    create_tables()