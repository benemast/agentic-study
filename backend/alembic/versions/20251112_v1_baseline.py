"""v1 baseline schema (from pg_dump)

- Postgres only
- Uses Identity columns and JSON/JSONB/ARRAY types
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as psql

# --- Alembic identifiers ---
revision = "v1_baseline_20251112"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ------------------------
    # Core: sessions (root)
    # ------------------------
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer, sa.Identity(always=False), primary_key=True),
        sa.Column("session_id", sa.String, nullable=False),
        sa.Column("participant_id", sa.Integer),
        sa.Column("start_time", sa.TIMESTAMP(timezone=False)),
        sa.Column("end_time", sa.TIMESTAMP(timezone=False)),
        sa.Column("last_activity", sa.TIMESTAMP(timezone=True)),
        sa.Column("user_agent", sa.Text),
        sa.Column("screen_resolution", sa.String),
        sa.Column("session_data", sa.JSON),
        sa.Column("session_metadata", sa.JSON),
        sa.Column("is_active", sa.String),
        sa.Column("connection_status", sa.String),
        sa.Column("has_demographics", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("study_group", sa.Integer),
        schema="public",
    )
    op.create_index("ix_sessions_id", "sessions", ["id"], unique=False, schema="public")
    op.create_index("ix_sessions_participant_id", "sessions", ["participant_id"], unique=False, schema="public")
    op.create_index("ix_sessions_session_id", "sessions", ["session_id"], unique=True, schema="public")

    # ------------------------
    # Conversations / Messages / Analytics
    # ------------------------
    op.create_table(
        "chat_conversations",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String, nullable=False),
        sa.Column("started_at", sa.TIMESTAMP(timezone=False)),
        sa.Column("last_message_at", sa.TIMESTAMP(timezone=False)),
        sa.Column("message_count", sa.Integer),
        sa.Column("total_tokens_used", sa.Integer),
        sa.Column("total_user_messages", sa.Integer),
        sa.Column("total_assistant_messages", sa.Integer),
        sa.Column("estimated_cost_usd", sa.Float),
        sa.Column("is_active", sa.String(10)),
        sa.Column("ended_at", sa.TIMESTAMP(timezone=False)),
        sa.Column("conversation_tags", sa.JSON),
        sa.Column("conversation_summary", sa.Text),
        sa.Column("deleted", sa.Boolean, server_default=sa.text("false")),
        schema="public",
    )
    op.create_index("ix_chat_conversations_id", "chat_conversations", ["id"], unique=False, schema="public")
    op.create_index("ix_chat_conversations_session_id", "chat_conversations", ["session_id"], unique=True, schema="public")

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String, nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=True)),
        sa.Column("message_index", sa.Integer),
        sa.Column("token_count", sa.Integer),
        sa.Column("model_used", sa.String(50)),
        sa.Column("response_time_ms", sa.Integer),
        sa.Column("message_metadata", sa.JSON),
        sa.Column("deleted", sa.Boolean, server_default=sa.text("false")),
        schema="public",
    )
    op.create_index("ix_chat_messages_id", "chat_messages", ["id"], unique=False, schema="public")
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"], unique=False, schema="public")
    op.create_index("ix_chat_messages_timestamp", "chat_messages", ["timestamp"], unique=False, schema="public")

    op.create_table(
        "chat_analytics",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String, nullable=False),
        sa.Column("date", sa.TIMESTAMP(timezone=False)),
        sa.Column("messages_sent", sa.Integer),
        sa.Column("messages_received", sa.Integer),
        sa.Column("avg_response_time_ms", sa.Integer),
        sa.Column("tokens_used", sa.Integer),
        sa.Column("estimated_cost", sa.Float),
        sa.Column("conversation_duration_seconds", sa.Integer),
        sa.Column("user_satisfaction", sa.String(20)),
        sa.Column("analytics_metadata", sa.JSON),
        schema="public",
    )
    op.create_index("ix_chat_analytics_id", "chat_analytics", ["id"], unique=False, schema="public")
    op.create_index("ix_chat_analytics_session_id", "chat_analytics", ["session_id"], unique=False, schema="public")
    op.create_index("ix_chat_analytics_date", "chat_analytics", ["date"], unique=False, schema="public")

    # ------------------------
    # Interactions / Errors / Demographics
    # ------------------------
    op.create_table(
        "interactions",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=False)),
        sa.Column("event_type", sa.String),
        sa.Column("event_data", sa.JSON),
        sa.Column("current_view", sa.String),
        sa.Column("user_agent", sa.Text),
        sa.Column("ip_address", sa.String),
        sa.Column("page_url", sa.String),
        schema="public",
    )
    op.create_index("ix_interactions_id", "interactions", ["id"], unique=False, schema="public")
    op.create_index("ix_interactions_session_id", "interactions", ["session_id"], unique=False, schema="public")
    op.create_index("ix_interactions_timestamp", "interactions", ["timestamp"], unique=False, schema="public")
    op.create_index("ix_interactions_event_type", "interactions", ["event_type"], unique=False, schema="public")

    op.create_table(
        "session_errors",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String),
        sa.Column("error_timestamp", sa.TIMESTAMP(timezone=False)),
        sa.Column("error_type", sa.String),
        sa.Column("error_message", sa.Text),
        sa.Column("error_context", sa.JSON),
        sa.Column("resolved", sa.Boolean),
        schema="public",
    )
    op.create_index("ix_session_errors_id", "session_errors", ["id"], unique=False, schema="public")
    op.create_index("ix_session_errors_session_id", "session_errors", ["session_id"], unique=False, schema="public")

    op.create_table(
        "demographics",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String(8), nullable=False, unique=True),
        sa.Column("age", sa.String(50)),
        sa.Column("gender_identity", sa.String(50)),
        sa.Column("education", sa.String(100)),
        sa.Column("occupation", sa.Text),
        sa.Column("programming_experience", sa.String(50)),
        sa.Column("ai_ml_experience", sa.String(50)),
        sa.Column("workflow_tools_used", psql.ARRAY(sa.Text())),
        sa.Column("technical_role", sa.String(100)),
        sa.Column("first_language", sa.String(100)),
        sa.Column("comments", sa.Text),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("raw_response", psql.JSONB),
        sa.Column("field_of_study", sa.String(200)),
        sa.Column("industry", sa.String(50)),
        sa.Column("work_experience", sa.String(50)),
        sa.Column("ai_ml_expertise", sa.String(50)),
        sa.Column("ai_tools_used", psql.ARRAY(sa.Text())),
        schema="public",
    )
    op.create_index("idx_demographics_session_id", "demographics", ["session_id"], unique=False, schema="public")
    op.create_index("idx_demographics_age", "demographics", ["age"], unique=False, schema="public")
    op.create_index("idx_demographics_ai_exp", "demographics", ["ai_ml_experience"], unique=False, schema="public")
    op.create_index("idx_demographics_completed_at", "demographics", ["completed_at"], unique=False, schema="public")
    op.create_index("idx_demographics_education", "demographics", ["education"], unique=False, schema="public")
    op.create_index("idx_demographics_programming_exp", "demographics", ["programming_experience"], unique=False, schema="public")
    op.create_index("idx_demographics_technical_role", "demographics", ["technical_role"], unique=False, schema="public")

    # ------------------------
    # Executions + children
    # ------------------------
    op.create_table(
        "executions",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String, nullable=False),
        sa.Column("condition", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20)),
        sa.Column("started_at", sa.TIMESTAMP(timezone=False)),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=False)),
        sa.Column("workflow_definition", sa.JSON),
        sa.Column("task_description", sa.Text),
        sa.Column("input_data", sa.JSON),
        sa.Column("final_result", sa.JSON),
        sa.Column("error_message", sa.Text),
        sa.Column("error_traceback", sa.Text),
        sa.Column("execution_time_ms", sa.Integer),
        sa.Column("steps_completed", sa.Integer),
        sa.Column("steps_total", sa.Integer),
        sa.Column("user_interventions", sa.Integer),
        sa.Column("checkpoints_count", sa.Integer),
        sa.Column("tokens_used", sa.Integer),
        sa.Column("estimated_cost_usd", sa.Float),
        sa.Column("execution_metadata", sa.JSON),
        schema="public",
    )
    op.create_index("ix_workflow_executions_session_id", "executions", ["session_id"], unique=False, schema="public")
    op.create_index("ix_workflow_executions_condition", "executions", ["condition"], unique=False, schema="public")
    op.create_index("ix_workflow_executions_started_at", "executions", ["started_at"], unique=False, schema="public")
    op.create_index("ix_workflow_executions_status", "executions", ["status"], unique=False, schema="public")

    op.create_table(
        "execution_checkpoints",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("execution_id", sa.Integer, nullable=False),
        sa.Column("step_number", sa.Integer),
        sa.Column("checkpoint_type", sa.String(50)),
        sa.Column("node_id", sa.String(100)),
        sa.Column("state_snapshot", sa.JSON),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=False)),
        sa.Column("time_since_last_step_ms", sa.Integer),
        sa.Column("memory_usage_mb", sa.Float),
        sa.Column("user_interaction", sa.Boolean),
        sa.Column("agent_reasoning", sa.Text),
        sa.Column("checkpoint_metadata", sa.JSON),
        schema="public",
    )
    op.create_index("ix_execution_checkpoints_execution_id", "execution_checkpoints", ["execution_id"], unique=False, schema="public")
    op.create_index("ix_execution_checkpoints_step_number", "execution_checkpoints", ["step_number"], unique=False, schema="public")
    op.create_index("ix_execution_checkpoints_timestamp", "execution_checkpoints", ["timestamp"], unique=False, schema="public")

    op.create_table(
        "execution_logs",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("execution_id", sa.Integer, nullable=False),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=False)),
        sa.Column("log_level", sa.String(20)),
        sa.Column("message", sa.Text),
        sa.Column("node_id", sa.String(100)),
        sa.Column("step_number", sa.Integer),
        sa.Column("log_data", sa.JSON),
        schema="public",
    )
    op.create_index("ix_execution_logs_execution_id", "execution_logs", ["execution_id"], unique=False, schema="public")
    op.create_index("ix_execution_logs_timestamp", "execution_logs", ["timestamp"], unique=False, schema="public")
    op.create_index("ix_execution_logs_log_level", "execution_logs", ["log_level"], unique=False, schema="public")

    op.create_table(
        "execution_summaries",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String, nullable=False),
        sa.Column("task1_execution_id", sa.String(255)),
        sa.Column("task1_summary", psql.JSONB),
        sa.Column("task2_execution_id", sa.String(255)),
        sa.Column("task2_summary", psql.JSONB),
        sa.Column("created_at", sa.TIMESTAMP(timezone=False), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=False), server_default=sa.text("CURRENT_TIMESTAMP")),
        schema="public",
    )
    op.create_index("idx_execution_summaries_session", "execution_summaries", ["session_id"], unique=False, schema="public")

    # ------------------------
    # Survey responses (+ view)
    # ------------------------
    op.create_table(
        "survey_responses",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("participant_id", sa.Integer, nullable=False, comment="Participant ID as INTEGER to match sessions table"),
        sa.Column("session_id", sa.String, nullable=False, comment="Foreign key to sessions.session_id (VARCHAR format)"),
        sa.Column("task_number", sa.Integer, nullable=False),
        sa.Column("condition", sa.String(20), nullable=False),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column(
            "duration_seconds",
            sa.Integer,
            sa.Computed("EXTRACT(epoch FROM (completed_at - started_at))::integer", persisted=True),
            comment="Auto-calculated duration in seconds",
        ),
        # NASA-TLX + study items
        sa.Column("nasa_tlx_mental_demand", sa.Integer),
        sa.Column("nasa_tlx_temporal_demand", sa.Integer),
        sa.Column("nasa_tlx_performance", sa.Integer, comment="NASA-TLX Performance: 0=Perfect to 100=Failure (reverse-coded in analysis)"),
        sa.Column("nasa_tlx_effort", sa.Integer),
        sa.Column("nasa_tlx_frustration", sa.Integer),
        sa.Column("control_task", sa.Integer),
        sa.Column("agency_decisions", sa.Integer),
        sa.Column("engagement", sa.Integer),
        sa.Column("confidence_quality", sa.Integer),
        sa.Column("trust_results", sa.Integer),
        sa.Column("process_transparency", sa.Integer),
        sa.Column("predictability", sa.Integer),
        sa.Column("understood_choices", sa.Integer),
        sa.Column("understood_reasoning", sa.Integer),
        sa.Column("could_explain", sa.Integer),
        sa.Column("ease_of_use", sa.Integer),
        sa.Column("efficiency", sa.Integer),
        sa.Column("found_insights", sa.Integer),
        sa.Column("explored_thoroughly", sa.Integer),
        sa.Column("discovered_insights", sa.Integer),
        sa.Column("accurate_reliable", sa.Integer),
        sa.Column("recommend", sa.Integer),
        sa.Column("feedback_positive", sa.Text),
        sa.Column("feedback_negative", sa.Text),
        sa.Column("feedback_improvements", sa.Text),
        sa.Column("language", sa.String(5), nullable=False, server_default=sa.text("'en'")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("participant_id", "task_number", "condition", name="uq_participant_task_condition"),
        # Check constraints
        sa.CheckConstraint("condition::text = ANY (ARRAY['workflow_builder','ai_assistant']::text[])", name="check_condition"),
        sa.CheckConstraint("task_number = ANY (ARRAY[1,2])", name="check_task_number"),
        sa.CheckConstraint("nasa_tlx_mental_demand BETWEEN 0 AND 100", name="survey_responses_nasa_tlx_mental_demand_check"),
        sa.CheckConstraint("nasa_tlx_temporal_demand BETWEEN 0 AND 100", name="survey_responses_nasa_tlx_temporal_demand_check"),
        sa.CheckConstraint("nasa_tlx_performance BETWEEN 0 AND 100", name="survey_responses_nasa_tlx_performance_check"),
        sa.CheckConstraint("nasa_tlx_effort BETWEEN 0 AND 100", name="survey_responses_nasa_tlx_effort_check"),
        sa.CheckConstraint("nasa_tlx_frustration BETWEEN 0 AND 100", name="survey_responses_nasa_tlx_frustration_check"),
        sa.CheckConstraint("predictability BETWEEN 1 AND 7", name="survey_responses_predictability_check"),
        sa.CheckConstraint("process_transparency BETWEEN 1 AND 7", name="survey_responses_process_transparency_check"),
        sa.CheckConstraint("understood_choices BETWEEN 1 AND 7", name="survey_responses_understood_choices_check"),
        sa.CheckConstraint("understood_reasoning BETWEEN 1 AND 7", name="survey_responses_understood_reasoning_check"),
        sa.CheckConstraint("could_explain BETWEEN 1 AND 7", name="survey_responses_could_explain_check"),
        sa.CheckConstraint("engagement BETWEEN 1 AND 7", name="survey_responses_engagement_check"),
        sa.CheckConstraint("efficiency BETWEEN 1 AND 7", name="survey_responses_efficiency_check"),
        sa.CheckConstraint("found_insights BETWEEN 1 AND 7", name="survey_responses_found_insights_check"),
        sa.CheckConstraint("discovered_insights BETWEEN 1 AND 7", name="survey_responses_discovered_insights_check"),
        sa.CheckConstraint("accurate_reliable BETWEEN 1 AND 7", name="survey_responses_accurate_reliable_check"),
        sa.CheckConstraint("recommend BETWEEN 1 AND 7", name="survey_responses_recommend_check"),
        schema="public",
        comment="Stores post-task survey responses including NASA-TLX, Likert scales, and open-ended feedback",
    )
    op.create_index("idx_survey_responses_completed", "survey_responses", ["completed_at"], unique=False, schema="public")
    op.create_index("idx_survey_responses_condition", "survey_responses", ["condition"], unique=False, schema="public")
    op.create_index("idx_survey_responses_participant", "survey_responses", ["participant_id"], unique=False, schema="public")
    op.create_index("idx_survey_responses_session", "survey_responses", ["session_id"], unique=False, schema="public")
    op.create_index("idx_survey_responses_task", "survey_responses", ["task_number"], unique=False, schema="public")

    # ------------------------
    # Reviews tables
    # ------------------------
    op.create_table(
        "shoes_reviews",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("review_id", sa.String(50), nullable=False),
        sa.Column("product_id", sa.String(50), nullable=False),
        sa.Column("product_id_original", sa.String(50), nullable=False),
        sa.Column("product_title", sa.String(500), nullable=False),
        sa.Column("product_title_original", sa.String(500), nullable=False),
        sa.Column("product_parent", sa.Integer, nullable=False),
        sa.Column("product_category", sa.String(50), nullable=False, server_default=sa.text("'Shoes'")),
        sa.Column("star_rating", sa.Integer, nullable=False),
        sa.Column("avg_star_rating", sa.Numeric(4, 2), nullable=False),
        sa.Column("review_headline", sa.String(500), server_default=sa.text("''")),
        sa.Column("review_body", sa.Text, server_default=sa.text("''")),
        sa.Column("verified_purchase", sa.Boolean, nullable=False),
        sa.Column("review_date", sa.Date, nullable=False),
        sa.Column("helpful_votes", sa.Integer, nullable=False),
        sa.Column("total_votes", sa.Integer, nullable=False),
        sa.Column("customer_id", sa.Integer, nullable=False),
        sa.Column("vine", sa.Boolean, nullable=False),
        sa.Column("marketplace", sa.String(2), nullable=False),
        sa.Column("is_main_product", sa.Boolean, nullable=False),
        sa.Column("is_malformed", sa.Boolean, nullable=False),
        sa.Column("malformed_type", sa.String(50), server_default=sa.text("NULL")),
        sa.CheckConstraint("(is_malformed = FALSE AND malformed_type IS NULL) OR (is_malformed = TRUE AND malformed_type IS NOT NULL)", name="check_malformed"),
        sa.CheckConstraint("total_votes >= helpful_votes", name="check_votes"),
        sa.CheckConstraint("avg_star_rating >= 0.0 AND avg_star_rating <= 5.0", name="shoes_reviews_avg_star_rating_check"),
        sa.CheckConstraint("customer_id > 0", name="shoes_reviews_customer_id_check"),
        sa.CheckConstraint("helpful_votes >= 0", name="shoes_reviews_helpful_votes_check"),
        sa.CheckConstraint("product_parent > 0", name="shoes_reviews_product_parent_check"),
        sa.CheckConstraint("star_rating BETWEEN 1 AND 5", name="shoes_reviews_star_rating_check"),
        sa.CheckConstraint("total_votes >= 0", name="shoes_reviews_total_votes_check"),
        schema="public",
    )
    op.create_index("idx_shoes_product_id", "shoes_reviews", ["product_id"], unique=False, schema="public")
    op.create_index("idx_shoes_review_date", "shoes_reviews", ["review_date"], unique=False, schema="public")
    op.create_index("idx_shoes_star_rating", "shoes_reviews", ["star_rating"], unique=False, schema="public")
    op.create_index("idx_shoes_verified_purchase", "shoes_reviews", ["verified_purchase"], unique=False, schema="public")
    op.create_index("idx_shoes_is_malformed", "shoes_reviews", ["is_malformed"], unique=False, schema="public")

    op.create_table(
        "wireless_reviews",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("review_id", sa.String(50), nullable=False),
        sa.Column("product_id", sa.String(50), nullable=False),
        sa.Column("product_id_original", sa.String(50), nullable=False),
        sa.Column("product_title", sa.String(500), nullable=False),
        sa.Column("product_title_original", sa.String(500), nullable=False),
        sa.Column("product_parent", sa.Integer, nullable=False),
        sa.Column("product_category", sa.String(50), nullable=False, server_default=sa.text("'Wireless'")),
        sa.Column("star_rating", sa.Integer, nullable=False),
        sa.Column("avg_star_rating", sa.Numeric(4, 2), nullable=False),
        sa.Column("review_headline", sa.String(500), server_default=sa.text("''")),
        sa.Column("review_body", sa.Text, server_default=sa.text("''")),
        sa.Column("verified_purchase", sa.Boolean, nullable=False),
        sa.Column("review_date", sa.Date, nullable=False),
        sa.Column("helpful_votes", sa.Integer, nullable=False),
        sa.Column("total_votes", sa.Integer, nullable=False),
        sa.Column("customer_id", sa.Integer, nullable=False),
        sa.Column("vine", sa.Boolean, nullable=False),
        sa.Column("marketplace", sa.String(2), nullable=False),
        sa.Column("is_main_product", sa.Boolean, nullable=False),
        sa.Column("is_malformed", sa.Boolean, nullable=False),
        sa.Column("malformed_type", sa.String(50), server_default=sa.text("NULL")),
        sa.CheckConstraint("(is_malformed = FALSE AND malformed_type IS NULL) OR (is_malformed = TRUE AND malformed_type IS NOT NULL)", name="check_malformed"),
        sa.CheckConstraint("total_votes >= helpful_votes", name="check_votes"),
        sa.CheckConstraint("avg_star_rating >= 0.0 AND avg_star_rating <= 5.0", name="wireless_reviews_avg_star_rating_check"),
        sa.CheckConstraint("customer_id > 0", name="wireless_reviews_customer_id_check"),
        sa.CheckConstraint("helpful_votes >= 0", name="wireless_reviews_helpful_votes_check"),
        sa.CheckConstraint("product_parent > 0", name="wireless_reviews_product_parent_check"),
        sa.CheckConstraint("star_rating BETWEEN 1 AND 5", name="wireless_reviews_star_rating_check"),
        sa.CheckConstraint("total_votes >= 0", name="wireless_reviews_total_votes_check"),
        schema="public",
    )
    op.create_index("idx_wireless_product_id", "wireless_reviews", ["product_id"], unique=False, schema="public")
    op.create_index("idx_wireless_review_date", "wireless_reviews", ["review_date"], unique=False, schema="public")
    op.create_index("idx_wireless_star_rating", "wireless_reviews", ["star_rating"], unique=False, schema="public")
    op.create_index("idx_wireless_verified_purchase", "wireless_reviews", ["verified_purchase"], unique=False, schema="public")
    op.create_index("idx_wireless_is_malformed", "wireless_reviews", ["is_malformed"], unique=False, schema="public")

    # ------------------------
    # Foreign Keys (after tables exist)
    # ------------------------
    op.create_foreign_key(
        "chat_analytics_session_id_fkey",
        "chat_analytics",
        "sessions",
        ["session_id"],
        ["session_id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "chat_conversations_session_id_fkey",
        "chat_conversations",
        "sessions",
        ["session_id"],
        ["session_id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "chat_messages_session_id_fkey",
        "chat_messages",
        "sessions",
        ["session_id"],
        ["session_id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "demographics_session_id_fkey",
        "demographics",
        "sessions",
        ["session_id"],
        ["session_id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "workflow_executions_session_id_fkey",
        "executions",
        "sessions",
        ["session_id"],
        ["session_id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "execution_checkpoints_execution_id_fkey",
        "execution_checkpoints",
        "executions",
        ["execution_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "execution_logs_execution_id_fkey",
        "execution_logs",
        "executions",
        ["execution_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "execution_summaries_session_id_fkey",
        "execution_summaries",
        "sessions",
        ["session_id"],
        ["session_id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_session",
        "survey_responses",
        "sessions",
        ["session_id"],
        ["session_id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )

    # ------------------------
    # View: survey_analysis
    # ------------------------
    op.execute(
        """
        CREATE VIEW public.survey_analysis AS
        SELECT sr.id,
               sr.participant_id,
               sr.session_id,
               sr.task_number,
               sr."condition",
               sr.completed_at,
               sr.duration_seconds,
               ROUND(((sr.nasa_tlx_mental_demand
                    + sr.nasa_tlx_temporal_demand
                    + (100 - sr.nasa_tlx_performance)
                    + sr.nasa_tlx_effort
                    + sr.nasa_tlx_frustration))::numeric / 5.0, 2)           AS nasa_tlx_overall_workload,
               ROUND(((sr.control_task + sr.agency_decisions)::numeric / 2.0), 2) AS h1a_control_score,
               ROUND(((sr.engagement + sr.recommend)::numeric / 2.0), 2)          AS h1b_engagement_score,
               ROUND(((sr.confidence_quality + sr.trust_results)::numeric / 2.0), 2) AS h1d_confidence_score,
               ROUND(((sr.process_transparency + sr.predictability
                    + sr.understood_choices + sr.understood_reasoning
                    + sr.could_explain)::numeric / 5.0), 2)                       AS h3_understanding_score,
               sr.accurate_reliable                                                AS h2_accuracy_perception,
               ROUND(((sr.ease_of_use + sr.efficiency)::numeric / 2.0), 2)         AS efficiency_score,
               ROUND(((sr.found_insights + sr.explored_thoroughly
                    + sr.discovered_insights + sr.accurate_reliable)::numeric / 4.0), 2) AS effectiveness_score
        FROM public.survey_responses sr;
        """
    )
    op.execute("COMMENT ON TABLE public.survey_responses IS 'Stores post-task survey responses including NASA-TLX, Likert scales, and open-ended feedback';")
    op.execute("COMMENT ON COLUMN public.survey_responses.participant_id IS 'Participant ID as INTEGER to match sessions table';")
    op.execute("COMMENT ON COLUMN public.survey_responses.session_id IS 'Foreign key to sessions.session_id (VARCHAR format)';")
    op.execute("COMMENT ON COLUMN public.survey_responses.duration_seconds IS 'Auto-calculated duration in seconds';")
    op.execute("COMMENT ON COLUMN public.survey_responses.nasa_tlx_performance IS 'NASA-TLX Performance: 0=Perfect to 100=Failure (reverse-coded in analysis)';")


def downgrade():
    # Drop view first
    op.execute("DROP VIEW IF EXISTS public.survey_analysis;")

    # Drop FKs
    for (src, name) in [
        ("survey_responses", "fk_session"),
        ("execution_summaries", "execution_summaries_session_id_fkey"),
        ("execution_logs", "execution_logs_execution_id_fkey"),
        ("execution_checkpoints", "execution_checkpoints_execution_id_fkey"),
        ("executions", "workflow_executions_session_id_fkey"),
        ("demographics", "demographics_session_id_fkey"),
        ("chat_messages", "chat_messages_session_id_fkey"),
        ("chat_conversations", "chat_conversations_session_id_fkey"),
        ("chat_analytics", "chat_analytics_session_id_fkey"),
    ]:
        op.drop_constraint(name, src, type_="foreignkey", schema="public")

    # Drop tables (reverse dependency order)
    for t in [
        "wireless_reviews",
        "shoes_reviews",
        "survey_responses",
        "execution_summaries",
        "execution_logs",
        "execution_checkpoints",
        "executions",
        "demographics",
        "session_errors",
        "interactions",
        "chat_analytics",
        "chat_messages",
        "chat_conversations",
        "sessions",
    ]:
        op.drop_table(t, schema="public")
