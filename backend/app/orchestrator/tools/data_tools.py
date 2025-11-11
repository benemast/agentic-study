# backend/app/orchestrator/tools/data_tools.py

from typing import Dict, Any, List, Set
import logging
import time
from datetime import datetime, timezone
from typing import ClassVar, Dict

from app.orchestrator.tools.base_tool import BaseTool
from app.orchestrator.graphs.shared_state import DataSource

from app.database import get_db_context
from app.models.reviews import get_review_model
from app.schemas.reviews import to_work_format, ReviewFilterParams

from app.orchestrator.llm.tool_schemas import (
    LoadReviewsInputData,
    SortReviewsInputData,
    FilterReviewsInputData,
    CleanReviewsInputData
)

# Import Pydantic output schemas
from app.orchestrator.tools.output_schemas.data_tools_schemas import LoadReviewsOutput

logger = logging.getLogger(__name__)
class LoadReviewsTool(BaseTool):
    """
    Load product reviews from the database
    
    This tool retrieves reviews using the existing reviews infrastructure.
    Supports filters:
    - Product category (shoes/wireless)
    - Product ID
    - Star rating range
    - Verified purchases only
    - Pagination
    
    Returns reviews in study-safe format (participant-visible fields only)
    """
    
    def __init__(self):
        super().__init__(
            name="Load Reviews",
            tool_id="load-reviews",
            description="Load customer reviews. Starting point for analysis workflow!",
            timeout=300 # 5 minutes
        )
        self.websocket_manager = None  # Injected by orchestrator


                                                        # | Dict[str, Any]
    async def _run(self, input_data: LoadReviewsInputData ) -> LoadReviewsOutput:
        """
        Load reviews based on filter parameters
        
        Args:
            input_data: {
                'category': 'shoes' or 'wireless' (required),
                'product_id': str (optional),
                'min_rating': int 1-5 (optional),
                'max_rating': int 1-5 (optional),
                'verified_only': bool (optional),
                'limit': int (default 100, max 10000),
                'offset': int (default 0)
            }
            
        Returns:
            {
                'success': bool,
                'records': List[Dict],              # Direct, not nested!
                'total': int,
                'category': str,
                'filters_applied': Dict,
                'execution_time_ms': int,
                'summary': {                        # For results_registry
                    'records_loaded': int,
                    'category': str,
                    'total_available': int,
                    'filters_applied': Dict
                }
            }
        """
        start_time = time.time()
        
        self._log_input_to_file(input_data)
        
        """
        input_data
            config: {
                category
                limit
                offset
            }
            state{
                condition
                session_id
                execution_id
            }

        """


        try:
            # Extract parameters
            # Priority 1: config object (workflow builder - 90% case)
            if 'config' in input_data and isinstance(input_data['config'], dict):
                config = input_data['config']
                category = config.get('category')
                limit = config.get('limit')
                offset = config.get('offset', 0)
            
            # Priority 2: Root-level parameters (AI assistant format)
            else:
                category = input_data.get('category')
                limit = input_data.get('limit')
                offset = input_data.get('offset', 0)
            
            if not category:
                error_output = LoadReviewsOutput(
                    success=False,
                    error='Missing required parameter: category (must be "shoes" or "wireless")',
                    error_type='missing_parameter'
                )
                return error_output.model_dump(exclude_none=True)
            
            category = category.lower()
            if category not in ['shoes', 'wireless']:
                error_output = LoadReviewsOutput(
                    success=False,
                    error=f'Invalid category: {category}. Must be "shoes" or "wireless"',
                    error_type='invalid_parameter'
                )
                return error_output.model_dump(exclude_none=True)

            # State info
            state:dict = input_data.get('state', {})
            condition = state.get('condition')
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')

            
            # Build filter params
            filters = ReviewFilterParams(
                limit=limit,
                offset=offset
            )
            await self._send_tool_start(
                session_id, 
                execution_id=execution_id,
                condition=condition,
                message=f"Start loading {category} reviews ...",
                details={
                    'progress': 10,
                    'step_num': 0,
                    'total_steps': 1,
                }
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
                
                # Get total count before pagination
                total = query.count()
                
                # Apply pagination
                reviews = query.limit(filters.limit).offset(filters.offset).all()
                
                # Convert to study format (reduced fields for participants)
                study_reviews = [to_work_format(review) for review in reviews]
                study_reviews_dicts = [r.model_dump() for r in study_reviews]
            
            
            filters_applied_dict = {
                'product_id': filters.product_id,
                'min_rating': filters.min_rating,
                'max_rating': filters.max_rating,
                'verified_only': filters.verified_only
            }

            await self._send_tool_update(
                session_id=session_id, 
                execution_id=execution_id,
                condition=condition,
                progress=80,
                message=f"Successfully loaded {len(study_reviews)} {category} reviews.",
                details={
                    'records_loaded': len(study_reviews),
                    'category': category,
                    'total_available': total,
                    'filters_applied': filters_applied_dict
                }
            )

            logger.info(f"Loaded {len(study_reviews)} {category} reviews (total: {total})")

            
            # Build proper DataSource with SQL query
            # This is the SOURCE OF TRUTH for lazy reloading
            sql_parts = [
                f"SELECT review_id, product_id, product_title, product_category,",
                f" review_headline, review_body, star_rating, verified_purchase,",
                f" helpful_votes, total_votes, customer_id",
                f" FROM {category}_reviews",
                " WHERE 1=1"
            ]
            query_params = {}
            
            if filters.product_id:
                sql_parts.append(" AND product_id = :product_id")
                query_params['product_id'] = filters.product_id
            if filters.min_rating is not None:
                sql_parts.append(" AND star_rating >= :min_rating")
                query_params['min_rating'] = filters.min_rating
            if filters.max_rating is not None:
                sql_parts.append(" AND star_rating <= :max_rating")
                query_params['max_rating'] = filters.max_rating
            if filters.verified_only:
                sql_parts.append(" AND verified_purchase = TRUE")
            
            sql_parts.extend([
                " LIMIT :limit OFFSET :offset"
            ])
            query_params['limit'] = filters.limit
            query_params['offset'] = filters.offset
            
            sql_query = "\n".join(sql_parts).replace("\n","")
            
            # Use DataSource Pydantic model (validates fields)
            data_source = DataSource(
                sql_query=sql_query,
                query_params=query_params,
                executed_at=datetime.now(timezone.utc).isoformat(),
                row_count_at_load=len(study_reviews_dicts),
                category=category,
                can_reload=True
            )
            

            execution_time = int((time.time() - start_time) * 1000)

            # Direct keys, no nesting
            results = {
                'success': True,
                'records': study_reviews_dicts,     # Direct access
                'total': len(study_reviews_dicts),  # Count of returned records
                'category': category,
                'limit': filters.limit,
                'offset': filters.offset,
                'total_available': total,           # Total in DB matching filters
                'data_source': data_source.model_dump(),  # Use Pydantic model_dump()
                'execution_time_ms': execution_time,
                'summary': {                        # For results_registry
                    'records_loaded': len(reviews),
                    'category': category,
                    'total_available': total,
                    'load_time_ms': execution_time
                }
            }


            await self._send_tool_complete(
                session_id=session_id, 
                execution_id=execution_id,
                condition=condition,
                message=f"Completed loading {category} reviews.",
                details={
                    'records_loaded': len(reviews),
                    'category': category,
                    'total_available': total,
                    'filters_applied': filters_applied_dict,
                    'load_time_ms': execution_time
                }
            )

            self._log_results_to_file(results)

            #results = LoadReviewsOutput(**results)
            return results
            
        except Exception as e:
            logger.error(f"Error in LoadReviewsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'error_type': 'execution_error',
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
    FIELD_TYPES: ClassVar[Dict[str, str]] = {
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
        fields = ', '.join(sorted(set(self.FIELD_TYPES.keys())))
        super().__init__(
            name="Filter Reviews",
            tool_id="filter-reviews",
            description=f"Filter customer reviews in state. Options are {fields}",
            timeout=300  # 5 minutes
        )
        self.websocket_manager = None  # Injected by orchestrator
    
    def _apply_string_filter(self, value: str, operator: str, target: Any) -> bool:
        """Apply string comparison operators"""
        if value is None:
            return False
        
        value_str = str(value).lower()
        target_str = str(target).lower()
        
        if operator == 'contains':
            return target_str in value_str
        elif operator == 'not_equals':
            return target_str not in value_str
        elif operator == 'equals':
            return value_str == target_str
        elif operator == 'not_equals':
            return value_str != target_str
        elif operator == 'starts_with':
            return value_str.startswith(target_str)
        elif operator == 'ends_with':
            return value_str.endswith(target_str)
        else:
            return False
    
    def _apply_numeric_filter(self, value: Any, operator: str, target: Any) -> bool:
        """Apply numeric comparison operators"""
        try:
            num_value = float(value) if value is not None else None
            num_target = float(target)
            
            if num_value is None:
                return False
            
            if operator in ['==', 'equals']:
                return num_value == num_target
            elif operator in ['!=', 'not_equals']:
                return num_value != num_target
            elif operator in ['>', 'greater']:
                return num_value > num_target
            elif operator in ['<', 'less']:
                return num_value < num_target
            elif operator in ['>=', 'greater_or_equal']:
                return num_value >= num_target
            elif operator in ['<=', 'less_or_equal']:
                return num_value <= num_target
            else:
                return False
        except (ValueError, TypeError):
            return False
    
    def _apply_boolean_filter(self, value: Any, operator: str, target: Any) -> bool:
        """Apply boolean comparison"""
        if operator == 'equals':
            return bool(value) == bool(target)
        return False
    
    def _apply_filter_condition(self, record: Dict[str, Any], field: str, operator: str, value: Any) -> bool:
        """Apply a single filter condition to a record"""
        if field not in self.FIELD_TYPES:
            logger.warning(f"Unknown field: {field}, skipping filter")
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
    
    async def _run(self, input_data: FilterReviewsInputData) -> Dict[str, Any]:
        """
        Filter reviews dynamically based on field type
        
        Args:
            input_data: {
                'records': List[Dict],          # Direct access
                'total': int,                   # Optional
                'category': str,                # Optional
                'config: Dict[str, Any]         # Node specific config, as per client
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
            {
                'success': bool,
                'filtered_records': List[Dict],     # For apply_row_modification()
                'operation_type': 'filter',         # For tracking
                'criteria': {                       # What was filtered
                    'filters': List[Dict],
                    'records_before': int,
                    'records_after': int
                },
                'execution_time_ms': int,
                'summary': {                        # For results_registry
                    'operation': 'filter',
                    'records_before': int,
                    'records_after': int,
                    'reduction_pct': float
                }
            }
        """
        start_time = time.time()

        try:        
            self._log_input_to_file(input_data)

            records = input_data.get('records', [])
            total = input_data.get('total', len(records))
            category = input_data.get('category', '')

            if not records:
                return {
                    'success': False,
                    'error': 'No reviews to filter',
                    'error_type': 'no_data'
                }
            
            # Parse filter conditions
            filters = []

            # Priority 1: config as SINGLE filter object (90% case)
            if 'config' in input_data and isinstance(input_data['config'], dict):
                config = input_data['config']
                if 'field' in config and 'operator' in config and 'value' in config:
                    # Single filter object - wrap in array
                    filters = [config]
                elif 'filters' in config and isinstance(config['filters'], list):
                    # Nested filters array (less common)
                    filters = config['filters']

            # Priority 2: config as array of filters (rare)
            elif 'config' in input_data and isinstance(input_data['config'], list):
                filters = input_data['config']

            # Priority 3: Root-level 'filters' array (AI assistant format)
            elif 'filters' in input_data and isinstance(input_data['filters'], list):
                filters = input_data['filters']

            # Priority 4: Backward compatibility - single filter at root level
            elif 'field' in input_data and 'operator' in input_data and 'value' in input_data:
                filters = [{
                    'field': input_data['field'],
                    'operator': input_data['operator'],
                    'value': input_data['value']
                }]

            # No valid filter configuration found
            else:
                return {
                    'success': False,
                    'error': 'No filter conditions provided. Use "config" object, "filters" array, or single "field", "operator", "value"',
                    'error_type': 'missing_parameter'
                }

            if not filters:
                return {
                    'success': False,
                    'error': 'Filter configuration is empty',
                    'error_type': 'invalid_parameter'
                }
            
            # State info
            state:dict = input_data.get('state', {})
            condition = state.get('condition')
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')

            await self._send_tool_start(
                session_id=session_id, 
                execution_id=execution_id,
                condition=condition,
                message=f"Start filtering t{total}otal {category} reviews with {len(filters)} condition(s)",
                details={
                    'progress': 10,
                    'total_steps':len(filters)
                }
            )

            logger.info(f"Filtering {total} reviews with {len(filters)} condition(s)")
            
            # Apply all filter conditions (AND logic)
            filtered_records = records
            filter_strings = []
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
                
                value_str = f"'{value}'" if isinstance(value, str) else value
                filter_string = f"{field} {operator} {value_str}"
                filter_strings.append(filter_string)
                logger.debug(f"After filtering by {filter_string}: {len(filtered_records)} records remain")
            
            records_before = len(records)
            records_after = len(filtered_records)
            reduction_pct = round((1 - records_after / records_before) * 100, 1) if records_before > 0 else 0
            
            logger.info(
                f"Filtered {records_before} → {records_after} reviews "
                f"({records_before - records_after} removed, {reduction_pct}% reduction)"
            )
            
            execution_time = int((time.time() - start_time) * 1000)

            if records_after == 0:
                raise RuntimeError(
                    f'Filter settings "{" AND ".join(filter_strings)}" returned 0 records. '
                    f'Adjust filter settings and retry.'
                )

            results = {
                'success': True,
                'filtered_records': filtered_records,   # Key name for row modification tracking
                'operation_type': 'filter',             # Track operation type
                'criteria': {                           # What was filtered
                    'filters': filters,
                    'records_before': records_before,
                    'records_after': records_after,
                    'reduction_pct': reduction_pct
                },
                'total': records_after,                 # Updated total
                'category': category,                   # Pass through
                'execution_time_ms': execution_time,
                'summary': {                            # For results_registry
                    'operation': 'filter',
                    'filters_applied': filters,
                    'records_before': records_before,
                    'records_after': records_after,
                    'records_removed': records_before - records_after,
                    'reduction_pct': reduction_pct,
                    'filter_time_ms': execution_time
                }
            }

            await self._send_tool_complete(
                session_id,
                execution_id=execution_id,
                condition=state.get("condition"),
                message=f"Completed filtering reviews by {" AND ".join(filter_strings)}.",
                details={
                    'filters_applied': " AND ".join(filter_strings),
                    'records_before': records_before,
                    'records_after': records_after,
                    'records_removed': records_before - records_after,
                    'reduction_pct': reduction_pct,
                    'filter_time_ms': execution_time
                }
            )
            self._log_results_to_file(results)

            return results
            
        except Exception as e:
            logger.error(f"Error in FilterReviewsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'error_type': 'execution_error',
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
    SORT_FIELD_MAPPING: ClassVar[Dict[str, str]] = {
        'rating': 'star_rating',
        'helpfulness': 'helpful_votes',
        'helpful': 'helpful_votes',
        'engagement': 'total_votes',
        'votes': 'total_votes',
        'id': 'review_id',
        'product': 'product_id',
        # Allow direct field names too
        'review_id':'review_id',
        'product_id':'product_id',
        'customer_id':'customer_id', 
        'product_title':'product_title',
        'star_rating':'star_rating',
        'review_headline':'review_headline',
        'review_body':'review_body',
        'helpful_votes':'helpful_votes',
        'total_votes':'total_votes',
        'verified_purchase':'verified_purchase',
    }
    
    def __init__(self):
        fields = ', '.join(sorted(set(self.SORT_FIELD_MAPPING.values())))
        super().__init__(
            name="sort-reviews",
            tool_id="filter-reviews",
            description=f"Sort customer reviews in state. Options are {fields}",
            timeout=300  # 5 minutes
        )
        self.websocket_manager = None  # Injected by orchestrator
    
    async def _run(self, input_data: SortReviewsInputData) -> Dict[str, Any]:
        """
        Sort reviews by specified field
        
        Args:
            input_data: {
                'records': List[Dict],              # Direct access
                'total': int,                       # Optional
                'category': str,                    # Optional
                'config': Dict[str, Any]
                    'sort_by': str - Field to sort by (rating, helpfulness, votes, etc.),
                    'descending': bool - Sort in descending order (default: True for ratings/votes)
            }
            
        Returns:
            {
                'success': bool,
                'filtered_records': List[Dict],     # Use filtered_records for tracking
                'operation_type': 'sort',           # For tracking
                'criteria': {                       # How was sorted
                    'sort_by': str,
                    'descending': bool
                },
                'execution_time_ms': int,
                'summary': {                        # For results_registry
                    'operation': 'sort',
                    'sort_field': str,
                    'sort_order': str,
                    'records_processed': int
                }
            }
        """
        start_time = time.time()
        
        try:        
            self._log_input_to_file(input_data)

            records = input_data.get('records', [])
            total = input_data.get('total', len(records))
            category = input_data.get('category', '')
            
            if not records:
                return {
                    'success': False,
                    'error': 'No reviews to sort',
                    'error_type': 'no_data'
                }
            
            # Get sort parameters with defaults
            sort_by = 'helpful_votes'
            descending = True
            
            # Priority 1: config object (workflow builder - 90% case)
            if 'config' in input_data and isinstance(input_data['config'], dict):
                config = input_data['config']
                sort_by = config.get('sort_by', sort_by)
                descending = config.get('descending', descending)
            
            # Priority 2: Root-level parameters (AI assistant format)
            else:
                sort_by = input_data.get('sort_by', sort_by)
                descending = input_data.get('descending', descending)
            
            # Map user-friendly name to actual field
            if sort_by.lower() in self.SORT_FIELD_MAPPING:
                actual_field = self.SORT_FIELD_MAPPING[sort_by.lower()]
            else:
                return {
                    'success': False,
                    'error': f'Invalid sort field: {sort_by}. Valid options: {list(self.SORT_FIELD_MAPPING.keys())}',
                    'error_type': 'invalid_parameter'
                }
            
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
                    'error_type': 'execution_error'
                }
            
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Successfully sorted {len(sorted_records)} reviews by {actual_field}")
            
            results = {
                'success': True,
                'filtered_records': sorted_records,     # Use filtered_records for tracking
                'operation_type': 'sort',               # Track operation type
                'criteria': {                           # How was sorted
                    'sort_by': actual_field,
                    'descending': descending,
                },
                'total': len(sorted_records),           # Pass through
                'category': category,                   # Pass through
                'execution_time_ms': execution_time,
                'summary': {                            # For results_registry
                    'operation': 'sort',
                    'sort_field': actual_field,
                    'sort_order': 'descending' if descending else 'ascending',
                    'records_processed': len(sorted_records),
                    'sort_time_ms': execution_time
                }
            }

            self._log_results_to_file(results)

            return results
            
        except Exception as e:
            logger.error(f"Error in SortReviewsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'error_type': 'execution_error',
                'execution_time_ms': int((time.time() - start_time) * 1000)
            }

class DataCleanerTool(BaseTool):
    """
    Data cleaner using SQL filtering with streaming progress
    
    This tool performs data cleaning through:
    - Streaming step-by-step progress for each cleaning operation
    - Detailed reporting of what was removed and why
    - Actually filters by malformed_type column in database
    
    DB Structure:
    - malformed_type = NULL → Good data (KEEP)
    - malformed_type = 'missing_data' → Remove if remove_nulls=True
    - malformed_type = 'spam' → Remove if normalize_text=True
    
    User Parameters:
    - remove_nulls: Remove records with missing data
    - normalize_text: Remove spam/malformed text
    - remove_duplicates: Remove duplicate reviews
    """
    
    def __init__(self):
        super().__init__(
            name="Data Cleaner",
            tool_id="clean-data",
            description="Clean customer reviews in state from spam and malformed records",
            timeout=300  # 5 minutes
        )
        self.websocket_manager = None   # Injected by orchestrator
        
    def _get_missing_fields(self, record: Dict[str, Any]) -> List[str]:
        """
        Identify which fields have missing data
        For study purposes, we track common review fields
        """
        missing_fields = []
        important_fields = [
            'review_body', 
            'review_headline', 
            'product_title',
            'star_rating'
        ]
        
        for field in important_fields:
            value = record.get(field)
            if value is None or (isinstance(value, str) and value.strip() == ''):
                missing_fields.append(field)
        
        return missing_fields
    
    async def _run(self, input_data: CleanReviewsInputData) -> Dict[str, Any]:
        """
        Clean reviews using SQL malformed_type filter
        
        Args:
            input_data: {
                'records': List[Dict],              # Direct access (no 'data' wrapper)
                'total': int,                       # Optional
                'category': str,                    # Optional
                'config': Dict[str, Any]
                    'remove_nulls': bool - Remove missing_data entries (default: True),
                    'normalize_text': bool - Remove spam entries (default: True),
                    'remove_duplicates': bool - Remove duplicate reviews (default: False),
                'session_id': str - For WebSocket updates (optional),
                'execution_id': int - For WebSocket updates (optional)
            }
            
        Returns:
            {
                'success': bool,
                'filtered_records': List[Dict],     # For apply_row_modification()
                'operation_type': 'clean',          # For tracking
                'criteria': {                       # What was cleaned
                    'remove_nulls': bool,
                    'normalize_text': bool,
                    'remove_duplicates': bool,
                    'operations': Dict
                },
                'execution_time_ms': int,
                'summary': {                        # For results_registry
                    'operation': 'clean',
                    'records_before': int,
                    'records_after': int,
                    'total_removed': int,
                    'quality_score': float
                }
            }
        """
        start_time = time.time()
    
        try:                
            self._log_input_to_file(input_data)
                
            # Extract data and parameters
            records = input_data.get('records', [])
            total = input_data.get('total', len(records))
            category = input_data.get('category', '')
            
            # Extract session info for WebSocket updates
            state = input_data.get('category', '')
            condition = input_data.get('condition')
            session_id = input_data.get('session_id')
            execution_id = input_data.get('execution_id')
            
            # Validate input
            if not records:
                logger.warning("No reviews provided for cleaning")
                return {
                    'success': False,
                    'error': 'No reviews to clean',
                    'error_type': 'no_data'
                }
            
            if not isinstance(records, list):
                logger.error(f"Invalid records type: {type(records)}, expected list")
                return {
                    'success': False,
                    'error': f'Invalid records type: expected list, got {type(records).__name__}',
                    'error_type': 'invalid_input'
                }

            # Get cleaning parameters with defaults
            remove_nulls = True
            normalize_text = True
            remove_duplicates = False
            
            # Priority 1: config object (workflow builder - 90% case)
            if 'config' in input_data and isinstance(input_data['config'], dict):
                config = input_data['config']
                remove_nulls = config.get('remove_nulls', remove_nulls)
                normalize_text = config.get('normalize_text', normalize_text)
                remove_duplicates = config.get('remove_duplicates', remove_duplicates)
            
            # Priority 2: Root-level parameters (AI assistant format)
            else:
                remove_nulls = input_data.get('remove_nulls', remove_nulls)
                normalize_text = input_data.get('normalize_text', normalize_text)
                remove_duplicates = input_data.get('remove_duplicates', remove_duplicates)
            
            logger.info(
                f"Cleaning {len(records)} reviews: "
                f"remove_nulls={remove_nulls}, normalize_text={normalize_text}, "
                f"remove_duplicates={remove_duplicates}"
            )
            
            original_count = len(records)
                    
            # Track results for each operation
            operation_results = {
                'missing_data': {
                    'enabled': remove_nulls,
                    'removed': 0,
                    'fields_affected': []
                },
                'spam': {
                    'enabled': normalize_text,
                    'removed': 0
                },
                'duplicates': {
                    'enabled': remove_duplicates,
                    'removed': 0
                }
            }
            
            # ========================================
            # INITIALIZATION
            # ========================================
            
            # Step 1: Initialization (10%)
            await self._send_tool_start(
                session_id=session_id, 
                execution_id=execution_id,
                condition=condition,
                message="Loading data quality assessment...",
                details={
                    'progress': 10,
                    'total_steps': 5,
                },
                status="initializing"
            )
            
            # Start with all records
            working_records = records.copy()
            current_progress = 10
            
            # ========================================
            # STEP 2: REMOVE MISSING DATA
            # ========================================
            if remove_nulls:
                try:
                    await self._send_tool_update(
                        session_id=session_id,
                        execution_id= execution_id,
                        condition=condition,
                        progress=current_progress + 10,
                        message="Scanning for incomplete records...",
                        details={
                            "step_num": 1,
                            "total_steps": 5
                        },
                        status="scanning_missing_data"
                    )
                    
                    # Filter out records with missing_data
                    records_before = len(working_records)
                    fields_with_missing = set()
                    
                    filtered_records = []
                    for record in working_records:
                        try:
                            malformed_type = record.get('malformed_type')
                            
                            if malformed_type == 'missing_data':
                                # Track which fields are missing
                                missing_fields = self._get_missing_fields(record)
                                fields_with_missing.update(missing_fields)
                                operation_results['missing_data']['removed'] += 1
                            else:
                                filtered_records.append(record)
                        except Exception as e:
                            logger.warning(f"Error processing record for missing data: {e}")
                            # Keep the record if we can't determine if it's missing data
                            filtered_records.append(record)

                    working_records = filtered_records
                    records_after = len(working_records)
                    removed_count = records_before - records_after
                    
                    operation_results['missing_data']['fields_affected'] = list(fields_with_missing)
                    
                    # Send detailed result
                    if removed_count > 0:
                        fields_str = ', '.join(fields_with_missing) if fields_with_missing else 'various fields'
                        message=f"Removed {removed_count} records with missing data in: {fields_str}"
                        logger.info(f"  ➜ Removed {removed_count} records with missing data (fields: {fields_str})")
                    else:
                        fields_str = None
                        message="No records with missing data found - all records complete"
                        logger.info(f"  ➜ No missing data found")

                    await self._send_tool_update(
                        session_id=session_id,
                        execution_id= execution_id,
                        condition=condition,
                        progress=current_progress + 25,
                        message=f"Removed {removed_count} records with missing data in: {fields_str}",
                        details={
                            "step_num": 4,
                            "total_steps": 5,
                            'removed': removed_count, 
                            **({'fields': fields_str} if fields_str else {})
                        },
                        status="missing_data_complete"
                    )

                    current_progress += 25
                    
                except Exception as e:
                    logger.error(f"Error during missing data removal: {e}", exc_info=True)
                    # Continue with existing records
                    current_progress += 25
            else:
                logger.info(f"  ➜ Missing data removal: SKIPPED (disabled)")
                current_progress += 25
            
            # ========================================
            # STEP 3: REMOVE SPAM/NORMALIZE TEXT
            # ========================================
            if normalize_text:
                try:
                    await self._send_tool_update(
                        session_id=session_id,
                        execution_id=execution_id,
                        condition=condition,
                        progress=current_progress + 10,
                        message="Analyzing text patterns for spam and malformed content...",
                        details={
                            "step_num": 4,
                            "total_steps": 5
                        },
                        status="scanning_spam"
                    )
                    
                    # Filter out spam records
                    records_before = len(working_records)
                    
                    filtered_records = []
                    for record in working_records:
                        try:
                            malformed_type = record.get('malformed_type')
                            
                            if malformed_type == 'spam':
                                operation_results['spam']['removed'] += 1
                            else:
                                filtered_records.append(record)
                        except Exception as e:
                            logger.warning(f"Error processing record for spam: {e}")
                            # Keep the record if we can't determine if it's spam
                            filtered_records.append(record)
                    
                    working_records = filtered_records
                    records_after = len(working_records)
                    removed_count = records_before - records_after
                    
                    # Send detailed result
                    if removed_count > 0:
                        message = f"Removed {removed_count} spam/malformed reviews"
                        logger.info(f"  ➜ Removed {removed_count} spam/malformed reviews")
                    else:
                        message="No spam or malformed content detected - all reviews valid"
                        logger.info(f"  ➜ No spam found")
                    
                    await self._send_tool_update(
                            session_id=session_id,
                            execution_id=execution_id,
                            condition=condition,
                            progress=current_progress + 25,
                            message=message,
                            details={
                                "step_num": 4,
                                "total_steps": 5,
                                'removed': removed_count
                            },
                            status="spam_complete"
                        )
                    current_progress += 25
                    
                except Exception as e:
                    logger.error(f"Error during spam removal: {e}", exc_info=True)
                    # Continue with existing records
                    current_progress += 25
            else:
                logger.info(f"  ➜ Spam removal: SKIPPED (disabled)")
                current_progress += 25
            
            # ========================================
            # STEP 4: REMOVE DUPLICATES
            # ========================================
            if remove_duplicates:
                try:
                    await self._send_tool_update(
                        session_id=session_id,
                        execution_id=execution_id,
                        condition=condition,
                        progress=current_progress + 10,
                        message="Checking for duplicate reviews by ID...",
                        details={
                            "step_num": 4,
                            "total_steps": 5
                        },
                        status="scanning_duplicates"
                    )
                    
                    # Deduplicate by review_id
                    records_before = len(working_records)
                    seen_ids = set()
                    unique_records = []
                    
                    for record in working_records:
                        try:
                            review_id = record.get('review_id')
                            if review_id:
                                if review_id not in seen_ids:
                                    seen_ids.add(review_id)
                                    unique_records.append(record)
                                else:
                                    operation_results['duplicates']['removed'] += 1
                            else:
                                # Keep records without IDs (shouldn't happen)
                                unique_records.append(record)
                        except Exception as e:
                            logger.warning(f"Error processing record for duplicates: {e}")
                            # Keep the record if we can't process it
                            unique_records.append(record)
                    
                    working_records = unique_records
                    records_after = len(working_records)
                    removed_count = records_before - records_after
                    
                    # Send detailed result
                    if removed_count > 0:
                        message=f"Removed {removed_count} duplicate reviews"
                        logger.info(f"  ➜ Removed {removed_count} duplicates")
                    else:
                        message="No duplicate reviews detected - all reviews unique"
                        logger.info(f"  ➜ No duplicates found")                    

                    await self._send_tool_update(
                        session_id=session_id,
                        execution_id=execution_id,
                        condition=condition,
                        progress=current_progress + 20,
                        message=f"Removed {removed_count} duplicate reviews",
                        details={
                            "step_num": 4,
                            "total_steps": 5,
                            'removed': removed_count
                        },
                        status="duplicates_complete",
                    )

                    current_progress += 20
                    
                except Exception as e:
                    logger.error(f"Error during duplicate removal: {e}", exc_info=True)
                    # Continue with existing records
                    current_progress += 20
            else:
                logger.info(f"  ➜ Duplicate removal: SKIPPED (disabled)")
                current_progress += 20
            
            # ========================================
            # STEP 5: FINALIZATION
            # ========================================

            cleaned_records = working_records
            total_removed = original_count - len(cleaned_records)
            execution_time = int((time.time() - start_time) * 1000)
            
            # Build summary message
            summary_parts = []
            if operation_results['missing_data']['enabled']:
                count = operation_results['missing_data']['removed']
                summary_parts.append(f"{count} missing data")
            if operation_results['spam']['enabled']:
                count = operation_results['spam']['removed']
                summary_parts.append(f"{count} spam")
            if operation_results['duplicates']['enabled']:
                count = operation_results['duplicates']['removed']
                summary_parts.append(f"{count} duplicates")
            
            summary_str = ", ".join(summary_parts) if summary_parts else "0 issues"
            
            await self._send_tool_complete(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                message=f"Cleaned {original_count} → {len(cleaned_records)} reviews (removed: {summary_str})",
                details={
                    'records_before': original_count,
                    'records_after': len(cleaned_records),
                    'total_removed': total_removed,
                    'missing_data_removed': operation_results['missing_data']['removed'],
                    'spam_removed': operation_results['spam']['removed'],
                    'duplicates_removed': operation_results['duplicates']['removed'],
                    'execution_time_ms': execution_time
                }
            )
            
            
            logger.info(
                f"Data Cleaner complete: {original_count} → {len(cleaned_records)} reviews "
                f"(removed {total_removed}: {operation_results['missing_data']['removed']} missing_data, "
                f"{operation_results['spam']['removed']} spam, "
                f"{operation_results['duplicates']['removed']} duplicates) in {execution_time}ms"
            )
            
            results = {
                'success': True,
                'filtered_records': cleaned_records,    # For apply_row_modification()
                'operation_type': 'clean',              # Track operation type
                'criteria': {                           # What was cleaned
                    'remove_nulls': remove_nulls,
                    'normalize_text': normalize_text,
                    'remove_duplicates': remove_duplicates,
                },
                'total': len(cleaned_records),          # Updated total
                'category': category,                   # Pass through
                'execution_time_ms': execution_time,
                'summary': {                            # For results_registry
                    'operation': 'clean',
                    'records_before': original_count,
                    'records_after': len(cleaned_records),
                    'total_removed': total_removed,
                    'missing_data_removed': operation_results['missing_data']['removed'],
                    'spam_removed': operation_results['spam']['removed'],
                    'duplicates_removed': operation_results['duplicates']['removed'],
                    'quality_score': round((len(cleaned_records) / original_count) * 100, 1) if original_count > 0 else 100,
                    'clean_time_ms': execution_time
                }
            }

            self._log_results_to_file(results)

            return results
        
        except Exception as e:
                        # Catch-all for any unexpected errors
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = f"Unexpected error during data cleaning: {str(e)}"
            logger.error(error_msg, exc_info=True)
        
        try:
            # Try to send error notification via WebSocket
            session_id = input_data.get('session_id')
            execution_id = input_data.get('execution_id')
            await self._send_tool_error(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                error_message=str(e),
                error_type= type(e).__name__,
                details={
                    "step_num": 5,
                    "total_steps": 5,
                    'progress': 100,
                    'removed': removed_count
                }
            )
        except:
            pass  # Ignore WebSocket errors during error handling
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'unexpected_error',
            'execution_time_ms': execution_time
        }

__all__ = [
    'LoadReviewsTool',
    'FilterReviewsTool',
    'SortReviewsTool',
    'DataCleanerTool'
]