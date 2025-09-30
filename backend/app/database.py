# backend/app/database.py
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
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
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
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
        from app.models.session import Base
        # Import demographics to ensure it's registered with Base
        from app.models.demographics import Demographics
        
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        print("📊 Tables: sessions, interactions, session_errors, demographics")
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