# backend/app/orchestrator/tools/data_tools.py
from typing import Dict, Any, List
import logging
from datetime import datetime
import time
from sqlalchemy.orm import Session

from app.database import get_db_context
from app.models.reviews import get_review_model
from app.schemas.reviews import to_study_format, ReviewFilterParams

logger = logging.getLogger(__name__)


class BaseTool:
    """Base class for all tools with common functionality"""
    
    def __init__(self, name: str):
        self.name = name
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool - to be implemented by subclasses"""
        raise NotImplementedError
    
    def _measure_execution(self, func, *args, **kwargs):
        """Measure execution time of a function"""
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = int((time.time() - start_time) * 1000)  # ms
        return result, execution_time


class LoadReviewsTool(BaseTool):
    """
    Load product reviews from the database
    
    This tool retrieves reviews using the existing reviews infrastructure,
    supporting filters like:
    - Product category (shoes/wireless)
    - Product ID
    - Star rating range
    - Verified purchases only
    - Pagination
    
    Returns reviews in study-safe format (participant-visible fields only)
    """
    
    def __init__(self):
        super().__init__("Load Reviews")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Load reviews based on filter parameters
        
        Args:
            input_data: {
                'category': 'shoes' or 'wireless' (required),
                'product_id': str (optional),
                'min_rating': int 1-5 (optional),
                'max_rating': int 1-5 (optional),
                'verified_only': bool (optional),
                'limit': int (default 100, max 1000),
                'offset': int (default 0)
            }
            
        Returns:
            Dictionary with:
            - success: bool
            - data: {
                'reviews': List[ReviewStudyBase],
                'total': int,
                'limit': int,
                'offset': int
              }
            - execution_time_ms: int
            - metadata: Dict
        """
        start_time = time.time()
        
        try:
            # Extract parameters
            category = input_data.get('category')
            if not category:
                return {
                    'success': False,
                    'error': 'Missing required parameter: category (must be "shoes" or "wireless")',
                    'data': None
                }
            
            category = category.lower()
            if category not in ['shoes', 'wireless']:
                return {
                    'success': False,
                    'error': f'Invalid category: {category}. Must be "shoes" or "wireless"',
                    'data': None
                }
            
            # Build filter params
            filters = ReviewFilterParams(
                product_id=input_data.get('product_id'),
                min_rating=input_data.get('min_rating'),
                max_rating=input_data.get('max_rating'),
                verified_only=input_data.get('verified_only'),
                exclude_malformed=input_data.get('exclude_malformed', True),
                limit=input_data.get('limit', 100),
                offset=input_data.get('offset', 0)
            )
            
            logger.info(f"Loading {category} reviews with filters: {filters.model_dump()}")
            
            # Query database
            with get_db_context() as db:
                # Get appropriate model
                model = get_review_model(category)
                
                # Base query
                query = db.query(model)
                
                # Apply filters
                if filters.product_id:
                    query = query.filter(model.product_id == filters.product_id)
                if filters.min_rating is not None:
                    query = query.filter(model.star_rating >= filters.min_rating)
                if filters.max_rating is not None:
                    query = query.filter(model.star_rating <= filters.max_rating)
                if filters.verified_only:
                    query = query.filter(model.verified_purchase == True)
                if filters.exclude_malformed:
                    query = query.filter(model.is_malformed == False)
                
                # Get total count before pagination
                total = query.count()
                
                # Apply pagination and ordering
                reviews = query.order_by(
                    model.helpful_votes.desc(),  # Most helpful first
                    model.review_date.desc()     # Then most recent
                ).limit(filters.limit).offset(filters.offset).all()
                
                # Convert to study format (reduced fields for participants)
                study_reviews = [to_study_format(review) for review in reviews]
                study_reviews_dicts = [r.model_dump() for r in study_reviews]
            
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Loaded {len(reviews)} {category} reviews (total: {total})")
            
            return {
                'success': True,
                'data': {
                    'reviews': study_reviews_dicts,
                    'total': total,
                    'limit': filters.limit,
                    'offset': filters.offset,
                    'category': category,
                    'filters_applied': {
                        'product_id': filters.product_id,
                        'min_rating': filters.min_rating,
                        'max_rating': filters.max_rating,
                        'verified_only': filters.verified_only
                    }
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'reviews_loaded': len(reviews),
                    'total_available': total,
                    'category': category
                }
            }
            
        except Exception as e:
            logger.error(f"Error in LoadReviewsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'execution_time_ms': int((time.time() - start_time) * 1000)
            }

