from sqlalchemy import create_engine, text
import os

def migrate_database():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/agentic_study")
    engine = create_engine(DATABASE_URL)
    
    migration_queries = [
        # Add new columns to sessions table
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_metadata JSONB;",
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'online';",
        
        # Add indexes for performance
        "CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);",
        "CREATE INDEX IF NOT EXISTS idx_sessions_connection_status ON sessions(connection_status);",
        "CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);",
        "CREATE INDEX IF NOT EXISTS idx_interactions_event_type ON interactions(event_type);",
        
        # Create session_errors table
        """
        CREATE TABLE IF NOT EXISTS session_errors (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR NOT NULL,
            error_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            error_type VARCHAR NOT NULL,
            error_message TEXT,
            error_context JSONB,
            resolved BOOLEAN DEFAULT FALSE
        );
        """,
        
        "CREATE INDEX IF NOT EXISTS idx_session_errors_session_id ON session_errors(session_id);",
        "CREATE INDEX IF NOT EXISTS idx_session_errors_timestamp ON session_errors(error_timestamp);",
    ]
    
    try:
        with engine.connect() as conn:
            for query in migration_queries:
                print(f"Executing: {query[:50]}...")
                conn.execute(text(query))
                conn.commit()
        
        print("✅ Database migration completed successfully")
    except Exception as e:
        print(f"❌ Database migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate_database()