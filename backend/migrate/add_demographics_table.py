# migrations/add_demographics_table.py
"""Add demographics table and update sessions

Revision ID: add_demographics_001
Revises: previous_migration_id
Create Date: 2024-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.database import get_db

# revision identifiers
revision = 'add_demographics_001'
down_revision = 'previous_migration_id'  # Replace with actual previous revision
branch_labels = None
depends_on = None

def upgrade():

    db = next(get_db())  # Get a database session

    # Add has_demographics column to sessions table
    op.add_column('sessions', sa.Column('has_demographics', sa.Boolean(), default=False, nullable=False))
    
    # Create demographics table
    op.create_table(
        'demographics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', sa.String(8), sa.ForeignKey('sessions.session_id'), nullable=False, unique=True),
        
        # Basic Information
        sa.Column('age', sa.String(50), nullable=True),
        sa.Column('gender', sa.String(50), nullable=True),
        sa.Column('education', sa.String(100), nullable=True),
        sa.Column('occupation', sa.Text(), nullable=True),
        
        # Technical Background
        sa.Column('programming_experience', sa.String(50), nullable=True),
        sa.Column('ai_ml_experience', sa.String(50), nullable=True),
        sa.Column('workflow_tools_used', ARRAY(sa.String), nullable=True),
        sa.Column('technical_role', sa.String(100), nullable=True),
        
        # Study Context
        sa.Column('participation_motivation', sa.Text(), nullable=True),
        sa.Column('expectations', sa.Text(), nullable=True),
        sa.Column('time_availability', sa.String(50), nullable=True),
        
        # Optional Information
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('first_language', sa.String(100), nullable=True),
        sa.Column('comments', sa.Text(), nullable=True),
        
        # Metadata
        sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('raw_response', sa.JSON(), nullable=True),
    )
    
    # Create indexes for better query performance
    op.create_index('idx_demographics_session_id', 'demographics', ['session_id'])
    op.create_index('idx_demographics_age', 'demographics', ['age'])
    op.create_index('idx_demographics_education', 'demographics', ['education'])
    op.create_index('idx_demographics_programming_exp', 'demographics', ['programming_experience'])
    op.create_index('idx_demographics_ai_exp', 'demographics', ['ai_ml_experience'])
    op.create_index('idx_demographics_technical_role', 'demographics', ['technical_role'])
    op.create_index('idx_demographics_completed_at', 'demographics', ['completed_at'])

    db.

def downgrade():
    # Drop demographics table
    op.drop_table('demographics')
    
    # Remove has_demographics column from sessions table
    op.drop_column('sessions', 'has_demographics')
    op.drop_index('idx_demographics_completed_at', 'demographics')
    op.drop_index('idx_demographics_technical_role', 'demographics')
    op.drop_index('idx_demographics_ai_exp', 'demographics')
    op.drop_index('idx_demographics_programming_exp', 'demographics')
    op.drop_index('idx_demographics_education', 'demographics')
    op.drop_index('idx_demographics_age', 'demographics')
    op.drop_index('idx_demographics_session_id', 'demographics')
    
    # Drop