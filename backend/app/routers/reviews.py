# backend/app/routers/reviews.py
"""
Reviews API Router
Provides endpoints for fetching review data for study tasks
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.database import get_db
from app.models.reviews import ShoesReview, WirelessReview, get_review_model
from app.schemas.reviews import (
    ShoesReviewStudyListResponse,
    WirelessReviewStudyListResponse,
    ReviewFilterParams,
    to_study_format,
    batch_to_study_format
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def apply_filters(query, filters: ReviewFilterParams):
    """
    Apply filter parameters to SQLAlchemy query
    
    Args:
        query: Base SQLAlchemy query
        filters: ReviewFilterParams object
        
    Returns:
        Filtered query
    """
    # Rating filters
    if filters.min_rating is not None:
        query = query.filter(query.column_descriptions[0]['type'].star_rating >= filters.min_rating)
    if filters.max_rating is not None:
        query = query.filter(query.column_descriptions[0]['type'].star_rating <= filters.max_rating)
    
    # Verified purchase filter
    if filters.verified_only:
        query = query.filter(query.column_descriptions[0]['type'].verified_purchase == True)
    
    # Quality filters
    if filters.exclude_malformed:
        query = query.filter(query.column_descriptions[0]['type'].is_malformed == False)
    
    if filters.is_main_product is not None:
        query = query.filter(query.column_descriptions[0]['type'].is_main_product == filters.is_main_product)
    
    # Malformed type filter
    if filters.malformed_type is not None:
        query = query.filter(query.column_descriptions[0]['type'].malformed_type == filters.malformed_type)
    
    # Product ID filter (critical for study tasks)
    if filters.product_id:
        query = query.filter(query.column_descriptions[0]['type'].product_id == filters.product_id)
    
    return query


@router.get("/shoes", response_model=ShoesReviewStudyListResponse)
async def get_shoes_reviews(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    verified_only: Optional[bool] = Query(None),
    exclude_malformed: Optional[bool] = Query(True),
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get shoes reviews with optional filters
    
    Returns study-safe format (reduced fields for participants)
    
    Query parameters:
    - product_id: Filter by specific product
    - min_rating, max_rating: Filter by star rating range
    - verified_only: Only verified purchases
    - exclude_malformed: Exclude spam/malformed reviews (default: true)
    - limit: Max results (1-1000, default: 100)
    - offset: Pagination offset
    """
    try:
        # Build filter params
        filters = ReviewFilterParams(
            product_id=product_id,
            min_rating=min_rating,
            max_rating=max_rating,
            verified_only=verified_only,
            exclude_malformed=exclude_malformed,
            limit=limit,
            offset=offset
        )
        
        # Base query
        query = db.query(ShoesReview)
        
        # Apply filters
        if filters.product_id:
            query = query.filter(ShoesReview.product_id == filters.product_id)
        if filters.min_rating is not None:
            query = query.filter(ShoesReview.star_rating >= filters.min_rating)
        if filters.max_rating is not None:
            query = query.filter(ShoesReview.star_rating <= filters.max_rating)
        if filters.verified_only:
            query = query.filter(ShoesReview.verified_purchase == True)
        if filters.exclude_malformed:
            query = query.filter(ShoesReview.is_malformed == False)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination and ordering
        reviews = query.order_by(
            ShoesReview.helpful_votes.desc(),  # Most helpful first
            ShoesReview.review_date.desc()     # Then most recent
        ).limit(filters.limit).offset(filters.offset).all()
        
        # Convert to study format (reduced fields)
        study_reviews = batch_to_study_format(reviews)
        
        logger.info(f"Retrieved {len(reviews)} shoes reviews (total: {total})")
        
        return {
            "reviews": study_reviews,
            "total": total,
            "limit": filters.limit,
            "offset": filters.offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching shoes reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wireless", response_model=WirelessReviewStudyListResponse)
async def get_wireless_reviews(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    verified_only: Optional[bool] = Query(None),
    exclude_malformed: Optional[bool] = Query(True),
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get wireless reviews with optional filters
    
    Returns study-safe format (reduced fields for participants)
    
    Query parameters:
    - product_id: Filter by specific product
    - min_rating, max_rating: Filter by star rating range
    - verified_only: Only verified purchases
    - exclude_malformed: Exclude spam/malformed reviews (default: true)
    - limit: Max results (1-1000, default: 100)
    - offset: Pagination offset
    """
    try:
        # Build filter params
        filters = ReviewFilterParams(
            product_id=product_id,
            min_rating=min_rating,
            max_rating=max_rating,
            verified_only=verified_only,
            exclude_malformed=exclude_malformed,
            limit=limit,
            offset=offset
        )
        
        # Base query
        query = db.query(WirelessReview)
        
        # Apply filters
        if filters.product_id:
            query = query.filter(WirelessReview.product_id == filters.product_id)
        if filters.min_rating is not None:
            query = query.filter(WirelessReview.star_rating >= filters.min_rating)
        if filters.max_rating is not None:
            query = query.filter(WirelessReview.star_rating <= filters.max_rating)
        if filters.verified_only:
            query = query.filter(WirelessReview.verified_purchase == True)
        if filters.exclude_malformed:
            query = query.filter(WirelessReview.is_malformed == False)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination and ordering
        reviews = query.order_by(
            WirelessReview.helpful_votes.desc(),  # Most helpful first
            WirelessReview.review_date.desc()      # Then most recent
        ).limit(filters.limit).offset(filters.offset).all()
        
        # Convert to study format (reduced fields)
        study_reviews = batch_to_study_format(reviews)
        
        logger.info(f"Retrieved {len(reviews)} wireless reviews (total: {total})")
        
        return {
            "reviews": study_reviews,
            "total": total,
            "limit": filters.limit,
            "offset": filters.offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching wireless reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category}/{review_id}")
async def get_review_by_id(
    category: str,
    review_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a single review by ID
    
    Args:
        category: 'shoes' or 'wireless'
        review_id: Review identifier
        
    Returns:
        Single review in study format
    """
    try:
        # Get appropriate model
        model = get_review_model(category)
        
        # Query single review
        review = db.query(model).filter(model.review_id == review_id).first()
        
        if not review:
            raise HTTPException(
                status_code=404,
                detail=f"Review {review_id} not found in {category} category"
            )
        
        # Convert to study format
        return to_study_format(review)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching review {review_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category}/{product_id}/stats")
async def get_product_review_stats(
    category: str,
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Get aggregated statistics for a product's reviews
    
    Args:
        category: 'shoes' or 'wireless'
        product_id: Product identifier
        
    Returns:
        Statistics: rating distribution, total count, avg rating, etc.
    """
    try:
        from sqlalchemy import func
        
        # Get appropriate model
        model = get_review_model(category)
        
        # Query statistics
        stats = db.query(
            func.count(model.id).label('total_reviews'),
            func.avg(model.star_rating).label('avg_rating'),
            func.sum(func.case((model.star_rating == 5, 1), else_=0)).label('five_star'),
            func.sum(func.case((model.star_rating == 4, 1), else_=0)).label('four_star'),
            func.sum(func.case((model.star_rating == 3, 1), else_=0)).label('three_star'),
            func.sum(func.case((model.star_rating == 2, 1), else_=0)).label('two_star'),
            func.sum(func.case((model.star_rating == 1, 1), else_=0)).label('one_star'),
            func.sum(func.case((model.verified_purchase == True, 1), else_=0)).label('verified_count'),
        ).filter(
            model.product_id == product_id,
            model.is_malformed == False  # Exclude malformed
        ).first()
        
        if not stats.total_reviews:
            raise HTTPException(
                status_code=404,
                detail=f"No reviews found for product {product_id}"
            )
        
        return {
            "product_id": product_id,
            "category": category,
            "total_reviews": stats.total_reviews,
            "avg_rating": round(float(stats.avg_rating), 2) if stats.avg_rating else 0,
            "rating_distribution": {
                "5_star": stats.five_star or 0,
                "4_star": stats.four_star or 0,
                "3_star": stats.three_star or 0,
                "2_star": stats.two_star or 0,
                "1_star": stats.one_star or 0,
            },
            "verified_purchase_count": stats.verified_count or 0,
            "verified_percentage": round((stats.verified_count / stats.total_reviews) * 100, 1) if stats.total_reviews else 0
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching stats for {product_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Health check endpoint for reviews
@router.get("/health")
async def reviews_health_check(db: Session = Depends(get_db)):
    """
    Check if review tables are accessible and have data
    """
    try:
        shoes_count = db.query(ShoesReview).count()
        wireless_count = db.query(WirelessReview).count()
        
        return {
            "status": "healthy",
            "tables": {
                "shoes_reviews": {
                    "accessible": True,
                    "count": shoes_count
                },
                "wireless_reviews": {
                    "accessible": True,
                    "count": wireless_count
                }
            }
        }
    except Exception as e:
        logger.error(f"Reviews health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }