# backend/app/orchestrator/graphs/shared_state.py
"""
Memory-Optimized State with TypedDict (LangGraph Compatible)

Architecture:
- State schema: TypedDict (required by LangGraph)
- Internal models: Pydantic BaseModel (for validation/structure)
- Best of both worlds: LangGraph compatibility + validation

Key insight: LangGraph state uses TypedDict, but internal storage can use Pydantic!
"""
from typing import TypedDict, List, Dict, Any, Optional, Set, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


# ============================================================
# INTERNAL MODELS (Pydantic for validation)
# ============================================================

class DataSource(BaseModel):
    """
    SQL query reference (source of truth)
    
    Instead of duplicating data, we store the query that generated it.
    Benefits:
    - Lazy reloading from DB
    - Audit trail
    - Memory efficiency
    """
    sql_query: str
    query_params: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    executed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    row_count_at_load: int = 0
    category: str = ""
    
    # Can we reload?
    can_reload: bool = True
    
    class Config:
        extra = "forbid"
    
    def get_reload_signature(self) -> str:
        """Get unique signature for caching"""
        return f"{self.sql_query}:{str(sorted(self.query_params.items()))}"


class RowOperation(BaseModel):
    """
    Record of a row-modifying operation
    
    Data processing tools modify rows.
    We track these operations for audit trail and debugging.
    """
    tool_id: str
    tool_name: str
    operation_type: Literal['filter', 'clean', 'sort', ]
    tool_category: str = 'data'
    
    # Before/after
    rows_before: int
    rows_after: int
    rows_removed: int = 0
    
    # Operation details
    criteria: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    execution_time_ms: int = 0
    
    class Config:
        extra = "allow"


