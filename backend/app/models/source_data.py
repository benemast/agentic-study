# backend/app/models/source_data.py
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, Index
from app.database import Base

class SourceReview(Base):
    """Amazon US Customer Reviews - Source Data"""
    __tablename__ = "source_reviews"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Amazon IDs
    review_id = Column(String(20), unique=True, nullable=False, index=True)
    customer_id = Column(String(20), nullable=False)
    product_id = Column(String(20), nullable=False, index=True)  # ASIN
    product_parent = Column(String(20), nullable=False)
    
    # Product Info
    product_title = Column(String(500), nullable=False)
    product_category = Column(String(50), nullable=False, index=True)
    
    # Review Content
    star_rating = Column(Integer, nullable=False, index=True)
    review_headline = Column(String(500))
    review_body = Column(Text, nullable=False)
    
    # Metadata
    verified_purchase = Column(Boolean, default=False, index=True)
    helpful_votes = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    vine = Column(Boolean, default=False)
    
    # Temporal
    review_date = Column(Date, nullable=False, index=True)
    marketplace = Column(String(5), default='US')
    
    # Quality indicators (computed during import)
    review_length = Column(Integer)  # Character count
    
    # Indexes for complex queries
    __table_args__ = (
        Index('idx_category_rating', 'product_category', 'star_rating'),
        Index('idx_category_verified', 'product_category', 'verified_purchase'),
        Index('idx_product_rating', 'product_id', 'star_rating'),
        Index('idx_category_date', 'product_category', 'review_date'),
        Index('idx_verified_rating', 'verified_purchase', 'star_rating'),
    )
    
    def __repr__(self):
        return f"<Review {self.review_id}: {self.product_title[:50]}>"