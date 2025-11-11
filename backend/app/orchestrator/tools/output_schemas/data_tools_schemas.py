# backend/app/orchestrator/tools/schemas/data_tools_schemas.py

"""
Pydantic schemas for data_tools.py outputs

Tools covered:
- LoadReviewsTool
- FilterReviewsTool  
- SortReviewsTool
- DataCleanerTool
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


# ============================================================
# LOAD REVIEWS TOOL
# ============================================================

class LoadReviewsFiltersApplied(BaseModel):
    """Filters that were applied during loading"""
    limit: Optional[int] = Field(None, ge=1, le=2000)
    offset: Optional[int] = Field(None, ge=0)


class LoadReviewsSummary(BaseModel):
    """Summary information for results registry"""
    records_loaded: int = Field(..., ge=0, description="Number of records loaded")
    category: str = Field(..., description="Category of reviews loaded (shoes/wireless)")
    total_available: int = Field(..., ge=0, description="Total records available matching filters")
    filters_applied: LoadReviewsFiltersApplied = Field(..., description="Filters that were applied")


class LoadReviewsOutput(BaseModel):
    """Output schema for LoadReviewsTool"""
    success: bool = Field(..., description="Whether the operation was successful")
    records: Optional[List[Dict[str, Any]]] = Field(None, description="Loaded review records")
    total: Optional[int] = Field(None, ge=0, description="Total number of matching records")
    category: Optional[str] = Field(None, description="Category of reviews (shoes/wireless)")
    execution_time_ms: Optional[int] = Field(None, ge=0, description="Execution time in milliseconds")
    summary: Optional[LoadReviewsSummary] = Field(None, description="Summary for results registry")
    
    # Error fields
    error: Optional[str] = Field(None, description="Error message if failed")
    error_type: Optional[Literal['missing_parameter', 'invalid_parameter', 'database_error']] = Field(
        None, 
        description="Type of error that occurred"
    )


# ============================================================
# FILTER REVIEWS TOOL
# ============================================================

class FilterCondition(BaseModel):
    """A single filter condition"""
    field: str = Field(..., description="Field to filter on")
    operator: str = Field(..., description="Comparison operator (eq, gt, lt, contains, etc)")
    value: Any = Field(..., description="Value to compare against")


class FilterReviewsCriteria(BaseModel):
    """Criteria used for filtering"""
    conditions: List[FilterCondition] = Field(..., description="List of filter conditions applied")
    match_mode: Literal['all', 'any'] = Field(..., description="Whether all or any conditions must match")


class FilterReviewsSummary(BaseModel):
    """Summary information for results registry"""
    operation: Literal['filter'] = Field(default='filter', description="Operation type")
    records_before: int = Field(..., ge=0, description="Number of records before filtering")
    records_after: int = Field(..., ge=0, description="Number of records after filtering")
    total_removed: int = Field(..., ge=0, description="Number of records removed")
    match_rate: float = Field(..., ge=0, le=100, description="Percentage of records that matched")
    filter_time_ms: int = Field(..., ge=0, description="Time taken to filter")


class FilterReviewsOutput(BaseModel):
    """Output schema for FilterReviewsTool"""
    success: bool = Field(..., description="Whether the operation was successful")
    filtered_records: Optional[List[Dict[str, Any]]] = Field(None, description="Filtered records")
    operation_type: Optional[Literal['filter']] = Field(None, description="Type of operation performed")
    criteria: Optional[FilterReviewsCriteria] = Field(None, description="Filter criteria applied")
    total: Optional[int] = Field(None, ge=0, description="Total number of records after filtering")
    category: Optional[str] = Field(None, description="Category of reviews")
    execution_time_ms: Optional[int] = Field(None, ge=0, description="Execution time in milliseconds")
    summary: Optional[FilterReviewsSummary] = Field(None, description="Summary for results registry")
    
    # Error fields
    error: Optional[str] = Field(None, description="Error message if failed")
    error_type: Optional[Literal['missing_parameter', 'invalid_criteria', 'execution_error']] = Field(
        None,
        description="Type of error that occurred"
    )


# ============================================================
# SORT REVIEWS TOOL
# ============================================================

class SortReviewsCriteria(BaseModel):
    """Criteria used for sorting"""
    sort_by: str = Field(..., description="Field to sort by")
    order: Literal['asc', 'desc'] = Field(..., description="Sort order (ascending/descending)")


class SortReviewsSummary(BaseModel):
    """Summary information for results registry"""
    operation: Literal['sort'] = Field(default='sort', description="Operation type")
    records_sorted: int = Field(..., ge=0, description="Number of records sorted")
    sort_by: str = Field(..., description="Field sorted by")
    order: Literal['asc', 'desc'] = Field(..., description="Sort order")
    sort_time_ms: int = Field(..., ge=0, description="Time taken to sort")


class SortReviewsOutput(BaseModel):
    """Output schema for SortReviewsTool"""
    success: bool = Field(..., description="Whether the operation was successful")
    sorted_records: Optional[List[Dict[str, Any]]] = Field(None, description="Sorted records")
    operation_type: Optional[Literal['sort']] = Field(None, description="Type of operation performed")
    criteria: Optional[SortReviewsCriteria] = Field(None, description="Sort criteria applied")
    total: Optional[int] = Field(None, ge=0, description="Total number of records")
    category: Optional[str] = Field(None, description="Category of reviews")
    execution_time_ms: Optional[int] = Field(None, ge=0, description="Execution time in milliseconds")
    summary: Optional[SortReviewsSummary] = Field(None, description="Summary for results registry")
    
    # Error fields
    error: Optional[str] = Field(None, description="Error message if failed")
    error_type: Optional[Literal['missing_parameter', 'invalid_field', 'execution_error']] = Field(
        None,
        description="Type of error that occurred"
    )


# ============================================================
# DATA CLEANER TOOL
# ============================================================

class CleaningOperationResult(BaseModel):
    """Result of a single cleaning operation"""
    enabled: bool = Field(..., description="Whether this operation was enabled")
    removed: int = Field(..., ge=0, description="Number of records removed by this operation")


class DataCleanerOperations(BaseModel):
    """Results of all cleaning operations"""
    missing_data: CleaningOperationResult = Field(..., description="Missing data removal results")
    spam: CleaningOperationResult = Field(..., description="Spam removal results")
    duplicates: CleaningOperationResult = Field(..., description="Duplicate removal results")


class DataCleanerCriteria(BaseModel):
    """Criteria used for cleaning"""
    remove_nulls: bool = Field(..., description="Whether to remove records with missing data")
    normalize_text: bool = Field(..., description="Whether to normalize text fields")
    remove_duplicates: bool = Field(..., description="Whether to remove duplicate records")
    operations: DataCleanerOperations = Field(..., description="Results of each operation")


class DataCleanerSummary(BaseModel):
    """Summary information for results registry"""
    operation: Literal['clean'] = Field(default='clean', description="Operation type")
    records_before: int = Field(..., ge=0, description="Number of records before cleaning")
    records_after: int = Field(..., ge=0, description="Number of records after cleaning")
    total_removed: int = Field(..., ge=0, description="Total number of records removed")
    missing_data_removed: int = Field(..., ge=0, description="Records removed due to missing data")
    spam_removed: int = Field(..., ge=0, description="Records removed as spam")
    duplicates_removed: int = Field(..., ge=0, description="Duplicate records removed")
    quality_score: float = Field(..., ge=0, le=100, description="Data quality score (% retained)")
    clean_time_ms: int = Field(..., ge=0, description="Time taken to clean")


class DataCleanerOutput(BaseModel):
    """Output schema for DataCleanerTool"""
    success: bool = Field(..., description="Whether the operation was successful")
    filtered_records: Optional[List[Dict[str, Any]]] = Field(None, description="Cleaned records")
    operation_type: Optional[Literal['clean']] = Field(None, description="Type of operation performed")
    criteria: Optional[DataCleanerCriteria] = Field(None, description="Cleaning criteria and results")
    total: Optional[int] = Field(None, ge=0, description="Total number of records after cleaning")
    category: Optional[str] = Field(None, description="Category of reviews")
    execution_time_ms: Optional[int] = Field(None, ge=0, description="Execution time in milliseconds")
    summary: Optional[DataCleanerSummary] = Field(None, description="Summary for results registry")
    
    # Error fields
    error: Optional[str] = Field(None, description="Error message if failed")
    error_type: Optional[Literal['missing_records', 'validation_error', 'unexpected_error']] = Field(
        None,
        description="Type of error that occurred"
    )


# ============================================================
# SPAM DETECTION DETAILS (used internally by DataCleanerTool)
# ============================================================

class SpamIndicators(BaseModel):
    """Indicators that a review might be spam"""
    excessive_caps: bool = Field(False, description="Contains excessive capitalization")
    repeated_chars: bool = Field(False, description="Contains repeated characters")
    suspicious_patterns: bool = Field(False, description="Contains suspicious patterns")
    url_count: int = Field(0, ge=0, description="Number of URLs found")
    emoji_count: int = Field(0, ge=0, description="Number of emojis found")


class SpamDetectionResult(BaseModel):
    """Result of spam detection for a single review"""
    review_id: str = Field(..., description="Review identifier")
    is_spam: bool = Field(..., description="Whether review was classified as spam")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score of classification")
    indicators: SpamIndicators = Field(..., description="Spam indicators detected")
    reason: Optional[str] = Field(None, description="Primary reason for spam classification")


# ============================================================
# COMBINED DATA TOOLS OUTPUT (for type unions)
# ============================================================

class DataToolsOutput(BaseModel):
    """
    Union type for all data tool outputs
    
    Use this for type hints when you need to handle any data tool output
    """
    success: bool = Field(..., description="Whether the operation was successful")
    records: Optional[List[Dict[str, Any]]] = Field(
        None, 
        description="Output records (may be 'records', 'filtered_records', or 'sorted_records')"
    )
    total: Optional[int] = Field(None, ge=0, description="Total number of records")
    category: Optional[str] = Field(None, description="Category of reviews")
    operation_type: Optional[Literal['load', 'filter', 'sort', 'clean']] = Field(
        None,
        description="Type of operation performed"
    )
    execution_time_ms: Optional[int] = Field(None, ge=0, description="Execution time in milliseconds")
    summary: Optional[Dict[str, Any]] = Field(None, description="Summary for results registry")
    error: Optional[str] = Field(None, description="Error message if failed")
    error_type: Optional[str] = Field(None, description="Type of error that occurred")