class FilterReviewsTool(BaseTool):
    """
    Filter reviews based on review-specific criteria
    
    Filters reviews by:
    - Star rating range
    - Helpful votes threshold
    - Verified purchase status
    - Text content (contains keywords)
    - Product ID
    """
    
    def __init__(self):
        super().__init__("Filter Reviews")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter reviews based on criteria
        
        Args:
            input_data: {
                'data': {
                    'records': List[Dict] - Reviews from LoadReviewsTool
                },
                'min_rating': int (1-5, optional),
                'max_rating': int (1-5, optional),
                'min_helpful_votes': int (optional),
                'verified_only': bool (optional),
                'contains_text': str (optional) - filter reviews containing this text,
                'product_id': str (optional) - filter by specific product
            }
            
        Returns:
            Dictionary with filtered reviews
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            
            if not records:
                return {
                    'success': False,
                    'error': 'No reviews to filter',
                    'data': None
                }
            
            # Extract filter criteria
            min_rating = input_data.get('min_rating')
            max_rating = input_data.get('max_rating')
            min_helpful_votes = input_data.get('min_helpful_votes')
            verified_only = input_data.get('verified_only')
            contains_text = input_data.get('contains_text')
            product_id = input_data.get('product_id')
            
            logger.info(f"Filtering {len(records)} reviews with criteria")
            
            # Apply filters
            filtered_records = records
            
            # Filter by star rating
            if min_rating is not None:
                filtered_records = [
                    r for r in filtered_records 
                    if r.get('star_rating', 0) >= min_rating
                ]
            
            if max_rating is not None:
                filtered_records = [
                    r for r in filtered_records 
                    if r.get('star_rating', 5) <= max_rating
                ]
            
            # Filter by helpful votes
            if min_helpful_votes is not None:
                filtered_records = [
                    r for r in filtered_records 
                    if r.get('helpful_votes', 0) >= min_helpful_votes
                ]
            
            # Filter by verified purchase
            if verified_only:
                filtered_records = [
                    r for r in filtered_records 
                    if r.get('verified_purchase', False)
                ]
            
            # Filter by text content
            if contains_text:
                search_text = contains_text.lower()
                filtered_records = [
                    r for r in filtered_records 
                    if search_text in r.get('review_body', '').lower() 
                    or search_text in r.get('review_headline', '').lower()
                ]
            
            # Filter by product ID
            if product_id:
                filtered_records = [
                    r for r in filtered_records 
                    if r.get('product_id') == product_id
                ]
            
            execution_time = int((time.time() - start_time) * 1000)
            
            filters_applied = {
                'min_rating': min_rating,
                'max_rating': max_rating,
                'min_helpful_votes': min_helpful_votes,
                'verified_only': verified_only,
                'contains_text': contains_text,
                'product_id': product_id
            }
            # Remove None values
            filters_applied = {k: v for k, v in filters_applied.items() if v is not None}
            
            logger.info(
                f"Filtered {len(records)} → {len(filtered_records)} reviews "
                f"({len(records) - len(filtered_records)} removed)"
            )
            
            return {
                'success': True,
                'data': {
                    **data,
                    'records': filtered_records,
                    'original_count': len(records),
                    'filtered_count': len(filtered_records),
                    'filters_applied': filters_applied
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'records_removed': len(records) - len(filtered_records),
                    'records_remaining': len(filtered_records)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in FilterReviewsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'execution_time_ms': int((time.time() - start_time) * 1000)
            }

class SortReviewsTool(BaseTool):
    """
    Sort reviews based on review-specific fields
    
    Can sort by:
    - star_rating (rating)
    - helpful_votes (helpfulness)
    - total_votes (engagement)
    - review_id (ID)
    - product_id (product)
    """
    
    # Mapping of user-friendly names to actual field names
    SORT_FIELD_MAPPING = {
        'rating': 'star_rating',
        'helpfulness': 'helpful_votes',
        'helpful': 'helpful_votes',
        'engagement': 'total_votes',
        'votes': 'total_votes',
        'id': 'review_id',
        'product': 'product_id',
        # Allow direct field names too
        'star_rating': 'star_rating',
        'helpful_votes': 'helpful_votes',
        'total_votes': 'total_votes',
        'review_id': 'review_id',
        'product_id': 'product_id',
    }
    
    def __init__(self):
        super().__init__("Sort Reviews")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sort reviews by specified field
        
        Args:
            input_data: {
                'data': {
                    'records': List[Dict] - Reviews to sort
                },
                'sort_by': str - Field to sort by (rating, helpfulness, votes, etc.),
                'descending': bool - Sort in descending order (default: True for ratings/votes)
            }
            
        Returns:
            Dictionary with sorted reviews
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            
            if not records:
                return {
                    'success': False,
                    'error': 'No reviews to sort',
                    'data': None
                }
            
            # Get sort parameters
            sort_by = input_data.get('sort_by', 'helpful_votes')
            
            # Map user-friendly name to actual field
            if sort_by.lower() in self.SORT_FIELD_MAPPING:
                actual_field = self.SORT_FIELD_MAPPING[sort_by.lower()]
            else:
                return {
                    'success': False,
                    'error': f'Invalid sort field: {sort_by}. Valid options: {list(self.SORT_FIELD_MAPPING.keys())}',
                    'data': None
                }
            
            # Default to descending for numeric fields (higher ratings/votes first)
            descending = input_data.get('descending', True)
            
            logger.info(f"Sorting {len(records)} reviews by {actual_field} ({'desc' if descending else 'asc'})")
            
            # Sort records
            try:
                sorted_records = sorted(
                    records,
                    key=lambda x: x.get(actual_field, 0) if isinstance(x.get(actual_field), (int, float)) else str(x.get(actual_field, '')),
                    reverse=descending
                )
            except Exception as sort_error:
                logger.error(f"Error during sort: {sort_error}")
                return {
                    'success': False,
                    'error': f'Sort failed: {str(sort_error)}',
                    'data': None
                }
            
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Successfully sorted {len(sorted_records)} reviews")
            
            return {
                'success': True,
                'data': {
                    **data,
                    'records': sorted_records,
                    'sorted_by': actual_field,
                    'sort_order': 'descending' if descending else 'ascending'
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'sort_field': actual_field,
                    'sort_order': 'desc' if descending else 'asc',
                    'records_sorted': len(sorted_records)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in SortReviewsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'execution_time_ms': int((time.time() - start_time) * 1000)
            }


class CleanDataTool(BaseTool):
    """Clean and normalize data"""
    
    def __init__(self):
        super().__init__("Clean Data")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean data: remove nulls, normalize formats, etc.
        
        Args:
            input_data: Contains 'data'
            
        Returns:
            Cleaned data
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            
            logger.info(f"Cleaning {len(records)} records")
            
            # Clean records
            cleaned_records = []
            issues_found = 0
            
            for record in records:
                cleaned_record = {}
                for key, value in record.items():
                    # Remove None values
                    if value is None:
                        issues_found += 1
                        continue
                    
                    # Normalize strings
                    if isinstance(value, str):
                        cleaned_record[key] = value.strip()
                    else:
                        cleaned_record[key] = value
                
                if cleaned_record:  # Only add non-empty records
                    cleaned_records.append(cleaned_record)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    **data,
                    'records': cleaned_records,
                    'cleaned': True
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'issues_fixed': issues_found,
                    'records_cleaned': len(cleaned_records)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in CleanDataTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }

class CombineDataTool(BaseTool):
    """Combine multiple data sources"""
    
    def __init__(self):
        super().__init__("Combine Data")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combine data from multiple sources
        
        Args:
            input_data: Contains 'sources' list with data objects
            
        Returns:
            Combined data
        """
        start_time = time.time()
        
        try:
            sources = input_data.get('sources', [])
            
            logger.info(f"Combining {len(sources)} data sources")
            
            # Combine all records
            all_records = []
            for source in sources:
                if isinstance(source, dict) and 'records' in source:
                    all_records.extend(source['records'])
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    'records': all_records,
                    'combined_from': len(sources),
                    'total_records': len(all_records)
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'sources_combined': len(sources)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in CombineDataTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }