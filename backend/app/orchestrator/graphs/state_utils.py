# backend/app/orchestrator/graphs/state_utils.py
"""
Shared State Utilities for Tool Input Preparation

This module provides shared utilities for preparing tool input data
consistently across both Workflow Builder and AI Assistant conditions.

Key principle: Both conditions should prepare tool input THE SAME WAY
to ensure consistent behavior and data flow.

Usage:
    # In Workflow Builder node_handler()
    input_data = prepare_tool_input(
        state=state,
        config=node['data']['config'],
        condition='workflow_builder'
    )
    
    # In AI Assistant wrap_tool_call()
    input_data = prepare_tool_input(
        state=state,
        config=tool_call['args'],
        condition='ai_assistant'
    )
"""
import logging
from typing import Dict, Any, Optional, Literal
from .shared_state import (
    SharedWorkflowState,
    DataSource,
    get_working_data_dict,
    apply_row_modification,
    apply_enrichment,
    get_row_operation_summary,
    initialize_records,
    RowOperation,
    ResultsRegistry,
    ToolResult
)
from datetime import datetime, timezone
from app.schemas.reviews import (
    batch_to_study_format,
    batch_to_enhanced_study_format
)

from app.orchestrator.tools.registry import ToolRegistry

logger = logging.getLogger(__name__)



def _log_to_file(data: dict | str, filename: str = None):
    """
    Log to a JSON file
    
    Args:
        data: Dictionary or JSON string to log
        filename: Optional custom filename (without .json extension)
    
    Returns:
        Path: Filepath where data was logged
    """
    from pathlib import Path
    from datetime import datetime

    try:
        # Create logs directory if it doesn't exist
        log_dir = Path("logs/tools_data")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename with timestamp if not provided
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"data_{timestamp}"
            
        if not filename.endswith('.json'):
            filename = f"{filename}.json"
        
        filepath = log_dir / filename
        
        # Write results to file
        with open(filepath, 'w', encoding='utf-8') as f:
            if isinstance(data, str):
                f.write(data)
            else:
                import json
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        return filepath
    
    except Exception as e:
        logger.error(f"Failed to log data to file: {e}")
        return None



