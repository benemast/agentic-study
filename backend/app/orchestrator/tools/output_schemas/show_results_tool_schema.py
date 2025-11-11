# backend/app/orchestrator/tools/schemas/show_results_tool_schema.py
"""
Output Schemas for Tools - Pydantic Models for Tool Results

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

# ============================================================
# OUTPUT TOOL OUTPUT
# ============================================================

"""
Pydantic schemas for ShowResultsTool section outputs
"""

# ============================================================
# EXECUTIVE SUMMARY SECTION
# ============================================================

class ExecutiveSummaryContent(BaseModel):
    """Content for executive summary section"""
    summary: List[str] = Field(..., description="List of 3-5 key takeaway bullet points")
    record_count: int = Field(..., description="Number of records analyzed")
    generated_at: str = Field(..., description="Timestamp when summary was generated")
    note: Optional[str] = Field(None, description="Optional note (e.g., if fallback was used)")


class ExecutiveSummarySection(BaseModel):
    """Executive summary section output"""
    available: bool = Field(..., description="Whether section data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    content: Optional[ExecutiveSummaryContent] = Field(None, description="Summary content if available")


# ============================================================
# THEMES SECTION
# ============================================================

class ThemeStatistic(BaseModel):
    """Statistics for a single theme"""
    theme: str = Field(..., description="Theme name/category")
    mention_count: int = Field(..., description="Number of times theme was mentioned")
    percentage: float = Field(..., description="Percentage of records mentioning this theme")
    sentiment: Optional[str] = Field(None, description="Sentiment associated with theme (positive/neutral/negative)")
    weighted_score: Optional[float] = Field(None, description="Weighted importance/relevance score for the theme")
    estimated_total_count: Optional[int] = Field(None, description="Estimated total occurrences across full dataset")



class ThemesContent(BaseModel):
    """Content for themes section"""
    themes: List[ThemeStatistic] = Field(..., description="List of theme statistics")
    total_themes: int = Field(..., description="Total number of unique themes identified")
    records_analyzed: int = Field(..., description="Number of records analyzed for themes")


class ThemesSection(BaseModel):
    """Themes section output"""
    available: bool = Field(..., description="Whether section data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    content: Optional[ThemesContent] = Field(None, description="Themes content if available")


# ============================================================
# RECOMMENDATIONS SECTION
# ============================================================

class Recommendation(BaseModel):
    """Single business recommendation"""
    priority: Literal['high', 'medium', 'low'] = Field(..., description="Recommendation priority level")
    category: str = Field(..., description="Category of recommendation (e.g., 'Customer Satisfaction')")
    recommendation: str = Field(..., description="The recommendation text")
    impact: str = Field(..., description="Expected impact of implementing recommendation")


class RecommendationsContent(BaseModel):
    """Content for recommendations section"""
    recommendations: List[Recommendation] = Field(..., description="List of business recommendations")
    total_recommendations: int = Field(..., description="Total number of recommendations generated")
    high_priority_count: Optional[int] = Field(None, description="Number of high priority recommendations")
    generated_at: Optional[str] = Field(None, description="Timestamp when recommendations were generated")


class RecommendationsSection(BaseModel):
    """Recommendations section output"""
    available: bool = Field(..., description="Whether section data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    content: Optional[RecommendationsContent] = Field(None, description="Recommendations content if available")


# ============================================================
# STATISTICS SECTION
# ============================================================

class SentimentDistributionData(BaseModel):
    """Statistics for a single sentiment category"""
    count: int = Field(..., description="Number of reviews with this sentiment")
    percentage: float = Field(..., description="Percentage of reviews with this sentiment")


class SentimentDistribution(BaseModel):
    """Sentiment distribution statistics"""
    available: bool = Field(..., description="Whether sentiment data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    total_analyzed: Optional[int] = Field(None, description="Total number of reviews analyzed for sentiment")
    distribution: Optional[Dict[Literal['positive', 'neutral', 'negative'], SentimentDistributionData]] = Field(
        None, 
        description="Distribution of sentiments"
    )


class ReviewSummary(BaseModel):
    """General review statistics"""
    available: bool = Field(..., description="Whether data is available")
    total_reviews: int = Field(..., description="Total number of reviews")
    avg_review_body_length: float = Field(..., description="Average length of review body in characters")
    avg_review_headline_length: float = Field(..., description="Average length of review headline in characters")
    verified_count: int = Field(..., description="Number of verified purchase reviews")


class RatingDistributionData(BaseModel):
    """Statistics for a single rating level"""
    count: int = Field(..., description="Number of reviews with this rating")
    percentage: float = Field(..., description="Percentage of reviews with this rating")


class RatingDistribution(BaseModel):
    """Rating distribution statistics"""
    available: bool = Field(..., description="Whether rating data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    total_rated: Optional[int] = Field(None, description="Total number of rated reviews")
    average_rating: Optional[float] = Field(None, description="Average star rating")
    distribution: Optional[Dict[str, RatingDistributionData]] = Field(
        None, 
        description="Distribution of ratings (1-5 stars)"
    )


class VerifiedRate(BaseModel):
    """Verified purchase rate statistics"""
    available: bool = Field(..., description="Whether data is available")
    total_reviews: int = Field(..., description="Total number of reviews")
    verified_count: int = Field(..., description="Number of verified purchases")
    verified_percentage: float = Field(..., description="Percentage of verified purchases")
    non_verified_count: int = Field(..., description="Number of non-verified purchases")


class ThemeCoverage(BaseModel):
    """Theme coverage statistics"""
    available: bool = Field(..., description="Whether theme data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    total_themes_identified: Optional[int] = Field(None, description="Total number of unique themes identified")
    top_themes: Optional[List[str]] = Field(None, description="Top 3 most common themes")
    reviews_with_themes: Optional[int] = Field(None, description="Number of reviews containing themes")


class SentimentConsistency(BaseModel):
    """Sentiment consistency with ratings"""
    available: bool = Field(..., description="Whether data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    total_compared: Optional[int] = Field(None, description="Total number of reviews compared")
    aligned_count: Optional[int] = Field(None, description="Number of aligned sentiment-rating pairs")
    misaligned_count: Optional[int] = Field(None, description="Number of misaligned pairs")
    consistency_percentage: Optional[float] = Field(None, description="Percentage of aligned pairs")
    note: Optional[str] = Field(None, description="Explanatory note about the metric")


class StatisticsContent(BaseModel):
    """Content for statistics section"""
    statistics: Dict[str, Any] = Field(
        ..., 
        description="Dictionary of calculated statistics (keys are metric names)"
    )
    visualizations: Optional[Dict[str, Any]] = Field(None, description="Generated visualizations if requested")
    metrics_calculated: List[str] = Field(..., description="List of metrics that were calculated")
    has_visualizations: bool = Field(..., description="Whether visualizations were generated")


class StatisticsSection(BaseModel):
    """Statistics section output"""
    available: bool = Field(..., description="Whether section data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    content: Optional[StatisticsContent] = Field(None, description="Statistics content if available")


# ============================================================
# DATA PREVIEW SECTION
# ============================================================

class DataPreviewContent(BaseModel):
    """Content for data preview section"""
    records: List[Dict[str, Any]] = Field(..., description="List of preview records")
    total_records: int = Field(..., description="Total number of records available")
    preview_count: int = Field(..., description="Number of records in preview")
    showing_all: bool = Field(..., description="Whether all records are shown")


class DataPreviewSection(BaseModel):
    """Data preview section output"""
    available: bool = Field(..., description="Whether section data is available")
    message: Optional[str] = Field(None, description="Message if unavailable")
    content: Optional[DataPreviewContent] = Field(None, description="Preview content if available")


# ============================================================
# MAIN SHOW RESULTS OUTPUT
# ============================================================

class ShowResultsMetadata(BaseModel):
    """Metadata for show results output"""
    sections_requested: List[str] = Field(..., description="Sections that were requested")
    sections_available: List[str] = Field(..., description="Sections that are available")
    sections_unavailable: List[str] = Field(..., description="Sections that are unavailable")
    total_records: int = Field(..., description="Total number of records")
    has_sentiment: bool = Field(..., description="Whether sentiment analysis data exists")
    has_insights: bool = Field(..., description="Whether insights data exists")
    processed_at: str = Field(..., description="Timestamp of processing")


class ShowResultsSections(BaseModel):
    """Container for all sections"""
    executive_summary: Optional[ExecutiveSummarySection] = None
    themes: Optional[ThemesSection] = None
    recommendations: Optional[RecommendationsSection] = None
    statistics: Optional[StatisticsSection] = None
    data_preview: Optional[DataPreviewSection] = None


class ShowResultsData(BaseModel):
    """Data payload for show results output"""
    sections: ShowResultsSections = Field(..., description="Generated sections")
    metadata: ShowResultsMetadata = Field(..., description="Metadata about the results")


class ShowResultsOutput(BaseModel):
    """Complete output schema for ShowResultsTool"""
    success: bool = Field(..., description="Whether the operation was successful")
    data: Optional[ShowResultsData] = Field(None, description="Results data if successful")
    error: Optional[str] = Field(None, description="Error message if failed")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Tool metadata")