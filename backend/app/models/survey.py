# backend/app/models/survey.py
"""
SQLAlchemy model for survey responses
Stores post-task survey data including NASA-TLX, Likert scales, and open-ended feedback
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, CheckConstraint, ForeignKey, UniqueConstraint, Computed
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from app.database import Base


class SurveyResponse(Base):
    """
    Survey Response Model
    
    Stores post-task survey responses for both workflow_builder and ai_assistant conditions.
    Each participant completes 2 surveys (one per task/condition).
    """
    __tablename__ = "survey_responses"
    
    # ============================================================
    # PRIMARY IDENTIFICATION
    # ============================================================
    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, nullable=False, index=True)  # Changed from String(50) to Integer
    session_id = Column(String, nullable=False, index=True)  # Removed ForeignKey - constraint exists in DB
    task_number = Column(Integer, nullable=False, index=True)  # 1 or 2
    condition = Column(String(20), nullable=False, index=True)  # 'workflow_builder' or 'ai_assistant'
    
    # ============================================================
    # TIMESTAMPS
    # ============================================================
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False, index=True)
    # duration_seconds is auto-calculated by PostgreSQL - marked as Computed so SQLAlchemy doesn't insert it
    duration_seconds = Column(Integer, Computed("EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER"))
    
    # ============================================================
    # SECTION 1: NASA-TLX (5 dimensions, 0-100 scale)
    # ============================================================
    nasa_tlx_mental_demand = Column(Integer)  # How mentally demanding
    nasa_tlx_temporal_demand = Column(Integer)  # How hurried/rushed
    nasa_tlx_performance = Column(Integer)  # How successful (0=Perfect, 100=Failure - REVERSE CODED)
    nasa_tlx_effort = Column(Integer)  # How hard to work
    nasa_tlx_frustration = Column(Integer)  # How frustrated
    
    # ============================================================
    # SECTION 2: CONTROL, AGENCY & ENGAGEMENT (5 items, 1-7 Likert)
    # Tests: H1a (Control), H1b (Engagement), H1d (Confidence)
    # ============================================================
    control_task = Column(Integer)  # Felt in control
    agency_decisions = Column(Integer)  # Made meaningful decisions
    engagement = Column(Integer)  # Remained focused and engaged
    confidence_quality = Column(Integer)  # Confident in analysis quality
    trust_results = Column(Integer)  # Trust the results
    
    # ============================================================
    # SECTION 3: UNDERSTANDING & EXPLAINABILITY (5 items, 1-7 Likert)
    # Tests: H3 (Understanding), H4 (Error detection)
    # ============================================================
    process_transparency = Column(Integer)  # Understood what system did
    predictability = Column(Integer)  # System behavior predictable
    understood_choices = Column(Integer)  # Understood why system made choices
    understood_reasoning = Column(Integer)  # Understood reasoning behind suggestions
    could_explain = Column(Integer)  # Could explain conclusions
    
    # ============================================================
    # SECTION 4: TASK PERFORMANCE & OUTCOMES (7 items, 1-7 Likert)
    # Tests: H2 (Accuracy - perceived), Efficiency, Effectiveness
    # ============================================================
    # Efficiency
    ease_of_use = Column(Integer)  # System was easy to use
    efficiency = Column(Integer)  # Completed task efficiently
    
    # Effectiveness
    found_insights = Column(Integer)  # Found insights looking for
    explored_thoroughly = Column(Integer)  # Explored data thoroughly
    discovered_insights = Column(Integer)  # Discovered new insights
    accurate_reliable = Column(Integer)  # Results accurate and reliable
    
    # Recommendation
    recommend = Column(Integer)  # Would recommend system
    
    # ============================================================
    # SECTION 5: OPEN-ENDED FEEDBACK (3 text fields, optional)
    # ============================================================
    feedback_positive = Column(Text, nullable=True)  # What liked most
    feedback_negative = Column(Text, nullable=True)  # What frustrated/could improve
    feedback_improvements = Column(Text, nullable=True)  # Suggestions for improvements
    
    # ============================================================
    # METADATA
    # ============================================================
    language = Column(String(5), nullable=False, default='en')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # ============================================================
    # RELATIONSHIPS
    # ============================================================
    # Commented out to avoid circular import issues
    # session = relationship("Session", back_populates="survey_responses")
    
    # ============================================================
    # TABLE CONSTRAINTS
    # ============================================================
    __table_args__ = (
        # Unique constraint: One survey per participant per task per condition
        UniqueConstraint('participant_id', 'task_number', 'condition', 
                        name='uq_participant_task_condition'),
        
        # Check constraints for valid values
        CheckConstraint('task_number IN (1, 2)', name='check_task_number'),
        CheckConstraint("condition IN ('workflow_builder', 'ai_assistant')", name='check_condition'),
        
        # NASA-TLX range checks (0-100)
        CheckConstraint('nasa_tlx_mental_demand >= 0 AND nasa_tlx_mental_demand <= 100', 
                       name='check_nasa_mental'),
        CheckConstraint('nasa_tlx_temporal_demand >= 0 AND nasa_tlx_temporal_demand <= 100', 
                       name='check_nasa_temporal'),
        CheckConstraint('nasa_tlx_performance >= 0 AND nasa_tlx_performance <= 100', 
                       name='check_nasa_performance'),
        CheckConstraint('nasa_tlx_effort >= 0 AND nasa_tlx_effort <= 100', 
                       name='check_nasa_effort'),
        CheckConstraint('nasa_tlx_frustration >= 0 AND nasa_tlx_frustration <= 100', 
                       name='check_nasa_frustration'),
        
        # Likert range checks (1-7)
        CheckConstraint('control_task >= 1 AND control_task <= 7', name='check_likert_control_task'),
        CheckConstraint('agency_decisions >= 1 AND agency_decisions <= 7', name='check_likert_agency'),
        CheckConstraint('engagement >= 1 AND engagement <= 7', name='check_likert_engagement'),
        CheckConstraint('confidence_quality >= 1 AND confidence_quality <= 7', name='check_likert_confidence'),
        CheckConstraint('trust_results >= 1 AND trust_results <= 7', name='check_likert_trust'),
        CheckConstraint('process_transparency >= 1 AND process_transparency <= 7', name='check_likert_transparency'),
        CheckConstraint('predictability >= 1 AND predictability <= 7', name='check_likert_predictability'),
        CheckConstraint('understood_choices >= 1 AND understood_choices <= 7', name='check_likert_choices'),
        CheckConstraint('understood_reasoning >= 1 AND understood_reasoning <= 7', name='check_likert_reasoning'),
        CheckConstraint('could_explain >= 1 AND could_explain <= 7', name='check_likert_explain'),
        CheckConstraint('ease_of_use >= 1 AND ease_of_use <= 7', name='check_likert_ease'),
        CheckConstraint('efficiency >= 1 AND efficiency <= 7', name='check_likert_efficiency'),
        CheckConstraint('found_insights >= 1 AND found_insights <= 7', name='check_likert_insights'),
        CheckConstraint('explored_thoroughly >= 1 AND explored_thoroughly <= 7', name='check_likert_explore'),
        CheckConstraint('discovered_insights >= 1 AND discovered_insights <= 7', name='check_likert_discover'),
        CheckConstraint('accurate_reliable >= 1 AND accurate_reliable <= 7', name='check_likert_accurate'),
        CheckConstraint('recommend >= 1 AND recommend <= 7', name='check_likert_recommend'),
    )
    
    def __repr__(self):
        return f"<SurveyResponse(id={self.id}, participant={self.participant_id}, task={self.task_number}, condition={self.condition})>"
    
    # ============================================================
    # COMPUTED PROPERTIES FOR ANALYSIS
    # ============================================================
    
    @property
    def nasa_tlx_overall_workload(self) -> float:
        """
        Calculate overall NASA-TLX workload score
        Note: Performance is reverse-coded (lower is better)
        """
        scores = [
            self.nasa_tlx_mental_demand,
            self.nasa_tlx_temporal_demand,
            100 - self.nasa_tlx_performance,  # Reverse code
            self.nasa_tlx_effort,
            self.nasa_tlx_frustration
        ]
        valid_scores = [s for s in scores if s is not None]
        return round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None
    
    @property
    def h1a_control_score(self) -> float:
        """Hypothesis H1a: Control and Agency score"""
        scores = [self.control_task, self.agency_decisions]
        valid_scores = [s for s in scores if s is not None]
        return round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None
    
    @property
    def h1b_engagement_score(self) -> float:
        """Hypothesis H1b: Engagement and Satisfaction score"""
        scores = [self.engagement, self.recommend]
        valid_scores = [s for s in scores if s is not None]
        return round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None
    
    @property
    def h1d_confidence_score(self) -> float:
        """Hypothesis H1d: Confidence in results score"""
        scores = [self.confidence_quality, self.trust_results]
        valid_scores = [s for s in scores if s is not None]
        return round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None
    
    @property
    def h3_understanding_score(self) -> float:
        """Hypothesis H3: Understanding and Explainability score"""
        scores = [
            self.process_transparency,
            self.predictability,
            self.understood_choices,
            self.understood_reasoning,
            self.could_explain
        ]
        valid_scores = [s for s in scores if s is not None]
        return round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None
    
    @property
    def efficiency_score(self) -> float:
        """Efficiency: Ease of use and completion efficiency"""
        scores = [self.ease_of_use, self.efficiency]
        valid_scores = [s for s in scores if s is not None]
        return round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None
    
    @property
    def effectiveness_score(self) -> float:
        """Effectiveness: Finding and discovering insights"""
        scores = [
            self.found_insights,
            self.explored_thoroughly,
            self.discovered_insights,
            self.accurate_reliable
        ]
        valid_scores = [s for s in scores if s is not None]
        return round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None