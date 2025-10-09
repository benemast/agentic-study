# backend/fix_postgresql_array.py
"""
Migration script to fix the workflow_tools_used column for PostgreSQL
This converts the column from TEXT/JSON to proper PostgreSQL ARRAY type
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def fix_postgresql_workflow_tools_column():
    """Fix workflow_tools_used column to use proper PostgreSQL ARRAY type"""
    
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("DATABASE_URL environment variable not found")
        return False
    
    if "postgresql" not in DATABASE_URL and "postgres" not in DATABASE_URL:
        print("This migration is only needed for PostgreSQL databases")
        return True
    
    print(f"Connecting to PostgreSQL database...")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Step 1: Check current column type
            result = conn.execute(text("""
                SELECT data_type, column_default
                FROM information_schema.columns 
                WHERE table_name = 'demographics' 
                AND column_name = 'workflow_tools_used'
            """))
            
            current_info = result.fetchone()
            if not current_info:
                print("workflow_tools_used column not found")
                return False
                
            current_type = current_info[0]
            print(f"Current column type: {current_type}")
            
            if current_type == "ARRAY":
                print("Column is already ARRAY type, no migration needed")
                return True
            
            # Step 2: Create new column with ARRAY type
            print("Adding new ARRAY column...")
            conn.execute(text("""
                ALTER TABLE demographics 
                ADD COLUMN workflow_tools_used_new TEXT[]
            """))
            
            # Step 3: Migrate data from old column to new column
            print("Migrating existing data...")
            conn.execute(text("""
                UPDATE demographics 
                SET workflow_tools_used_new = 
                    CASE 
                        WHEN workflow_tools_used IS NULL OR workflow_tools_used = '' THEN '{}'::TEXT[]
                        WHEN workflow_tools_used::text LIKE '[%]' THEN 
                            -- Handle JSON array format
                            ARRAY(SELECT json_array_elements_text(workflow_tools_used::json))
                        ELSE 
                            -- Handle single value or comma-separated
                            string_to_array(workflow_tools_used::text, ',')
                    END
            """))
            
            # Step 4: Drop old column and rename new column
            print("Replacing old column...")
            conn.execute(text("ALTER TABLE demographics DROP COLUMN workflow_tools_used"))
            conn.execute(text("ALTER TABLE demographics RENAME COLUMN workflow_tools_used_new TO workflow_tools_used"))
            
            # Step 5: Set default value
            conn.execute(text("ALTER TABLE demographics ALTER COLUMN workflow_tools_used SET DEFAULT '{}'"))
            
            conn.commit()
            print("Migration completed successfully!")
            
            # Verify the migration
            verify_result = conn.execute(text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'demographics' 
                AND column_name = 'workflow_tools_used'
            """))
            
            new_type = verify_result.fetchone()
            if new_type and new_type[0] == "ARRAY":
                print(f"Verification: Column is now {new_type[0]} type")
            else:
                print("Warning: Could not verify column type change")
            
            # Test with a sample query
            test_result = conn.execute(text("""
                SELECT workflow_tools_used 
                FROM demographics 
                LIMIT 1
            """))
            
            sample = test_result.fetchone()
            if sample:
                print(f"Sample data: {sample[0]} (type: {type(sample[0])})")
            
            return True
            
    except Exception as e:
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Fixing PostgreSQL workflow_tools_used column...")
    if fix_postgresql_workflow_tools_column():
        print("Migration completed successfully!")
        print("Now restart your FastAPI server and try submitting demographics again.")
    else:
        print("Migration failed!")