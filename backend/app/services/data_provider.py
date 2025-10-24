# backend/app/services/data_provider.py

from backend.app.models.source_data import SourceReview


class DataProviderService:
    
    @staticmethod
    def get_reviews_for_task(
        db: Session,
        product_category: str,
        sample_size: int = 150,
        task_seed: Optional[int] = None,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get reviews with caching
        
        Categories:
        - 'wireless' -> headphones/earbuds
        - 'shoes' -> footwear
        """
        cache = get_cache_service() if use_cache else None
        
        # Try cache first
        if cache:
            cached_reviews = cache.get_reviews(
                product_category=product_category,
                sample_size=sample_size,
                task_seed=task_seed
            )
            if cached_reviews is not None:
                return cached_reviews
        
        # Query database
        query = db.query(SourceReview).filter(
            SourceReview.product_category == product_category,
            SourceReview.verified_purchase == True  # Only verified
        )
        
        all_reviews = query.all()
        
        # Sample with seed for reproducibility
        if task_seed is not None:
            random.seed(task_seed)
        
        sampled = random.sample(all_reviews, min(sample_size, len(all_reviews)))
        
        # Convert to lightweight dict
        reviews = [
            {
                'id': r.id,
                'review_id': r.review_id,
                'product_title': r.product_title,
                'rating': r.star_rating,
                'text': r.review_body,
                'headline': r.review_headline,
                'helpful_votes': r.helpful_votes,
                'verified': r.verified_purchase,
                'date': r.review_date.isoformat() if r.review_date else None,
            }
            for r in sampled
        ]
        
        # Cache for future
        if cache:
            cache.set_reviews(reviews, product_category, sample_size, task_seed)
        
        return reviews