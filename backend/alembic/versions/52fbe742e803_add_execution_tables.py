"""add_execution_tables

Revision ID: 52fbe742e803
Revises: 
Create Date: 2025-10-15 15:06:16.510156

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '52fbe742e803'
down_revision = None  
branch_labels = None
depends_on = None


def upgrade():
    # Create workflow_executions table
    op.create_table(
        'workflow_executions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('condition', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('workflow_definition', sa.JSON(), nullable=True),
        sa.Column('task_description', sa.Text(), nullable=True),
        sa.Column('input_data', sa.JSON(), nullable=True),
        sa.Column('final_result', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_traceback', sa.Text(), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('steps_completed', sa.Integer(), nullable=True),
        sa.Column('steps_total', sa.Integer(), nullable=True),
        sa.Column('user_interventions', sa.Integer(), nullable=True),
        sa.Column('checkpoints_count', sa.Integer(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=True),
        sa.Column('execution_metadata', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.session_id'], ),
    )
    op.create_index('ix_workflow_executions_session_id', 'workflow_executions', ['session_id'])
    op.create_index('ix_workflow_executions_condition', 'workflow_executions', ['condition'])
    op.create_index('ix_workflow_executions_status', 'workflow_executions', ['status'])
    op.create_index('ix_workflow_executions_started_at', 'workflow_executions', ['started_at'])

    # Create execution_checkpoints table
    op.create_table(
        'execution_checkpoints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('execution_id', sa.Integer(), nullable=False),
        sa.Column('step_number', sa.Integer(), nullable=True),
        sa.Column('checkpoint_type', sa.String(length=50), nullable=True),
        sa.Column('node_id', sa.String(length=100), nullable=True),
        sa.Column('state_snapshot', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('time_since_last_step_ms', sa.Integer(), nullable=True),
        sa.Column('memory_usage_mb', sa.Float(), nullable=True),
        sa.Column('user_interaction', sa.Boolean(), nullable=True),
        sa.Column('agent_reasoning', sa.Text(), nullable=True),
        sa.Column('checkpoint_metadata', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['execution_id'], ['workflow_executions.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_execution_checkpoints_execution_id', 'execution_checkpoints', ['execution_id'])
    op.create_index('ix_execution_checkpoints_step_number', 'execution_checkpoints', ['step_number'])
    op.create_index('ix_execution_checkpoints_timestamp', 'execution_checkpoints', ['timestamp'])

    # Create execution_logs table
    op.create_table(
        'execution_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('execution_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('log_level', sa.String(length=20), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('node_id', sa.String(length=100), nullable=True),
        sa.Column('step_number', sa.Integer(), nullable=True),
        sa.Column('log_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['execution_id'], ['workflow_executions.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_execution_logs_execution_id', 'execution_logs', ['execution_id'])
    op.create_index('ix_execution_logs_timestamp', 'execution_logs', ['timestamp'])
    op.create_index('ix_execution_logs_log_level', 'execution_logs', ['log_level'])


def downgrade():
    op.drop_index('ix_execution_logs_log_level', table_name='execution_logs')
    op.drop_index('ix_execution_logs_timestamp', table_name='execution_logs')
    op.drop_index('ix_execution_logs_execution_id', table_name='execution_logs')
    op.drop_table('execution_logs')
    
    op.drop_index('ix_execution_checkpoints_timestamp', table_name='execution_checkpoints')
    op.drop_index('ix_execution_checkpoints_step_number', table_name='execution_checkpoints')
    op.drop_index('ix_execution_checkpoints_execution_id', table_name='execution_checkpoints')
    op.drop_table('execution_checkpoints')
    
    op.drop_index('ix_workflow_executions_started_at', table_name='workflow_executions')
    op.drop_index('ix_workflow_executions_status', table_name='workflow_executions')
    op.drop_index('ix_workflow_executions_condition', table_name='workflow_executions')
    op.drop_index('ix_workflow_executions_session_id', table_name='workflow_executions')
    op.drop_table('workflow_executions')