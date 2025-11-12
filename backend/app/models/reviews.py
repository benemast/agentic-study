# backend/app/models/reviews.py
"""
SQLAlchemy models for product reviews - OPTIMIZED VERSION
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, Numeric, CheckConstraint, Index
from sqlalchemy.ext.declarative import declared_attr
from app.database import Base


class ReviewBase:
    """
    Base class for review models with shared columns and logic.
    Eliminates code duplication between review types.
    """
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Review Identifiers
    review_id = Column(String(50), nullable=False)
    
    # Product Information
    product_id = Column(String(50), nullable=False, index=True)
    product_id_original = Column(String(50), nullable=False)
    product_title = Column(String(500), nullable=False)
    product_title_original = Column(String(500), nullable=False)
    product_parent = Column(Integer, nullable=False)
    
    @declared_attr
    def product_category(cls):
        """Set default category based on class name"""
        category = cls.__name__.replace('Review', '')
        return Column(String(50), nullable=False, default=category)
    
    # Rating Information
    star_rating = Column(Integer, nullable=False, index=True)
    avg_star_rating = Column(Numeric(4, 2), nullable=False)
    
    # Review Content
    review_headline = Column(String(500), default="")
    review_body = Column(Text, default="")
    
    # Review Metadata
    verified_purchase = Column(Boolean, nullable=False, index=True)
    review_date = Column(Date, nullable=False, index=True)
    helpful_votes = Column(Integer, nullable=False, default=0)
    total_votes = Column(Integer, nullable=False, default=0)
    
    # User Information
    customer_id = Column(Integer, nullable=False)
    vine = Column(Boolean, nullable=False)
    marketplace = Column(String(2), nullable=False)
    
    # Data Quality Flags
    is_main_product = Column(Boolean, nullable=False)
    is_malformed = Column(Boolean, nullable=False, index=True)
    malformed_type = Column(String(50), nullable=True)
    
    @declared_attr
    def __table_args__(cls):
        """Constraints and indexes that apply to all review tables"""
        table_suffix = cls.__tablename__.replace('_reviews', '')
        
        return (
            # Data validation constraints
            CheckConstraint(
                'star_rating >= 1 AND star_rating <= 5', 
                name=f'check_star_rating_{table_suffix}'
            ),
            CheckConstraint(
                'avg_star_rating >= 0.0 AND avg_star_rating <= 5.0', 
                name=f'check_avg_rating_{table_suffix}'
            ),
            CheckConstraint(
                'total_votes >= helpful_votes', 
                name=f'check_votes_{table_suffix}'
            ),
            CheckConstraint(
                'product_parent > 0', 
                name=f'check_product_parent_{table_suffix}'
            ),
            CheckConstraint(
                'customer_id > 0', 
                name=f'check_customer_id_{table_suffix}'
            ),
            CheckConstraint(
                '(is_malformed = false AND malformed_type IS NULL) OR '
                '(is_malformed = true AND malformed_type IS NOT NULL)',
                name=f'check_malformed_{table_suffix}'
            ),
            
            # COMPOSITE INDEXES for common query patterns
            # These significantly improve performance for filtered queries
            
            # Query pattern: Get product reviews by date range
            Index(f'idx_{table_suffix}_product_date', 'product_id', 'review_date'),
            
            # Query pattern: Get verified reviews by rating
            Index(f'idx_{table_suffix}_verified_rating', 'verified_purchase', 'star_rating'),
            
            # Query pattern: Get product reviews by rating and date
            Index(f'idx_{table_suffix}_product_rating_date', 'product_id', 'star_rating', 'review_date'),
            
            # Query pattern: Find helpful reviews (for sorting)
            Index(f'idx_{table_suffix}_helpful', 'product_id', 'helpful_votes'),
            
            # Query pattern: Filter out malformed reviews
            Index(f'idx_{table_suffix}_quality', 'is_malformed', 'is_main_product'),
        )
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id}, review_id='{self.review_id}', rating={self.star_rating})>"
    
    def to_dict(self, include_fields=None, exclude_fields=None):
        """
        Convert model to dictionary with optimized serialization.
        
        Args:
            include_fields: Optional set of field names to include
            exclude_fields: Optional set of field names to exclude
            
        Returns:
            Dictionary representation of the review
        """
        # Base fields to include
        fields = {
            'id', 'review_id', 'product_id', 'product_id_original',
            'product_title', 'product_title_original', 'product_parent',
            'product_category', 'star_rating', 'avg_star_rating',
            'review_headline', 'review_body', 'verified_purchase',
            'review_date', 'helpful_votes', 'total_votes',
            'customer_id', 'vine', 'marketplace',
            'is_main_product', 'is_malformed', 'malformed_type'
        }
        
        # Apply filters
        if include_fields:
            fields = fields.intersection(include_fields)
        if exclude_fields:
            fields = fields.difference(exclude_fields)
        
        # Build dictionary efficiently
        result = {}
        for field in fields:
            value = getattr(self, field, None)
            
            # Handle special types
            if field == 'avg_star_rating' and value is not None:
                result[field] = float(value)
            elif field == 'review_date' and value is not None:
                result[field] = value.isoformat()
            else:
                result[field] = value
        
        return result


class ShoesReview(ReviewBase, Base):
    """
    Model for shoes product reviews
    
    Table: shoes_reviews
    
    Example queries optimized by indexes:
    - Get all 5-star verified reviews for a product
    - Find most helpful reviews for a product
    - Get reviews in a date range for a product
    """
    __tablename__ = "shoes_reviews"


class WirelessReview(ReviewBase, Base):
    """
    Model for wireless product reviews
    
    Table: wireless_reviews
    
    Example queries optimized by indexes:
    - Get all 5-star verified reviews for a product
    - Find most helpful reviews for a product
    - Get reviews in a date range for a product
    """
    __tablename__ = "wireless_reviews"


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_review_model(category: str):
    """
    Factory function to get the correct review model by category name.
    
    Args:
        category: Category name (e.g., 'shoes', 'wireless')
        
    Returns:
        The corresponding review model class
        
    Raises:
        ValueError: If category is not supported
    """
    category_lower = category.lower()
    
    model_map = {
        'shoes': ShoesReview,
        'wireless': WirelessReview,
    }
    
    if category_lower not in model_map:
        raise ValueError(
            f"Unsupported review category: {category}. "
            f"Supported categories: {', '.join(model_map.keys())}"
        )
    
    return model_map[category_lower]