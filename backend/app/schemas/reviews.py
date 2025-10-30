# backend/app/schemas/reviews.py
"""
Pydantic schemas for product reviews
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import date
from typing import Optional, List, Generic, TypeVar
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class MalformedType(str, Enum):
    """Types of malformed reviews"""
    SPAM = "spam"
    MISSING_DATA = "missing_data"


class ReviewCategory(str, Enum):
    """Supported review categories"""
    SHOES = "Shoes"
    WIRELESS = "Wireless"


# ============================================================
# BASE SCHEMAS (DRY principle applied)
# ============================================================

class ReviewStudyBase(BaseModel):
    """
    Base schema for participant-facing reviews
    Only essential fields - hides internal metadata
    """
    review_id: str = Field(..., max_length=50)
    product_id: str = Field(..., max_length=50)
    product_title: str = Field(..., max_length=500)
    product_category: str = Field(..., max_length=50)
    review_headline: str = Field(default="", max_length=500)
    review_body: str = Field(default="", max_length=10000)
    star_rating: int = Field(..., ge=1, le=5, description="1-5 star rating")
    verified_purchase: bool
    helpful_votes: int = Field(..., ge=0)
    total_votes: int = Field(..., ge=0)
    customer_id: int = Field(..., gt=0)
    
    model_config = ConfigDict(from_attributes=True)


class ReviewFullBase(BaseModel):
    """
    Base schema for full review data (backend operations)
    Includes all fields including internal metadata
    """
    review_id: str = Field(..., max_length=50)
    product_id: str = Field(..., max_length=50)
    product_id_original: str = Field(..., max_length=50)
    product_title: str = Field(..., max_length=500)
    product_title_original: str = Field(..., max_length=500)
    product_parent: int = Field(..., gt=0)
    product_category: str = Field(..., max_length=50)
    star_rating: int = Field(..., ge=1, le=5)
    avg_star_rating: float = Field(..., ge=0.0, le=5.0)
    review_headline: str = Field(default="", max_length=500)
    review_body: str = Field(default="", max_length=10000)
    verified_purchase: bool
    review_date: date
    helpful_votes: int = Field(..., ge=0)
    total_votes: int = Field(..., ge=0)
    customer_id: int = Field(..., gt=0)
    vine: bool
    marketplace: str = Field(..., min_length=2, max_length=2)
    is_main_product: bool
    is_malformed: bool
    malformed_type: Optional[str] = Field(None, max_length=50)

    @field_validator('total_votes')
    @classmethod
    def validate_votes(cls, v: int, info) -> int:
        """Ensure total_votes >= helpful_votes"""
        helpful = info.data.get('helpful_votes', 0)
        if v < helpful:
            raise ValueError('total_votes must be >= helpful_votes')
        return v


class ReviewUpdateBase(BaseModel):
    """
    Base schema for partial review updates
    All fields optional for PATCH operations
    """
    review_id: Optional[str] = Field(None, max_length=50)
    product_title: Optional[str] = Field(None, max_length=500)
    star_rating: Optional[int] = Field(None, ge=1, le=5)
    review_headline: Optional[str] = Field(None, max_length=500)
    review_body: Optional[str] = Field(None, max_length=10000)
    helpful_votes: Optional[int] = Field(None, ge=0)
    total_votes: Optional[int] = Field(None, ge=0)
    is_malformed: Optional[bool] = None
    malformed_type: Optional[str] = Field(None, max_length=50)


# ============================================================
# SHOES REVIEW SCHEMAS
# ============================================================

class ShoesReviewCreate(ReviewFullBase):
    """Schema for creating shoes review"""
    product_category: str = Field(default="Shoes", pattern="^Shoes$")


class ShoesReviewResponse(ReviewFullBase):
    """Full shoes review response (backend)"""
    id: int
    model_config = ConfigDict(from_attributes=True)


class ShoesReviewStudy(ReviewStudyBase):
    """Shoes review for study participants (reduced fields)"""
    product_category: str = Field(default="Shoes", pattern="^Shoes$")


class ShoesReviewUpdate(ReviewUpdateBase):
    """Partial update schema for shoes reviews"""
    pass


# ============================================================
# WIRELESS REVIEW SCHEMAS
# ============================================================

class WirelessReviewCreate(ReviewFullBase):
    """Schema for creating wireless review"""
    product_category: str = Field(default="Wireless", pattern="^Wireless$")


class WirelessReviewResponse(ReviewFullBase):
    """Full wireless review response (backend)"""
    id: int
    model_config = ConfigDict(from_attributes=True)


class WirelessReviewStudy(ReviewStudyBase):
    """Wireless review for study participants (reduced fields)"""
    product_category: str = Field(default="Wireless", pattern="^Wireless$")


class WirelessReviewUpdate(ReviewUpdateBase):
    """Partial update schema for wireless reviews"""
    pass


# ============================================================
# GENERIC LIST RESPONSES (Uses Type Variable for reusability)
# ============================================================

T = TypeVar('T', bound=BaseModel)

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response
    Works with any review type
    """
    reviews: List[T]
    total: int
    limit: int
    offset: int


