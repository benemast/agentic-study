# backend/app/orchestrator/llm/tool_output_schemas.py
"""
Tool Output Schemas - Pydantic Models for Tool Results

Based on SharedWorkflowState structure, these schemas define expected outputs
from each tool for type-safe validation and LangChain integration.

Usage:
    # Validate tool output
    result = await tool.execute(input_data)
    validated = SentimentAnalysisOutput(**result['data'])
    
    # Use with LangChain structured output
    llm_output = await llm.get_structured_output(
        output_schema=GenerateInsightsOutput
    )
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime, timezone


# ============================================================
# COMMON OUTPUT MODELS
# ============================================================

class ToolExecutionMetadata(BaseModel):
    """Common metadata for all tool executions"""
    tool_id: str
    tool_name: str
    execution_time_ms: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    success: bool = True
    error: Optional[str] = None


class RecordsSummary(BaseModel):
    """Summary of record operations"""
    total_records: int
    records_before: Optional[int] = None
    records_after: Optional[int] = None
    records_removed: Optional[int] = None
    operation_type: Optional[Literal['filter', 'clean', 'sort']] = None


# ============================================================
# DATA TOOL OUTPUTS
# ============================================================

class LoadReviewsOutput(BaseModel):
    """Output from load_reviews tool"""
    success: bool
    data: Dict[str, Any] = Field(
        description="Loaded data with records and metadata"
    )
    execution_time_ms: int
    metadata: Dict[str, Any] = Field(
        description="Tool execution metadata including row count, category, etc."
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "records": [...],
                    "record_count": 1500,
                    "category": "shoes",
                    "sql_query": "SELECT * FROM reviews WHERE..."
                },
                "execution_time_ms": 250,
                "metadata": {
                    "tool": "load_reviews",
                    "rows_loaded": 1500
                }
            }
        }


class FilterReviewsOutput(BaseModel):
    """Output from filter_reviews tool"""
    success: bool
    data: Dict[str, Any] = Field(
        description="Filtered dataset with operation history"
    )
    execution_time_ms: int
    metadata: Dict[str, Any] = Field(
        description="Filter operation details"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "records": [...],
                    "filtered_count": 750,
                    "operation_applied": {
                        "tool_name": "filter_reviews",
                        "rows_before": 1500,
                        "rows_after": 750
                    }
                },
                "execution_time_ms": 50,
                "metadata": {
                    "tool": "filter_reviews",
                    "filters_applied": [...]
                }
            }
        }


class SortReviewsOutput(BaseModel):
    """Output from sort_reviews tool"""
    success: bool
    data: Dict[str, Any]
    execution_time_ms: int
    metadata: Dict[str, Any]


class CleanDataOutput(BaseModel):
    """Output from clean_data tool"""
    success: bool
    data: Dict[str, Any] = Field(
        description="Cleaned dataset with operation history"
    )
    execution_time_ms: int
    metadata: Dict[str, Any]


# ============================================================
# ANALYSIS TOOL OUTPUTS
# ============================================================

class SentimentDistribution(BaseModel):
    """Sentiment distribution statistics"""
    positive: int = 0
    neutral: int = 0
    negative: int = 0
    
    @property
    def total(self) -> int:
        return self.positive + self.neutral + self.negative
    
    def get_percentages(self) -> Dict[str, float]:
        """Calculate percentage distribution"""
        total = self.total
        if total == 0:
            return {'positive': 0, 'neutral': 0, 'negative': 0}
        
        return {
            'positive': round((self.positive / total) * 100, 1),
            'neutral': round((self.neutral / total) * 100, 1),
            'negative': round((self.negative / total) * 100, 1)
        }


class ThemeData(BaseModel):
    """Theme/topic extraction data"""
    theme: str
    count: int
    percentage: Optional[float] = None
    sentiment: Optional[Literal['positive', 'neutral', 'negative']] = None


class SentimentAnalysisOutput(BaseModel):
    """
    Output from review_sentiment_analysis tool
    
    Contains enriched records with sentiment columns and optional theme analysis
    """
    success: bool
    data: Dict[str, Any] = Field(
        description="Dataset enriched with sentiment and themes"
    )
    execution_time_ms: int
    metadata: Dict[str, Any] = Field(
        description="Analysis details including batch processing info"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "records": [...],  # With sentiment, sentiment_score, themes columns
                    "sentiment_summary": {
                        "positive": 450,
                        "neutral": 200,
                        "negative": 100
                    },
                    "themes": [
                        {"theme": "sound quality", "count": 245, "percentage": 32.7},
                        {"theme": "comfort", "count": 189, "percentage": 25.2}
                    ]
                },
                "execution_time_ms": 12500,
                "metadata": {
                    "tool": "review_sentiment_analysis",
                    "batches_processed": 8,
                    "enrichment_applied": True
                }
            }
        }


# ============================================================
# GENERATION TOOL OUTPUTS
# ============================================================

class BusinessInsight(BaseModel):
    """Single business insight"""
    insight: str = Field(description="The insight text")
    confidence: Literal['high', 'medium', 'low'] = Field(
        description="Confidence level in the insight"
    )
    category: Optional[Literal['shoes', 'wireless']] = Field(
        None,
        description="Insight category (e.g., 'product_quality', 'customer_satisfaction')"
    )
    supporting_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Data points supporting this insight"
    )


class GenerateInsightsOutput(BaseModel):
    """
    Output from generate_insights tool
    
    LLM-generated business insights with ReAct reasoning
    """
    success: bool
    data: Dict[str, Any] = Field(
        description="Data with added insights"
    )
    execution_time_ms: int
    metadata: Dict[str, Any] = Field(
        description="Insight generation metadata including reasoning trace"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "records": [...],
                    "insights": [
                        {
                            "insight": "Sound quality is the primary driver of positive reviews",
                            "confidence": "high",
                            "category": "product_quality",
                            "supporting_data": {
                                "mentions": 245,
                                "positive_sentiment_correlation": 0.82
                            }
                        }
                    ],
                    "insight_reasoning": "Analysis shows strong correlation..."
                },
                "execution_time_ms": 8500,
                "metadata": {
                    "tool": "generate_insights",
                    "insights_count": 5,
                    "reasoning_tokens": 850
                }
            }
        }


# ============================================================
# OUTPUT TOOL OUTPUT
# ============================================================

class ExecutiveSummary(BaseModel):
    """Executive summary section"""
    total_records_processed: int
    transformations_applied: int
    sentiment_distribution: Optional[SentimentDistribution] = None
    key_findings: List[str]


class PipelineSummary(BaseModel):
    """Pipeline execution summary"""
    steps_executed: int
    total_execution_time_ms: int
    data_operations: List[Dict[str, Any]]


class ShowResultsOutput(BaseModel):
    """
    Output from show_results tool (final tool in pipeline)
    
    Comprehensive formatted results with executive summary
    """
    success: bool
    data: Dict[str, Any] = Field(
        description="Formatted final results"
    )
    execution_time_ms: int
    metadata: Dict[str, Any] = Field(
        description="Indicates this is final output"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "executive_summary": {
                        "total_records_processed": 750,
                        "transformations_applied": 3,
                        "key_findings": [
                            "Strong customer satisfaction (68% positive)",
                            "Sound quality is primary concern"
                        ]
                    },
                    "pipeline_summary": {
                        "steps_executed": 5,
                        "total_execution_time_ms": 25000
                    },
                    "data_summary": {...},
                    "key_insights": [...],
                    "recommendations": [...],
                    "final_dataset": {
                        "records": [...],
                        "record_count": 750
                    }
                },
                "execution_time_ms": 150,
                "metadata": {
                    "tool": "show_results",
                    "output_ready": True,
                    "is_final_output": True
                }
            }
        }


# ============================================================
# AGENT DECISION OUTPUT (for decision_maker)
# ============================================================

class AgentDecisionOutput(BaseModel):
    """
    Output from decision_maker (ReAct agent)
    
    Structured decision with reasoning
    """
    action: Literal['load', 'filter', 'sort', 'clean', 'analyze', 'generate', 'output', 'finish']
    tool_name: Optional[str] = Field(
        None,
        description="Tool to use (null for finish action)"
    )
    reasoning: str = Field(
        description="Agent's reasoning for this decision"
    )
    tool_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters for the selected tool"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score (0-1)"
    )
    alternatives_considered: List[str] = Field(
        default_factory=list,
        description="Other options the agent considered"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "action": "analyze",
                "tool_name": "review_sentiment_analysis",
                "reasoning": "Based on the current state with 750 filtered reviews, sentiment analysis is the logical next step to understand customer opinions before generating insights.",
                "tool_params": {
                    "extract_themes": True,
                    "theme_separation": "by_sentiment"
                },
                "confidence": 0.92,
                "alternatives_considered": [
                    "generate_insights (premature without sentiment data)",
                    "filter_reviews (already filtered optimally)"
                ]
            }
        }


# ============================================================
# SCHEMA REGISTRY
# ============================================================

OUTPUT_SCHEMAS = {
    'load_reviews': LoadReviewsOutput,
    'filter_reviews': FilterReviewsOutput,
    'sort_reviews': SortReviewsOutput,
    'clean_data': CleanDataOutput,
    'review_sentiment_analysis': SentimentAnalysisOutput,
    'sentiment_analysis': SentimentAnalysisOutput,  # Alias
    'generate_insights': GenerateInsightsOutput,
    'show_results': ShowResultsOutput,
    'decision_maker': AgentDecisionOutput,
}


def get_output_schema(tool_name: str) -> Optional[type[BaseModel]]:
    """
    Get output schema for a tool
    
    Args:
        tool_name: Tool identifier
        
    Returns:
        Pydantic model class or None
    """
    return OUTPUT_SCHEMAS.get(tool_name)


def validate_tool_output(tool_name: str, output: Dict[str, Any]) -> BaseModel:
    """
    Validate tool output against schema
    
    Args:
        tool_name: Tool identifier
        output: Raw output dict
        
    Returns:
        Validated Pydantic model
        
    Raises:
        ValueError: If validation fails
    """
    schema = get_output_schema(tool_name)
    
    if schema is None:
        raise ValueError(f"No output schema defined for tool: {tool_name}")
    
    try:
        return schema(**output)
    except Exception as e:
        raise ValueError(f"Output validation failed for {tool_name}: {e}")


__all__ = [
    # Common models
    'ToolExecutionMetadata',
    'RecordsSummary',
    
    # Data tool outputs
    'LoadReviewsOutput',
    'FilterReviewsOutput',
    'SortReviewsOutput',
    'CleanDataOutput',
    
    # Analysis outputs
    'SentimentDistribution',
    'ThemeData',
    'SentimentAnalysisOutput',
    
    # Generation outputs
    'BusinessInsight',
    'GenerateInsightsOutput',
    
    # Output formatting
    'ExecutiveSummary',
    'PipelineSummary',
    'ShowResultsOutput',
    
    # Agent decision
    'AgentDecisionOutput',
    
    # Registry
    'OUTPUT_SCHEMAS',
    'get_output_schema',
    'validate_tool_output',
]