def prepare_tool_input(
    state: Dict[str, Any],
    condition: Literal['workflow_builder','ai_assistant'],
    session_id: Optional[str] = None,
    execution_id: Optional[int] = None,
    config: Dict[str, Any] | None  = None
) -> Dict[str, Any]:
    """
    Prepare tool input data consistently across both conditions
    
    This function encapsulates the EXACT logic that Workflow Builder
    uses in node_handler() to prepare input_data. By reusing this,
    we ensure AI Assistant prepares tool input THE SAME WAY.
    
    Args:
        state: Current state (SharedWorkflowState or AgentState)
        config: Tool-specific configuration
            - Workflow Builder: node['data']['config']
            - AI Assistant: tool_call['args'] (from LLM)
        condition: 'workflow_builder' or 'ai_assistant'
        session_id: Optional override for session_id
        execution_id: Optional override for execution_id
    
    Returns:
        Dict with all fields tools expect, prepared consistently
    
    Example:
        >>> state = {...}  # Has record_store, enrichment_registry, etc.
        >>> config = {'extract_themes': True, 'limit': 5}
        >>> input_data = prepare_tool_input(state, config, 'ai_assistant')
        >>> # Result:
        >>> {
        >>>     'records': [...],  # From record_store
        >>>     'total': 5,
        >>>     'category': 'wireless',
        >>>     'config': {'extract_themes': True, 'limit': 5},
        >>>     'record_store': {...},
        >>>     'enrichment_registry': {...},
        >>>     # ... all state fields
        >>> }
    """
    try:
        # Get working data using shared helper
        # This extracts records from record_store (new) or working_data (legacy)
        working_data = get_working_data_dict(state)
        
        _log_to_file(working_data, f"Working_data")

        if not working_data.get('records'):
            working_data.update(state)

        # Use provided IDs or extract from state
        session_id = session_id or state.get('session_id')
        execution_id = execution_id or state.get('execution_id')
        
        # Build input_data with ALL fields tools expect
        # This is the EXACT structure from Workflow Builder!
        input_data = {
            # ==================== WORKING DATA ====================
            'records': working_data['records'],
            'total': working_data['total'],
            'category': working_data.get('category', ''),
            'product_titles': working_data.get('product_titles', {}),
            
            # ==================== TOOL CONFIG ====================
            # Node-specific config (Workflow) or LLM args (AI Assistant)
            'config': config,
            
            # ==================== STATE CONTEXT ====================
            # For BaseTool compatibility
            'state': {
                'session_id': session_id,
                'execution_id': execution_id,
                'condition': condition,
                'language': state.get('language','en')
            },
            
            # ==================== ANALYSIS OUTPUTS ====================
            'sentiment_statistics': state.get('sentiment_statistics', None),
            'theme_analysis': state.get('theme_analysis', None),
            'insights': state.get('insights', None),
            
            # ==================== DATA SOURCE TRACKING ====================
            'data_source': state.get('data_source'),
            
            # ==================== OPERATION HISTORY ====================
            # For visibility into what operations have been applied
            'row_operation_history': state.get('row_operation_history', []),
            
            # ==================== FULL STATE ACCESS ====================
            # Some tools need full state access
            'record_store': state.get('record_store'),
            'enrichment_registry': state.get('enrichment_registry', {}),
            'results_registry': state.get('results_registry', {}),
            'base_record_ids': state.get('base_record_ids', []),
            'base_record_count': state.get('base_record_count', 0),
            'base_columns': state.get('base_columns', []),
            
            # ==================== DIRECT IDS ====================
            # For backward compatibility & WebSocket
            'session_id': session_id,
            'execution_id': execution_id
        }
        
        logger.debug(
            f"Tool input prepared: {input_data.get('total')} records, "
            f"category={input_data.get('category')}, "
            f"condition={condition}, "
            f"operations={len(state.get('row_operation_history', []))}"
        )
        
        return input_data
        
    except Exception as e:
        logger.error(f"Failed to prepare tool input: {e}", exc_info=True)
        
        # Return minimal safe input on error
        return {
            'records': [],
            'total': 0,
            'category': '',
            'config': config,
            'session_id': session_id,
            'execution_id': execution_id,
            'state': {
                'session_id': session_id or '',
                'execution_id': execution_id,
                'condition': condition
            },
            'record_store': None,
            'enrichment_registry': {},
            'results_registry': {},
            'row_operation_history': [],
            'sentiment_statistics': None,
            'theme_analysis': None,
            'insights': None,
            'data_source': None,
            'base_record_ids': [],
            'base_record_count': 0,
            'base_columns': []
        }


