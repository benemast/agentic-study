"""add_timezone_to_last_activity

Revision ID: 63244b19c896
Revises: 52fbe742e803
Create Date: 2025-10-24 12:14:25.197269

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '63244b19c896'
down_revision: Union[str, None] = '52fbe742e803'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Convert last_activity to TIMESTAMP WITH TIME ZONE
    op.execute("""
        ALTER TABLE sessions 
        ALTER COLUMN last_activity TYPE TIMESTAMP WITH TIME ZONE 
        USING last_activity AT TIME ZONE 'UTC'
    """)


def downgrade():
    # Revert to TIMESTAMP WITHOUT TIME ZONE
    op.execute("""
        ALTER TABLE sessions 
        ALTER COLUMN last_activity TYPE TIMESTAMP WITHOUT TIME ZONE 
        USING last_activity AT TIME ZONE 'UTC'
    """)