# Specific typed aliases for better IDE support
ShoesReviewListResponse = PaginatedResponse[ShoesReviewResponse]
ShoesReviewStudyListResponse = PaginatedResponse[ShoesReviewStudy]
WirelessReviewListResponse = PaginatedResponse[WirelessReviewResponse]
WirelessReviewStudyListResponse = PaginatedResponse[WirelessReviewStudy]


# ============================================================
# FILTER/QUERY SCHEMAS
# ============================================================

class ReviewFilterParams(BaseModel):
    """
    Unified filter parameters for all review types
    Used for GET /api/reviews/{category}?params
    """
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    max_rating: Optional[int] = Field(None, ge=1, le=5)
    verified_only: Optional[bool] = None
    exclude_malformed: Optional[bool] = True  # Default to excluding spam
    malformed_type: Optional[MalformedType] = None
    product_id: Optional[str] = None
    is_main_product: Optional[bool] = None
    limit: int = Field(default=100, ge=1, le=2000)
    offset: int = Field(default=0, ge=0)
    
    @field_validator('max_rating')
    @classmethod
    def validate_rating_range(cls, v: Optional[int], info) -> Optional[int]:
        """Ensure max_rating >= min_rating"""
        if v is not None and 'min_rating' in info.data:
            min_rating = info.data['min_rating']
            if min_rating is not None and v < min_rating:
                raise ValueError('max_rating must be >= min_rating')
        return v


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def to_study_format(review) -> ReviewStudyBase:
    """
    Convert full review model to study-safe format
    Works with any review type (Shoes/Wireless)
    
    Args:
        review: ShoesReview or WirelessReview SQLAlchemy model
        
    Returns:
        ReviewStudyBase with only participant-visible fields
    """
    return ReviewStudyBase(
        review_id=review.review_id,
        product_id=review.product_id,
        product_title=review.product_title,
        product_category=review.product_category,
        review_headline=review.review_headline  or "",
        review_body=review.review_body  or "",
        star_rating=review.star_rating,
        verified_purchase=review.verified_purchase,
        helpful_votes=review.helpful_votes,
        total_votes=review.total_votes,
        customer_id=review.customer_id
    )


def batch_to_study_format(reviews: List) -> List[ReviewStudyBase]:
    """
    Convert list of review models to study-safe format
    
    Args:
        reviews: List of review models (any category)
        
    Returns:
        List of ReviewStudyBase objects
    """
    return [to_study_format(review) for review in reviews]


def get_response_schema(category: str, study_mode: bool = False):
    """
    Factory function to get the correct response schema
    
    Args:
        category: 'shoes' or 'wireless'
        study_mode: If True, returns study schema (reduced fields)
        
    Returns:
        Appropriate response schema class
        
    Example:
        schema = get_response_schema('shoes', study_mode=True)
        # Returns ShoesReviewStudy
    """
    category_lower = category.lower()
    
    schema_map = {
        ('shoes', False): ShoesReviewResponse,
        ('shoes', True): ShoesReviewStudy,
        ('wireless', False): WirelessReviewResponse,
        ('wireless', True): WirelessReviewStudy,
    }
    
    key = (category_lower, study_mode)
    if key not in schema_map:
        raise ValueError(f"Unsupported category: {category}")
    
    return schema_map[key]