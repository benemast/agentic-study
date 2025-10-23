# backend/app/schemas/reviews.py
"""
Pydantic schemas for product reviews
"""
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional, List
from enum import Enum


class MalformedType(str, Enum):
    """Enum for malformed review types"""
    SPAM = "spam"
    MISSING_DATA = "missing_data"


# ============================================================
# STUDY SCHEMA (Participant-facing, reduced fields)
# ============================================================

class ReviewStudy(BaseModel):
    """
    Reduced schema for use during study
    Only essential fields visible to participants
    """
    review_id: str = Field(..., max_length=50)
    product_id: str = Field(..., max_length=50)
    product_title: str = Field(..., max_length=500)
    product_category: str = Field(..., max_length=50)
    review_headline: str = Field(default="", max_length=500)
    review_body: str = Field(default="", max_length=10000)
    star_rating: int = Field(..., ge=1, le=5)
    verified_purchase: bool
    helpful_votes: int = Field(..., ge=0)
    total_votes: int = Field(..., ge=0)
    customer_id: int = Field(..., gt=0)
    
    class Config:
        from_attributes = True


# ============================================================
# FULL BASE SCHEMA (Backend use only)
# ============================================================

class ReviewBase(BaseModel):
    """Full review schema for backend operations"""
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


# ============================================================
# SHOES REVIEW SCHEMAS
# ============================================================

class ShoesReviewCreate(ReviewBase):
    """Schema for creating shoes review"""
    product_category: str = Field(default="Shoes", pattern="^Shoes$")


class ShoesReviewResponse(ReviewBase):
    """Schema for shoes review response (full backend data)"""
    id: int
    
    class Config:
        from_attributes = True


class ShoesReviewStudyResponse(ReviewStudy):
    """Schema for shoes review response (study participant view)"""
    product_category: str = Field(default="Shoes", pattern="^Shoes$")


class ShoesReviewUpdate(BaseModel):
    """Schema for updating shoes review (partial updates)"""
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
# WIRELESS REVIEW SCHEMAS
# ============================================================

class WirelessReviewCreate(ReviewBase):
    """Schema for creating wireless review"""
    product_category: str = Field(default="Wireless", pattern="^Wireless$")


class WirelessReviewResponse(ReviewBase):
    """Schema for wireless review response (full backend data)"""
    id: int
    
    class Config:
        from_attributes = True


class WirelessReviewStudyResponse(ReviewStudy):
    """Schema for wireless review response (study participant view)"""
    product_category: str = Field(default="Wireless", pattern="^Wireless$")


class WirelessReviewUpdate(BaseModel):
    """Schema for updating wireless review (partial updates)"""
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
# LIST/QUERY SCHEMAS
# ============================================================

class ShoesReviewListResponse(BaseModel):
    """Schema for paginated shoes review list (backend)"""
    reviews: List[ShoesReviewResponse]
    total: int
    limit: int
    offset: int


class ShoesReviewStudyListResponse(BaseModel):
    """Schema for paginated shoes review list (study participants)"""
    reviews: List[ShoesReviewStudyResponse]
    total: int
    limit: int
    offset: int


class WirelessReviewListResponse(BaseModel):
    """Schema for paginated wireless review list (backend)"""
    reviews: List[WirelessReviewResponse]
    total: int
    limit: int
    offset: int


class WirelessReviewStudyListResponse(BaseModel):
    """Schema for paginated wireless review list (study participants)"""
    reviews: List[WirelessReviewStudyResponse]
    total: int
    limit: int
    offset: int


class ReviewFilterParams(BaseModel):
    """Schema for filtering reviews"""
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    max_rating: Optional[int] = Field(None, ge=1, le=5)
    verified_only: Optional[bool] = None
    exclude_malformed: Optional[bool] = None
    malformed_type: Optional[MalformedType] = None
    product_id: Optional[str] = None
    is_main_product: Optional[bool] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def to_study_format(review) -> ReviewStudy:
    """
    Convert full review model to study-safe format
    
    Args:
        review: ShoesReview or WirelessReview SQLAlchemy model
        
    Returns:
        ReviewStudy with only participant-visible fields
    """
    return ReviewStudy(
        review_id=review.review_id,
        product_id=review.product_id,
        product_title=review.product_title,
        product_category=review.product_category,
        review_headline=review.review_headline,
        review_body=review.review_body,
        star_rating=review.star_rating,
        verified_purchase=review.verified_purchase,
        helpful_votes=review.helpful_votes,
        total_votes=review.total_votes,
        customer_id=review.customer_id
    )


def batch_to_study_format(reviews: List) -> List[ReviewStudy]:
    """
    Convert list of review models to study-safe format
    
    Args:
        reviews: List of ShoesReview or WirelessReview models
        
    Returns:
        List of ReviewStudy objects
    """
    return [to_study_format(review) for review in reviews]