def extract_state_updates(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract state updates from tool result
    
    Both Workflow Builder and AI Assistant need to extract state updates
    from tool results. This function provides consistent extraction logic.
    
    Args:
        result: Tool execution result (already parsed from JSON)
    
    Returns:
        Dict of state updates to merge back into state
    
    Example:
        >>> result = {
        >>>     'success': True,
        >>>     'record_store': {...},
        >>>     'enrichment_registry': {...},
        >>>     'sentiment_statistics': {...}
        >>> }
        >>> updates = extract_state_updates(result)
        >>> # Result:
        >>> {
        >>>     'record_store': {...},
        >>>     'enrichment_registry': {...},
        >>>     'sentiment_statistics': {...}
        >>> }
    """
    state_updates = {}
    
    # Define all state fields that tools can update
    state_fields = [
        'record_store',
        'enrichment_registry',
        'results_registry',
        'data_source',
        'row_operation_history',
        'sentiment_statistics',
        'theme_analysis',
        'insights',
        'base_record_ids',
        'base_record_count',
        'base_columns'
    ]
    
    for field in state_fields:
        if field in result:
            state_updates[field] = result[field]
            logger.debug(f"  → Extracted state update: {field}")
    
    # Special handling for row_operation_history (append, don't replace)
    if 'row_operation_history' in result and isinstance(result.get('row_operation_history', []), list):
        # Note: Caller should append to existing history, not replace
        logger.debug(f"  → Row operations to append: {len(result.get('row_operation_history', []))}")
    
    return state_updates


def merge_state_updates(
    state: Dict[str, Any],
    updates: Dict[str, Any],
    append_operations: bool = True
) -> None:
    """
    Merge state updates back into state (in-place)
    
    Args:
        state: State dict to update
        updates: Updates to merge
        append_operations: If True, append row_operation_history instead of replacing
    """
    for key, value in updates.items():
        if key == 'row_operation_history' and append_operations:
            # Append operations instead of replacing
            current = state.get('row_operation_history', [])
            if isinstance(value, list):
                state['row_operation_history'] = current + value
                logger.debug(f"  → Appended {len(value)} row operations")
        else:
            # Replace value
            state[key] = value
            logger.debug(f"  → Updated state field: {key}")


async def process_tool_result(
    state: Dict[str, Any],
    result: Dict[str, Any],
    tool_name: str,
    tool_id: str,
    tool_category: Optional[str] = None,
    condition: Literal['workflow_builder','ai_assistant'] | None = None,
    registry:ToolRegistry = None,
    state_manager = None,
    websocket_manager = None
) -> Dict[str, Any]:
    """
    Process tool result and apply state updates
    
    This encapsulates ALL the result processing logic from Workflow Builder's
    node_handler(), including:
    - Handling state_updates
    - Category-specific processing (data/analysis/load)
    - Result registry updates
    - Data cleanup and formatting
    
    Args:
        state: Current state to update
        result: Tool execution result
        tool_name: Display name of tool
        tool_id: Template ID of tool
        tool_category: Tool category ('data', 'analysis', 'output', etc.)
        registry: Tool registry to lookup tool definitions
        node: Node instance calling
    
    Returns:
        Cleaned result dict ready for WebSocket/API response
    """
    execution_id = state.get('execution_id')
    condition = condition or state.get('condition')

    try:
        # Handle direct state_updates from tool
        if result.get('state_updates'):
            for key, value in result['state_updates'].items():
                state[key] = value
                # Update Redis
                state_manager.update_state_field(execution_id, key, value)
        
        # Process based on tool category
        if result.get('success'):

            # Get tool definition if registry provided
            tool_def = None
            if registry and condition:
                if '-' in tool_id: #condition == 'workflow_builder':
                    tool_def = registry.get_tool_definition(workflow_id=tool_id)
                else:
                    tool_def = registry.get_tool_definition(ai_id=tool_id)

            if tool_def and tool_def.category == 'data':
                # DATA TOOL (filter/clean/sort) - Track row modification
                if result.get('filtered_records') is not None:
                    # Calculate rows before/after for RowOperation
                    rows_before = len(state.get('record_store',{}).get('records', []))
                    rows_after = len(result.get('filtered_records'))
                    rows_removed = rows_before - rows_after
                    
                    # Construct proper RowOperation (validates schema)
                    row_op = RowOperation(
                        tool_id=tool_id,
                        tool_name=tool_name,
                        operation_type=result.get('operation_type', 'filter'),
                        tool_category='data',
                        rows_before=rows_before,
                        rows_after=rows_after,
                        rows_removed=rows_removed,
                        criteria=result.get('criteria', {}),
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        execution_time_ms=result.get('execution_time_ms', 0)
                    )
                    
                    # Apply using validated RowOperation
                    apply_row_modification(
                        state,
                        tool_name=row_op.tool_name,
                        tool_id=row_op.tool_id,
                        filtered_records=result.get('filtered_records',{}),
                        operation_type=row_op.operation_type,
                        criteria=row_op.criteria,
                        execution_time_ms=row_op.execution_time_ms
                    )
                    
                    logger.info(
                        f"Row modification tracked: "
                        f"{rows_before} → {rows_after} records "
                        f"({rows_removed} removed) after {row_op.operation_type}"
                    )
                    
                    # Update Redis (only changed fields)
                    state_manager.update_state_fields(execution_id, {
                        'record_store': state.get('record_store'),
                        'row_operation_history': state.get('row_operation_history')
                    })
            
            elif tool_def and tool_def.category == 'analysis':
                # ANALYSIS TOOL (sentiment/insights) - Add enrichment
                #state['sentiment_statistics'] = result.get('sentiment_statistics', None)
                #state['theme_analysis'] = result.get('theme_analysis', None)

                if result.get('column_data'):
                    apply_enrichment(
                        state,
                        tool_name=tool_name,
                        tool_id=tool_id,
                        column_data=result.get('column_data'),
                        columns_added=result.get('columns_added', [])
                    )
                    
                    logger.info(
                        f"Enrichment added: "
                        f"{len(result.get('columns_added', []))} columns from {tool_name}"
                    )
                    
                    # Update Redis (only enrichment registry)
                    state_manager.update_state_field(
                        execution_id,
                        'enrichment_registry',
                        state.get('enrichment_registry')
                    )
            
            elif tool_def and tool_id == 'load-reviews':
                # LOAD TOOL - Initialize records in state
                data_source = result.get('data_source', {})

                initialize_records(
                    state,
                    records=result.get('records'),
                    category=result.get('category', ''),
                    sql_query=data_source.get('sql_query'), 
                    query_params=data_source.get('query_params')
                )

                # Prepare detailed_output with root-level metadata
                detailed_output = {
                    'total': result.get('total'),
                    'total_available': result.get('total_available'),
                    'category': result.get('category'),
                    'filters_applied': result.get('filters_applied'),
                    'limit': result.get('limit'),
                    'offset': result.get('offset')
                }
                
                logger.info(
                    f"Data loaded: {len(result.get('records'))} records initialized, "
                    f"data_source stored (category: {result.get('data_source', {}).get('category')}, "
                    f"can_reload: {result.get('data_source', {}).get('can_reload')})"
                )
                
                # Update Redis with record_store and data_source
                state_manager.update_state_fields(execution_id, {
                    'record_store': state['record_store'],
                    'data_source': state['data_source']
                })
                
                # Store result in results_registry
                results_registry = ResultsRegistry(**state.get('results_registry'))
                tool_result = ToolResult(
                    tool_id=tool_id,
                    tool_name=tool_name,
                    summary=result.get('summary', {}),
                    detailed_output=result.get('data', {}),
                    execution_time_ms=result.get('execution_time_ms', 0)
                )
                results_registry.add(tool_result)
                state['results_registry'] = results_registry.model_dump()
                
                # Update results_registry in Redis
                state_manager.update_state_field(
                    execution_id,
                    'results_registry',
                    state.get('results_registry')
                )

                logger.info(f"Node {tool_id} completed successfully")
        else:
            # Tool execution failed
            error_msg = result.get('error', 'Unknown error')
            error_type = result.get('error_type', 'execution_error')
            
            logger.error(f"Node {tool_id} failed: {error_msg} (type: {error_type})")
            
            # Append error efficiently
            error_entry = {
                'step': state.get('step_number'),
                'node': tool_id,
                'node_label': tool_name,
                'error': error_msg,
                'error_type': error_type,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            state_manager.append_to_list_field(
                execution_id,
                'errors',
                error_entry
            )

            errors = state.get('errors', [])
            errors.append(error_entry)
            state['errors'] = errors
        
            # Send error event
            if websocket_manager:
                await websocket_manager.send_node_progress(
                    session_id = state.get('session_id'),
                    execution_id = execution_id,
                    condition = condition,
                    progress_type = 'error',
                    status = 'failed',
                    data = {
                        'success': result.pop('success', False),
                        'node_id': tool_id,
                        'node_label': tool_name,
                        'step_number': state.get('step_number'),
                        'error': error_msg, 
                        'error_type': error_type
                    }
                )

            # Check if node is critical
            if _is_critical_node(tool_id):
                logger.error(f"Critical node {tool_id} failed - stopping execution")
                state['status'] = 'error'
        
        return result
    
    except Exception as e:
        error_msg = str(e) 
        error_type= type(e).__name__
        logger.exception(f"Node {tool_id} execution exception: {e}")
        
        # Append error
        error_entry = {
            'step': state.get('step_number'),
            'node': tool_id,
            'node_label': tool_name,
            'error': error_msg,
            'error_type': error_type,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        state_manager.append_to_list_field(
            execution_id,
            'errors',
            error_entry
        )
        errors = state.get('errors', [])
        errors.append(error_entry)
        state['errors'] = errors
        
        # Send error event via WebSocket
        if websocket_manager:
            await websocket_manager.send_node_progress(
                session_id = state.get('session_id'),
                execution_id = execution_id,
                condition = condition,
                progress_type = 'error',
                status = 'exception',
                data = {
                    'node_id': tool_id,
                    'node_label': tool_name,
                    'step_number': state.get('step_number'),
                    'error': error_msg, 
                    'error_type': error_type
                }
            )
        
        # Check if critical
        if _is_critical_node(tool_id):
            logger.error(f"Critical node {tool_id} failed - stopping execution")
            state['status'] = 'error'

        return {'success': False, 'error': error_msg}


def _is_critical_node(template_id: str) -> bool:
    """
    Determine if a node failure should stop execution
    
    Critical nodes are those whose failure makes it impossible
    to continue the workflow meaningfully.
    
    Critical nodes:
    1. load-reviews: Must succeed to have data for the entire workflow
    2. show-results: Must succeed to display final output
    
    Non-critical nodes:
    3. filter-reviews: Can continue with empty filter (all data passes through)
    4. sort-reviews: Can continue with unsorted data
    5. clean-data: Can continue with uncleaned data
    6. Analysis tools: Can continue to output even if analysis fails
    
    Args:
        node_id: Node ID (e.g., 'load-reviews-14')
        template_id: Tool template ID (e.g., 'load-reviews')
        
    Returns:
        True if node is critical (must succeed)
    """
    # LoadReviews is always critical - no data means workflow can't proceed
    if template_id == 'load-reviews':
        return True
    
    # ShowResults is critical - need to display output
    if template_id == 'show-results':
        return True
    
    # All other nodes are non-critical
    # (workflow can continue with degraded functionality)
    return False


def cleanup_result_for_response(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean up tool result for WebSocket/API response
    
    Removes internal fields and formats records for frontend.
    This is the EXACT cleanup logic from Workflow Builder!
    
    Args:
        result: Raw tool result
    
    Returns:
        Cleaned result ready for frontend
    """
    # Remove internal fields
    cleanup_keys = [
        'filters_applied',
        'offset',
        'data_source',
        'criteria',
        'state_updates'
    ]
    
    for key in cleanup_keys:
        result.pop(key, None)
    
    # Format records for frontend
    record_keys = ['records', 'filtered_records', 'analyzed_records']
    
    for key in record_keys:
        if records := result.get(key):
            # Choose formatter based on whether records have sentiment
            has_sentiment = records and 'sentiment' in records[0]
            formatter = batch_to_enhanced_study_format if has_sentiment else batch_to_study_format
            
            # Convert to study format
            result[key] = [r.model_dump() for r in formatter(records)]
            
            logger.debug(f"Formatted {len(records)} {key} for response")
    
    return result
            
# ============================================================
# VALIDATION UTILITIES
# ============================================================

def validate_tool_input(input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate that tool input has all required fields
    
    Args:
        input_data: Prepared tool input
    
    Returns:
        (is_valid, error_message)
    """
    required_fields = [
        'records',
        'total',
        'category',
        'session_id',
        'execution_id',
        'state'
    ]
    
    for field in required_fields:
        if field not in input_data:
            return False, f"Missing required field: {field}"
    
    # Validate types
    if not isinstance(input_data['records'], list):
        return False, "'records' must be a list"
    
    if not isinstance(input_data['total'], int):
        return False, "'total' must be an integer"
    
    if not isinstance(input_data['state'], dict):
        return False, "'state' must be a dict"
    
    return True, None


def get_tool_input_summary(input_data: Dict[str, Any]) -> str:
    """
    Get human-readable summary of tool input
    
    Args:
        input_data: Prepared tool input
    
    Returns:
        Summary string
    """
    records = len(input_data.get('records', []))
    category = input_data.get('category', 'unknown')
    operations = len(input_data.get('row_operation_history', []))
    enrichments = len(input_data.get('enrichment_registry', {}).get('enrichments', {}))
    
    return (
        f"Input: {records} records, "
        f"category={category}, "
        f"{operations} operations, "
        f"{enrichments} enrichments"
    )


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    'prepare_tool_input',
    'extract_state_updates',
    'merge_state_updates',
    'process_tool_result',
    'cleanup_result_for_response',
    'validate_tool_input',
    'get_tool_input_summary'
]