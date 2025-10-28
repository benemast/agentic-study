# backend/app/orchestrator/tools/data_tools.py
from typing import Dict, Any, List
import logging
import time

from app.orchestrator.tools.base_tool import BaseTool

from app.database import get_db_context
from app.models.reviews import get_review_model
from app.schemas.reviews import to_study_format, ReviewFilterParams

logger = logging.getLogger(__name__)

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
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
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
    Dynamic filter tool that can filter on any field with type-appropriate operators
    
    Supports:
    - String fields: contains, equals, not_equals, starts_with, ends_with
    - Numeric fields: ==, !=, >, <, >=, <=
    - Boolean fields: == True/False
    
    Available fields from LoadReviewsTool:
    - review_id (str)
    - product_id (str)
    - product_title (str)
    - product_category (str)
    - review_headline (str)
    - review_body (str)
    - star_rating (int, 1-5)
    - verified_purchase (bool)
    - helpful_votes (int, >=0)
    - total_votes (int, >=0)
    - customer_id (int, >0)
    """
    
    # Field type definitions for validation and operator selection
    FIELD_TYPES = {
        # String fields
        'review_id': 'string',
        'product_id': 'string',
        'product_title': 'string',
        'product_category': 'string',
        'review_headline': 'string',
        'review_body': 'string',
        # Numeric fields
        'star_rating': 'numeric',
        'helpful_votes': 'numeric',
        'total_votes': 'numeric',
        'customer_id': 'numeric',
        # Boolean fields
        'verified_purchase': 'boolean',
    }
    
    def __init__(self):
        super().__init__("Filter Reviews")
    
    def _apply_string_filter(self, value: str, operator: str, target: Any) -> bool:
        """Apply string comparison operators"""
        if value is None:
            return False
        
        value_str = str(value).lower()
        target_str = str(target).lower()
        
        if operator == 'contains':
            return target_str in value_str
        elif operator == 'equals':
            return value_str == target_str
        elif operator == 'not_equals':
            return value_str != target_str
        elif operator == 'starts_with':
            return value_str.startswith(target_str)
        elif operator == 'ends_with':
            return value_str.endswith(target_str)
        else:
            logger.warning(f"Unknown string operator: {operator}, defaulting to 'contains'")
            return target_str in value_str
    
    def _apply_numeric_filter(self, value: Any, operator: str, target: Any) -> bool:
        """Apply numeric comparison operators"""
        try:
            num_value = float(value) if value is not None else None
            num_target = float(target)
            
            if num_value is None:
                return False
            
            if operator == 'equals' or operator == '==':
                return num_value == num_target
            elif operator == 'not_equals' or operator == '!=':
                return num_value != num_target
            elif operator == 'greater' or operator == '>':
                return num_value > num_target
            elif operator == 'less' or operator == '<':
                return num_value < num_target
            elif operator == 'greater_or_equal' or operator == '>=':
                return num_value >= num_target
            elif operator == 'less_or_equal' or operator == '<=':
                return num_value <= num_target
            else:
                logger.warning(f"Unknown numeric operator: {operator}, defaulting to '=='")
                return num_value == num_target
        except (ValueError, TypeError) as e:
            logger.warning(f"Error comparing numeric values: {e}")
            return False
    
    def _apply_boolean_filter(self, value: Any, operator: str, target: Any) -> bool:
        """Apply boolean comparison"""
        if operator not in ['equals', '==']:
            logger.warning(f"Boolean fields only support 'equals' operator, got: {operator}")
        
        # Convert target to boolean
        if isinstance(target, str):
            target_bool = target.lower() in ['true', '1', 'yes']
        else:
            target_bool = bool(target)
        
        return bool(value) == target_bool
    
    def _apply_filter_condition(self, record: Dict[str, Any], field: str, operator: str, value: Any) -> bool:
        """Apply a single filter condition to a record"""
        if field not in self.FIELD_TYPES:
            logger.warning(f"Unknown field: {field}. Skipping filter.")
            return True  # Don't filter out if field unknown
        
        field_type = self.FIELD_TYPES[field]
        record_value = record.get(field)
        
        if field_type == 'string':
            return self._apply_string_filter(record_value, operator, value)
        elif field_type == 'numeric':
            return self._apply_numeric_filter(record_value, operator, value)
        elif field_type == 'boolean':
            return self._apply_boolean_filter(record_value, operator, value)
        
        return True
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter reviews dynamically based on field type
        
        Args:
            input_data: {
                'data': {
                    'records': List[Dict] - Reviews from LoadReviewsTool
                },
                'filters': List[Dict] - List of filter conditions, each with:
                    - 'field': str - Field name to filter on
                    - 'operator': str - Comparison operator (type-dependent)
                    - 'value': Any - Value to compare against
            }
            
            OR (backward compatible - single filter):
                'field': str,
                'operator': str,
                'value': Any
            
        Example filters:
            [
                {'field': 'star_rating', 'operator': '>=', 'value': 4},
                {'field': 'product_title', 'operator': 'contains', 'value': 'wireless'},
                {'field': 'verified_purchase', 'operator': 'equals', 'value': True}
            ]
            
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
            
            # Parse filter conditions
            filters = []
            
            # Check if using new format (list of filters)
            if 'filters' in input_data and isinstance(input_data['filters'], list):
                filters = input_data['filters']
            # Backward compatibility: single filter
            elif 'field' in input_data and 'operator' in input_data and 'value' in input_data:
                filters = [{
                    'field': input_data['field'],
                    'operator': input_data['operator'],
                    'value': input_data['value']
                }]
            else:
                return {
                    'success': False,
                    'error': 'No filter conditions provided. Use "filters" array or single "field", "operator", "value"',
                    'data': None
                }
            
            if not filters:
                return {
                    'success': False,
                    'error': 'Filter list is empty',
                    'data': None
                }
            
            logger.info(f"Filtering {len(records)} reviews with {len(filters)} condition(s)")
            
            # Apply all filter conditions (AND logic)
            filtered_records = records
            for filter_condition in filters:
                field = filter_condition.get('field')
                operator = filter_condition.get('operator')
                value = filter_condition.get('value')
                
                if not all([field, operator, value is not None]):
                    logger.warning(f"Incomplete filter condition: {filter_condition}")
                    continue
                
                filtered_records = [
                    record for record in filtered_records
                    if self._apply_filter_condition(record, field, operator, value)
                ]
                
                logger.debug(f"After filtering by {field} {operator} {value}: {len(filtered_records)} records remain")
            
            execution_time = int((time.time() - start_time) * 1000)
            
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
                    'filters_applied': filters
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'records_removed': len(records) - len(filtered_records),
                    'records_remaining': len(filtered_records),
                    'available_fields': list(self.FIELD_TYPES.keys())
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
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
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

class DataCleanerTool(BaseTool):
    """
    AI-powered data cleaner that pretends to use AI while using SQL filtering
    
    This tool creates the illusion of AI-powered data cleaning through:
    - Streaming progress updates with "AI analysis" messaging
    - Gradual processing simulation
    - Actually filters by is_malformed flag in database
    
    Study Purpose: Red herring / perception test tool
    """
    
    def __init__(self):
        super().__init__("AI Data Cleaner")
        self.websocket_manager = None
    
    def set_websocket_manager(self, manager):
        """Inject WebSocket manager for streaming updates"""
        self.websocket_manager = manager
        logger.info("✅ WebSocket manager injected into DataCleanerTool")
    
    async def _send_progress(
        self, 
        session_id: str, 
        execution_id: int, 
        step: str, 
        progress: int,
        details: str = None
    ):
        """Send progress update via WebSocket"""
        if self.websocket_manager and session_id:
            try:
                await self.websocket_manager.send_tool_progress(
                    session_id=session_id,
                    execution_id=execution_id,
                    tool_name=self.name,
                    step=step,
                    progress=progress,
                    details=details
                )
            except Exception as e:
                logger.error(f"Failed to send progress update: {e}")
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean reviews using "AI" (actually SQL is_malformed filter)
        
        Args:
            input_data: {
                'data': {
                    'records': List[Dict] - Reviews to "clean"
                },
                'session_id': str - For WebSocket updates (optional),
                'execution_id': int - For WebSocket updates (optional)
            }
            
        Returns:
            Dictionary with cleaned reviews (malformed ones removed)
        """
        start_time = time.time()
        
        # Extract data
        data = input_data.get('data', {})
        records = data.get('records', [])
        session_id = input_data.get('session_id')
        execution_id = input_data.get('execution_id')
        
        if not records:
            return {
                'success': False,
                'error': 'No data provided for cleaning',
                'data': None
            }
        
        logger.info(f"🤖 AI Data Cleaner: Processing {len(records)} reviews")
        
        # ========================================
        # SIMULATE AI PROCESSING WITH STREAMING
        # ========================================
        
        # Step 1: Initialization (10%)
        await self._send_progress(
            session_id, execution_id,
            "Initializing AI models",
            10,
            "Loading neural network for data quality assessment..."
        )
        await asyncio.sleep(0.5)
        
        # Step 2: Data analysis (30%)
        await self._send_progress(
            session_id, execution_id,
            "Analyzing data quality",
            30,
            f"AI analyzing {len(records)} reviews for quality indicators..."
        )
        await asyncio.sleep(0.8)
        
        # Step 3: Pattern detection (50%)
        await self._send_progress(
            session_id, execution_id,
            "Detecting anomaly patterns",
            50,
            "Deep learning model identifying spam and malformed entries..."
        )
        await asyncio.sleep(0.7)
        
        # ========================================
        # ACTUAL FILTERING (SQL-based)
        # ========================================
        
        # Filter out malformed reviews based on is_malformed flag
        cleaned_records = []
        malformed_count = 0
        issues_found = []
        
        for record in records:
            # Check if review is marked as malformed in database
            is_malformed = record.get('is_malformed', False)
            
            if is_malformed:
                malformed_count += 1
                # Track what type of issue (if available)
                malformed_type = record.get('malformed_type', 'unknown')
                issues_found.append(malformed_type)
            else:
                cleaned_records.append(record)
        
        # Step 4: Cleaning process (70%)
        await self._send_progress(
            session_id, execution_id,
            "AI cleaning in progress",
            70,
            f"Removing {malformed_count} low-quality entries detected by AI..."
        )
        await asyncio.sleep(0.6)
        
        # Step 5: Validation (90%)
        await self._send_progress(
            session_id, execution_id,
            "Validating cleaned dataset",
            90,
            f"AI verifying {len(cleaned_records)} high-quality reviews..."
        )
        await asyncio.sleep(0.4)
        
        # Step 6: Finalization (100%)
        execution_time = int((time.time() - start_time) * 1000)
        
        await self._send_progress(
            session_id, execution_id,
            "Cleaning complete",
            100,
            f"AI cleaned {len(records)} → {len(cleaned_records)} reviews ({malformed_count} removed)"
        )
        
        # Count issue types
        from collections import Counter
        issue_breakdown = dict(Counter(issues_found))
        
        logger.info(
            f"✅ AI Data Cleaner: {len(records)} → {len(cleaned_records)} reviews "
            f"({malformed_count} malformed removed in {execution_time}ms)"
        )
        
        return {
            'success': True,
            'data': {
                **data,
                'records': cleaned_records,
                'cleaned': True,
                'ai_powered': True  # Hint to frontend
            },
            'execution_time_ms': execution_time,
            'metadata': {
                'tool': self.name,
                'original_count': len(records),
                'cleaned_count': len(cleaned_records),
                'issues_removed': malformed_count,
                'issue_types': issue_breakdown,
                'quality_score': round((len(cleaned_records) / len(records)) * 100, 1),
                'ai_confidence': 0.94,  # Fake AI confidence score
                'cleaning_method': 'deep_learning_v2'  # Fake AI method name
            }
        }


class CombineDataTool(BaseTool):
    """Combine multiple data sources"""
    
    def __init__(self):
        super().__init__("Combine Data")
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
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
        

__all__ = [
    'LoadReviewsTool',
    'FilterReviewsTool',
    'SortReviewsTool',
    'DataCleanerTool', 

    'CombineDataTool'
]