class RecordStore(BaseModel):
    """
    Internal storage model with product title deduplication
    
    This is NOT the LangGraph state - it's a data structure stored INSIDE the state
    """
    records: List[Dict[str, Any]] = Field(default_factory=list)
    record_index: Dict[str, int] = Field(default_factory=dict)
    product_titles: Dict[str, str] = Field(default_factory=dict)
    
    total: int = 0
    category: str = ""
    
    class Config:
        extra = "forbid"
    
    def initialize(self, records: List[Dict[str, Any]], category: str):
        """Initialize with product title deduplication"""
        optimized_records = []
        
        for record in records:
            # Deduplicate product title
            if 'product_title' in record and 'product_id' in record:
                product_id = record['product_id']
                if product_id not in self.product_titles:
                    self.product_titles[product_id] = record['product_title']
                
                # Store record without title
                opt_record = {k: v for k, v in record.items() if k != 'product_title'}
                optimized_records.append(opt_record)
            else:
                optimized_records.append(record)
        
        self.records = optimized_records
        self.total = len(optimized_records)
        self.category = category
        self.record_index = {r['review_id']: idx for idx, r in enumerate(optimized_records)}
        
        logger.info(
            f"✓ RecordStore: {self.total} records, "
            f"{len(self.product_titles)} unique products"
        )
    
    def update_records(self, new_records: List[Dict[str, Any]]) -> RowOperation:
        """
        Update records (for filter/clean operations)
        
        DESTRUCTIVE: Replaces existing records with filtered set
        Safe because: SQL reference allows reload if needed
        
        Returns: RowOperation for audit trail
        """
        rows_before = self.total
        
        # Update records (without product titles, they're deduplicated)
        self.records = new_records
        self.total = len(new_records)
        self.record_index = {r['review_id']: idx for idx, r in enumerate(new_records)}
        
        rows_after = self.total
        rows_removed = rows_before - rows_after
        
        logger.info(f"✓ Records updated: {rows_before} → {rows_after} rows ({rows_removed} removed)")
        
        return RowOperation(
            tool_id='',  # Will be set by caller
            tool_name='',
            operation_type='filter',
            rows_before=rows_before,
            rows_after=rows_after,
            rows_removed=rows_removed
        )
    
    def get_full_record(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Get record with product title reconstructed"""
        idx = self.record_index.get(review_id)
        if idx is None:
            return None
        
        record = self.records[idx]
        
        # Reconstruct product title
        if 'product_id' in record and record['product_id'] in self.product_titles:
            return {
                **record,
                'product_title': self.product_titles[record['product_id']]
            }
        return record


class ColumnEnrichment(BaseModel):
    """Column enrichment (internal model)"""
    tool_id: str
    tool_name: str
    columns_added: List[str]
    column_data: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    class Config:
        extra = "forbid"


class EnrichmentRegistry(BaseModel):
    """Registry of enrichments (internal model)"""
    enrichments: Dict[str, ColumnEnrichment] = Field(default_factory=dict)
    execution_order: List[str] = Field(default_factory=list)
    
    class Config:
        extra = "forbid"
    
    def add(self, enrichment: ColumnEnrichment):
        self.enrichments[enrichment.tool_id] = enrichment
        if enrichment.tool_id not in self.execution_order:
            self.execution_order.append(enrichment.tool_id)
    
    def get_enriched_record(self, base_record: Dict[str, Any]) -> Dict[str, Any]:
        """Build enriched record on-demand"""
        review_id = base_record['review_id']
        enriched = base_record.copy()
        
        for tool_id in self.execution_order:
            enrichment = self.enrichments.get(tool_id)
            if enrichment and review_id in enrichment.column_data:
                enriched.update(enrichment.column_data[review_id])
        
        return enriched


class ToolResult(BaseModel):
    """Tool result (internal model)"""
    tool_id: str
    tool_name: str
    summary: Dict[str, Any] = Field(default_factory=dict)
    detailed_output: Dict[str, Any] = Field(default_factory=dict)
    execution_time_ms: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    class Config:
        extra = "forbid"


class ResultsRegistry(BaseModel):
    """Registry of tool results (internal model)"""
    results: Dict[str, ToolResult] = Field(default_factory=dict)
    
    class Config:
        extra = "forbid"
    
    def add(self, result: ToolResult):
        self.results[result.tool_id] = result


# ============================================================
# SHARED WORKFLOW STATE - LANGGRAPH STATE SCHEMA 
# ============================================================
class SharedWorkflowState(TypedDict, total=False):
    """
    LangGraph state schema using TypedDict
    Shared state structure used by both Workflow Builder and AI Assistant graphs
    
    This state flows through the LangGraph execution and is checkpointed to Redis/PostgreSQL
    """
    
    # ========================================
    # EXECUTION METADATA
    # ========================================
    
    # Unique identifier for this execution instance
    execution_id: int
    
    # User session identifier for WebSocket communication and tracking
    session_id: str
    
    # Experimental condition: determines execution paradigm
    condition: Literal['workflow_builder', 'ai_assistant']
    
    # Current step number in execution (0-indexed, increments with each node)
    step_number: int
    
    # Current node being executed (node ID from workflow or agent state)
    current_node: str
    
    # Current execution status
    status: Literal['running', 'paused', 'completed', 'error']
    
    
    # ========================================
    # HYBRID ARCHITECTURE STORAGE
    # ========================================
    
    # SQL source of truth (query that generated the dataset)
    # Stores query reference instead of duplicating data (1KB vs 2MB)
    # Enables lazy reloading from database and provides audit trail
    data_source: Optional[Dict[str, Any]]           # DataSource.model_dump()
    
    # Complete history of row-modifying operations (filter, clean, sort)
    # Tracks dataset transformations for research analysis and debugging
    # Each entry records rows before/after, criteria, and execution time
    row_operation_history: List[Dict[str, Any]]     # List[RowOperation.model_dump()]
    
    # Current working dataset with memory optimization
    # Uses product title deduplication (5% memory savings)
    # Mutable - gets replaced by filter/clean operations
    record_store: Optional[Dict[str, Any]]          # RecordStore.model_dump()
    
    # Registry of column enrichments (sentiment, insights, etc.)
    # Additive-only - enrichments don't modify existing rows
    # Stored separately for efficient updates and reconstruction
    enrichment_registry: Dict[str, Any]             # EnrichmentRegistry.model_dump()
    
    # Registry of tool execution results
    # Stores summary and detailed output from each tool
    # Used for final result extraction and analysis
    results_registry: Dict[str, Any]                # ResultsRegistry.model_dump()
    
    # Analysis outputs (NEW)
    sentiment_statistics: Optional[Dict[str, Any]]  # Sentiment distribution stats
    theme_analysis: Optional[Dict[str, Any]]        # Theme aggregation results
    insights: Optional[Dict[str, Any]]              # Generated business insights

    # Immutable snapshot of base dataset (review IDs only)
    # Used to validate that enrichments/filters don't violate base set
    base_record_ids: List[str]
    
    # Count of records in base dataset (before any filtering)
    # Reference point for calculating reduction percentages
    base_record_count: int
    
    # Column names present in base dataset
    # Used to track which columns are original vs enriched
    base_columns: List[str]
    
    
    # ========================================
    # METADATA
    # ========================================
    
    # Original input data from client request
    # Immutable - preserved throughout execution for traceability
    input_data: Dict[str, Any]
    
    # List of errors encountered during execution
    # Each error includes: step, message, node_id, timestamp
    # Non-blocking errors are logged here while execution continues
    errors: List[Dict[str, Any]]
    
    # Non-fatal warnings that don't stop execution
    # Examples: missing optional parameters, performance degradation
    warnings: List[str]
    
    # ISO timestamp when execution started
    # Format: YYYY-MM-DDTHH:MM:SS.ssssss+00:00 (timezone-aware UTC)
    started_at: str
    
    # ISO timestamp of most recent step completion
    # Updated after each node execution; used to calculate step duration
    last_step_at: str
    
    # Total execution time in milliseconds
    # Accumulated across all steps; excludes user intervention time
    total_time_ms: int
    
    # Count of user interventions (pauses, manual modifications)
    # Research metric: measures user agency and control
    user_interventions: int
    
    # Count of checkpoints created during execution
    # Strategic checkpoints vary by condition
    checkpoints_created: int
    
    # Workflow definition for Workflow Builder condition
    # Contains nodes, edges, and tool configurations
    # None for AI Assistant condition
    workflow_definition: Optional[Dict[str, Any]]
    
    # Natural language task description for AI Assistant condition
    # User's goal statement that agent plans and executes
    # None for Workflow Builder condition
    task_description: Optional[str]
    
    # Agent's planned execution steps (AI Assistant only)
    # List of step descriptions generated during planning phase
    # None for Workflow Builder condition
    agent_plan: Optional[List[str]]
    
    # Agent's conversation memory (AI Assistant only)
    # Stores context from previous steps for coherent execution
    # None for Workflow Builder condition
    agent_memory: Optional[List[Dict[str, Any]]]
    
    # Smart verbosity escalation counter (AI Assistant only)
    # Tracks LLM decision retry attempts for progressive verbosity increase
    # 0 = first attempt (brief), 1 = retry (standard), 2+ = struggling (full)
    # Reset to 0 on successful decision
    decision_retry_count: int
    
    # Additional custom metadata
    # Extensible field for condition-specific or experiment-specific data
    # Examples: participant_id, experiment_phase, ui_interactions
    metadata: Dict[str, Any]


class NodeExecutionResult(TypedDict):
    """Result structure from executing a single node"""
    success: bool
    output_data: Dict[str, Any]
    execution_time_ms: int
    error: Optional[str]
    metadata: Dict[str, Any]


class AgentDecision(TypedDict):
    """Structure for AI Assistant agent decisions"""
    action: str                     # Action to take: 'gather_data', 'analyze', 'output', 'finish'
    reasoning: str                  # Agent's reasoning process
    tool_name: Optional[str]        # Tool to use
    tool_params: Dict[str, Any]     # Parameters for tool
    confidence: float               # Confidence score (0-1)
    alternatives_considered: List[str]  # Other options considered

# ============================================================
# HELPER FUNCTIONS (for working with state)
# ============================================================

def initialize_state(
    execution_id: int,
    session_id: str,
    condition: Literal['workflow_builder', 'ai_assistant']
) -> SharedWorkflowState:
    """
    Create new state with defaults
    
    Returns TypedDict (LangGraph compatible)
    """
    return {
        'execution_id': execution_id,
        'session_id': session_id,
        'condition': condition,
        'step_number': 0,
        'current_node': '',
        'status': 'running',
        
        # Hybrid architecture storage
        'data_source': None,  # SQL reference
        'row_operation_history': [],  # Row modifications
        'record_store': None,
        'enrichment_registry': EnrichmentRegistry().model_dump(),
        'results_registry': ResultsRegistry().model_dump(),
        
        'sentiment_statistics': None,
        'theme_analysis': None,
        'insights': None,

        'base_record_ids': list(),
        'base_record_count': 0,
        'base_columns': list(),
        
        'input_data': {},
        'errors': [],
        'warnings': [],
        
        'started_at': datetime.now(timezone.utc).isoformat(),
        'last_step_at': None,
        'total_time_ms': 0,
        
        'user_interventions': 0,
        'checkpoints_created': 0,   

        'workflow_definition': None,
        'task_description': None,
        'agent_plan': [],
        'agent_memory': [],
        'decision_retry_count': 0,

        'metadata': {}
    }


def initialize_records(
    state: SharedWorkflowState,
    records: List[Dict[str, Any]],
    category: str,
    sql_query: Optional[str] = None,
    query_params: Optional[Dict[str, Any]] = None
):
    """
    Initialize record store with SQL reference and deduplication
    
    Args:
        state: LangGraph state
        records: Initial records from DB
        category: Data category
        sql_query: SQL query used to fetch records (for reload)
        query_params: Query parameters
    
    Modifies state in-place (LangGraph pattern)
    """
    # Store SQL reference (source of truth)
    if sql_query:
        data_source = DataSource(
            sql_query=sql_query,
            query_params=query_params or {},
            row_count_at_load=len(records),
            category=category,
            can_reload=True
        )
        state['data_source'] = data_source.model_dump()
        logger.info(f"✓ SQL reference stored: {len(records)} rows from query")
    
    # Create Pydantic model for validation + deduplication
    record_store = RecordStore()
    record_store.initialize(records, category)
    
    # Store as dict in state (LangGraph expects dicts)
    state['record_store'] = record_store.model_dump()
    
    # Update metadata
    state['base_record_ids'] = list(r['review_id'] for r in records)
    state['base_record_count'] = len(records)
    state['base_columns'] = list(records[0].keys()) if records else list()


def get_record_store(state: SharedWorkflowState) -> Optional[RecordStore]:
    """
    Reconstruct RecordStore from state dict
    
    Pattern: State stores dicts, but we work with Pydantic models for validation
    """
    if not state.get('record_store'):
        return None
    
    # Reconstruct from dict
    return RecordStore(**state['record_store'])


def get_enrichment_registry(state: SharedWorkflowState) -> EnrichmentRegistry:
    """Reconstruct EnrichmentRegistry from state dict"""
    return EnrichmentRegistry(**state['enrichment_registry'])


def get_results_registry(state: SharedWorkflowState) -> ResultsRegistry:
    """Reconstruct ResultsRegistry from state dict"""
    return ResultsRegistry(**state['results_registry'])


def apply_enrichment(
    state: SharedWorkflowState,
    tool_name: str,
    tool_id: str,
    column_data: Dict[str, Dict[str, Any]],
    columns_added: List[str]
):
    """
    Apply column enrichment
    
    Pattern:
    1. Reconstruct Pydantic model from state dict
    2. Apply changes to model
    3. Store back as dict
    """
    # Reconstruct
    enrichment_registry = get_enrichment_registry(state)
    
    # Apply change
    enrichment = ColumnEnrichment(
        tool_id=tool_id,
        tool_name=tool_name,
        columns_added=columns_added,
        column_data=column_data
    )
    enrichment_registry.add(enrichment)
    
    # Store back as dict
    state['enrichment_registry'] = enrichment_registry.model_dump()


def apply_row_modification(
    state: SharedWorkflowState,
    tool_name: str,
    tool_id: str,
    filtered_records: List[Dict[str, Any]],
    operation_type: Literal['filter', 'clean', 'deduplicate', 'sample'],
    criteria: Dict[str, Any],
    execution_time_ms: int = 0
):
    """
    Apply row modification (DESTRUCTIVE operation)
    
    FOR TOOLS WITH category='data' ONLY!
    
    This REPLACES records with filtered subset.
    Safe because SQL reference allows reload if needed.
    
    Args:
        state: LangGraph state
        tool_name: Human-readable tool name
        tool_id: Unique tool identifier
        filtered_records: New record list (fewer rows)
        operation_type: Type of operation
        criteria: Filter criteria for audit
        execution_time_ms: Execution time
    
    Example:
        # FilterReviews tool
        filtered = [r for r in records if r['rating'] >= 4]
        apply_row_modification(
            state, 'Filter Reviews', 'filter_reviews',
            filtered, 'filter', {'min_rating': 4}
        )
    """
    # Reconstruct record store
    record_store = get_record_store(state)
    if not record_store:
        logger.error("No record store to modify!")
        return
    
    # Apply row update (returns operation for audit)
    operation = record_store.update_records(filtered_records)
    
    # Update operation metadata
    operation.tool_id = tool_id
    operation.tool_name = tool_name
    operation.operation_type = operation_type
    operation.criteria = criteria
    operation.execution_time_ms = execution_time_ms
    
    # Store back to state
    state['record_store'] = record_store.model_dump()
    
    # Track operation in history
    state['row_operation_history'].append(operation.model_dump())
    
    logger.info(
        f"✓ Row modification: {tool_name} reduced dataset from "
        f"{operation.rows_before} to {operation.rows_after} rows "
        f"({operation.rows_removed} removed, "
        f"{operation.rows_after/operation.rows_before*100:.1f}% remaining)"
    )


def get_input_data(state: SharedWorkflowState) -> Dict[str, Any]:
    """Get input data from state"""
    return state.get('input_data', {})


def get_all_enriched_records(state: SharedWorkflowState, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Get all enriched records with product titles reconstructed
    
    Pattern: Reconstruct models, build records, return
    """
    record_store = get_record_store(state)
    if not record_store:
        return []
    
    enrichment_registry = get_enrichment_registry(state)
    
    records = []
    for idx, base_record in enumerate(record_store.records):
        if limit and idx >= limit:
            break
        
        # Reconstruct product title
        if 'product_id' in base_record and base_record['product_id'] in record_store.product_titles:
            base_with_title = {
                **base_record,
                'product_title': record_store.product_titles[base_record['product_id']]
            }
        else:
            base_with_title = base_record
        
        # Add enrichments
        enriched = enrichment_registry.get_enriched_record(base_with_title)
        records.append(enriched)
    
    return records


def get_working_data_dict(state: SharedWorkflowState) -> Dict[str, Any]:
    """
    Get working data for tool input
    
    Returns fully reconstructed records with product titles + enrichments
    """
    record_store = get_record_store(state)
    
    return {
        'records': get_all_enriched_records(state),
        'total': record_store.total if record_store else 0,  # Current count (after filters)
        'original_count': state.get('base_record_count', 0),  # Original count (at load)
        'category': record_store.category if record_store else get_input_data(state).get('category', ''),
        'unique_products': len(record_store.product_titles) if record_store else 0
    }


def get_row_operation_summary(state: SharedWorkflowState) -> Dict[str, Any]:
    """
    Get summary of all row operations
    
    Returns:
        - total_operations: Number of filter/clean operations
        - initial_rows: Row count at load
        - current_rows: Row count now
        - total_removed: Total rows removed
        - reduction_pct: Percentage reduction
    """
    operations = state.get('row_operation_history', [])
    
    if not operations:
        return {
            'total_operations': 0,
            'initial_rows': state.get('base_record_count', 0),
            'current_rows': state.get('base_record_count', 0),
            'total_removed': 0,
            'reduction_pct': 0.0
        }
    
    initial_rows = operations[0]['rows_before']
    current_rows = operations[-1]['rows_after']
    total_removed = sum(op['rows_removed'] for op in operations)
    reduction_pct = (total_removed / initial_rows * 100) if initial_rows > 0 else 0
    
    return {
        'total_operations': len(operations),
        'initial_rows': initial_rows,
        'current_rows': current_rows,
        'total_removed': total_removed,
        'reduction_pct': reduction_pct,
        'operations': [
            {
                'tool_name': op['tool_name'],
                'operation_type': op['operation_type'],
                'rows_before': op['rows_before'],
                'rows_after': op['rows_after'],
                'rows_removed': op['rows_removed']
            }
            for op in operations
        ]
    }


def get_data_source_info(state: SharedWorkflowState) -> Optional[Dict[str, Any]]:
    """
    Get SQL data source information
    
    Returns:
        - sql_query: SQL query used to load data
        - query_params: Query parameters
        - row_count_at_load: Initial row count
        - can_reload: Whether data can be reloaded
    """
    data_source = state.get('data_source')
    if not data_source:
        return None
    
    return {
        'sql_query': data_source['sql_query'],
        'query_params': data_source['query_params'],
        'row_count_at_load': data_source['row_count_at_load'],
        'category': data_source['category'],
        'can_reload': data_source['can_reload'],
        'executed_at': data_source['executed_at']
    }


# ============================================================
# USAGE EXAMPLE
# ============================================================

"""
# EXAMPLE 1: Load reviews with SQL reference

async def load_reviews_node(state: SharedWorkflowState):
    # Build SQL query
    sql_query = '''
        SELECT review_id, product_id, product_title,
               star_rating, review_body, verified_purchase
        FROM reviews
        WHERE category = :category
        AND star_rating >= :min_rating
        LIMIT :limit
    '''
    query_params = {
        'category': 'headphones',
        'min_rating': 3,
        'limit': 2000
    }
    
    # Execute query
    records = await db.execute(sql_query, query_params)
    
    # Initialize with SQL reference + deduplication
    initialize_records(
        state,
        records=records,
        category='headphones',
        sql_query=sql_query,  # ← Store for reload
        query_params=query_params
    )
    
    # SQL reference now stored in state!
    # Can reload from DB anytime: await reload_from_source(state, db)
    
    return state


# EXAMPLE 2: Filter reviews (category='data' tool - can modify rows!)

async def filter_reviews_node(state: SharedWorkflowState):
    # Get current data (product titles reconstructed automatically)
    data = get_working_data_dict(state)
    records = data['records']
    
    logger.info(f"Filtering {len(records)} reviews...")
    
    # Apply filters
    filtered = []
    for record in records:
        # Filter by rating
        if record['star_rating'] < 4:
            continue
        
        # Filter by verified purchase
        if not record.get('verified_purchase'):
            continue
        
        # Filter by review length
        if len(record.get('review_body', '')) < 100:
            continue
        
        filtered.append(record)
    
    # Apply row modification (DESTRUCTIVE - replaces records)
    apply_row_modification(
        state,
        tool_name='Filter Reviews',
        tool_id='filter_reviews',
        filtered_records=filtered,
        operation_type='filter',
        criteria={
            'min_rating': 4,
            'verified_only': True,
            'min_text_length': 100
        },
        execution_time_ms=50
    )
    
    # Records now reduced! (e.g. 2000 → 500)
    # Row operation tracked in state['row_operation_history']
    
    logger.info(f"✓ Filtered to {len(filtered)} reviews")
    
    return state


# EXAMPLE 3: Clean reviews (category='data' tool - can modify rows!)

async def clean_reviews_node(state: SharedWorkflowState):
    data = get_working_data_dict(state)
    records = data['records']
    
    # Remove duplicates and invalid records
    cleaned = []
    seen_ids = list())
    
    for record in records:
        # Skip duplicates
        if record['review_id'] in seen_ids:
            continue
        seen_ids.add(record['review_id'])
        
        # Skip empty reviews
        if not record.get('review_body') or len(record['review_body'].strip()) < 10:
            continue
        
        cleaned.append(record)
    
    # Apply row modification
    apply_row_modification(
        state,
        tool_name='Clean Reviews',
        tool_id='clean_reviews',
        filtered_records=cleaned,
        operation_type='clean',
        criteria={'remove_duplicates': True, 'min_length': 10}
    )
    
    # Records further reduced! (e.g. 500 → 450)
    
    return state


# EXAMPLE 4: Sentiment analysis (category='analysis' tool - adds columns only!)

async def sentiment_node(state: SharedWorkflowState):
    # Get working data (now only 450 records after filtering!)
    data = get_working_data_dict(state)
    
    # Analyze sentiment (works on filtered data = faster!)
    column_data = {}
    for record in data['records']:
        sentiment = await analyze(record['review_body'])
        column_data[record['review_id']] = {
            'sentiment': sentiment['label'],
            'sentiment_score': sentiment['score']
        }
    
    # Apply enrichment (additive - doesn't modify rows)
    apply_enrichment(
        state,
        tool_name='Sentiment Analysis',
        tool_id='sentiment_analysis',
        column_data=column_data,
        columns_added=['sentiment', 'sentiment_score']
    )
    
    return state


# EXAMPLE 5: Check row operation history

async def summary_node(state: SharedWorkflowState):
    # Get operation summary
    summary = get_row_operation_summary(state)
    
    print(f"Operations: {summary['total_operations']}")
    print(f"Initial rows: {summary['initial_rows']}")
    print(f"Current rows: {summary['current_rows']}")
    print(f"Total removed: {summary['total_removed']}")
    print(f"Reduction: {summary['reduction_pct']:.1f}%")
    
    for op in summary['operations']:
        print(f"  - {op['tool_name']}: {op['rows_before']} → {op['rows_after']}")
    
    # Output:
    # Operations: 2
    # Initial rows: 2000
    # Current rows: 450
    # Total removed: 1550
    # Reduction: 77.5%
    #   - Filter Reviews: 2000 → 500
    #   - Clean Reviews: 500 → 450
    
    return state


# EXAMPLE 6: Check SQL reference

async def info_node(state: SharedWorkflowState):
    # Get data source info
    source = get_data_source_info(state)
    
    if source:
        print(f"SQL Query: {source['sql_query']}")
        print(f"Parameters: {source['query_params']}")
        print(f"Initial rows: {source['row_count_at_load']}")
        print(f"Can reload: {source['can_reload']}")
    
    return state
"""