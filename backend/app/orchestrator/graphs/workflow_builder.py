# backend/app/orchestrator/graphs/workflow_builder.py
from langgraph.graph import StateGraph, END
from typing import Dict, Any, Callable, List
import logging
import time
from datetime import datetime, timezone

from .shared_state import (
    SharedWorkflowState,
    DataSource,
    RowOperation,
    get_working_data_dict,
    apply_row_modification,
    apply_enrichment,
    get_row_operation_summary,
    initialize_records,
    ResultsRegistry,
    ToolResult
)
from ..tools.registry import tool_registry
from app.database import get_db_context
from app.orchestrator.llm import llm_client

logger = logging.getLogger(__name__)


class WorkflowBuilderGraph:
    """
    Build and execute user-defined workflows from Workflow Builder
    
    Users explicitly define the flow: nodes and edges
    System follows the exact path defined by the user
    High visibility and control for the user
    """
    
    def __init__(self, state_manager, websocket_manager=None):
        self.state_manager = state_manager
        self.websocket_manager = websocket_manager
        self.registry = tool_registry

        if self.websocket_manager:        
            # Inject WebSocket into tools that need it
            self._inject_websocket_into_tools()
        
        # Add LLM client injection here (always inject, not conditional)
        self._inject_llm_client_into_tools()

    
    def _inject_websocket_into_tools(self):
        """
        Inject WebSocket manager into tools that support progress updates
        
        CRITICAL: Workflow Builder uses the same tools as AI Assistant.
        Tools like sentiment analysis and insight generation need WebSocket
        access for real-time progress indicators.
        
        Implementation notes:
        - Tools in registry are singletons (one instance per tool type)
        - Injecting once makes WebSocket available to both graphs
        - Uses registry to access shared tool instances
        """
        logger.info("Injecting WebSocket into Workflow Builder tools")
        
        # Tool AI IDs that need WebSocket (match your TOOL_DEFINITIONS in registry.py)
        websocket_tool_ids = [
            'load_reviews',
            'filter_reviews',
            'sort_reviews',
            'clean_data',

            'review_sentiment_analysis',
            'generate_insights',
            'show_results',           
        ]
        
        injected_count = 0
        for tool_id in websocket_tool_ids:
            try:
                # Get tool definition from registry
                tool_def = self.registry.get_tool_definition(ai_id=tool_id)
                
                if tool_def:
                    # Get singleton instance
                    tool_instance = tool_def.instance
                    
                    # Check if tool supports WebSocket injection
                    if hasattr(tool_instance, 'set_websocket_manager'):
                        # Inject WebSocket manager
                        tool_instance.set_websocket_manager(self.websocket_manager)
                        injected_count += 1
                        logger.info(f"WebSocket injected into {tool_def.display_name} (Workflow Builder)")
                    else:
                        logger.debug(f"Tool {tool_def.display_name} doesn't support WebSocket")
                else:
                    logger.warning(f"Tool not found in registry: {tool_id}")
                    
            except Exception as e:
                logger.error(f"Failed to inject WebSocket into tool {tool_id}: {e}", exc_info=True)
        
        logger.info(f"Workflow Builder: WebSocket manager injected into {injected_count} tool(s)")
    
    def _inject_llm_client_into_tools(self):
        """
        Inject LLM client into tools that need LLM support
        
        CRITICAL: Workflow Builder uses the same tools as AI Assistant.
        Tools like sentiment analysis and insight generation need LLM
        access for to generate output.
        
        Implementation notes:
        - Tools in registry are singletons (one instance per tool type)
        - Injecting once makes LLM client available to both graphs
        - Uses registry to access shared tool instances
        """
        logger.info("Injecting LLM Client into Workflow Builder tools")
        
        # Tool AI IDs that need WebSocket (match your TOOL_DEFINITIONS in registry.py)
        llm_tool_ids = [
            'review_sentiment_analysis',
            'generate_insights',
            'show_results',           
        ]
        
        injected_count = 0
        for tool_id in llm_tool_ids:
            try:
                # Get tool definition from registry
                tool_def = self.registry.get_tool_definition(ai_id=tool_id)
                
                if tool_def:
                    # Get singleton instance
                    tool_instance = tool_def.instance
                    
                    # Check if tool supports WebSocket injection
                    if hasattr(tool_instance, 'set_llm_client'):
                        # Inject WebSocket manager
                        tool_instance.set_llm_client(llm_client)
                        injected_count += 1
                        logger.info(f"LLM client injected into {tool_def.display_name} (Workflow Builder)")
                    else:
                        logger.debug(f"Tool {tool_def.display_name} doesn't support LLM client")
                else:
                    logger.warning(f"Tool not found in registry: {tool_id}")
                    
            except Exception as e:
                logger.error(f"Failed to inject LLM client into tool {tool_id}: {e}", exc_info=True)
        
        logger.info(f"Workflow Builder: LLM client injected into {injected_count} tool(s)")
    
    
    def _create_node_handler(
        self, 
        node: Dict[str, Any], 
        tool: Any
    ) -> Callable:
        """
        Create handler function for a workflow node
        
        Args:
            node: Node definition
            tool: Tool instance to execute
            
        Returns:
            Async handler function
        """
        node_id = node['id']
        node_label = node['data'].get('label', node_id)
        template_id = node['data']['template_id']
        
        async def node_handler(state: SharedWorkflowState) -> SharedWorkflowState:
            """Execute single workflow node"""
            execution_id = state['execution_id']
            step_start_time = time.time()

            # Atomic increment
            new_step = self.state_manager.increment_field(execution_id, 'step_number', 1)
            state['step_number'] = new_step
            
            # Single field update
            self.state_manager.update_state_field(execution_id, 'current_node', node_id)
            
            logger.info(f"Executing node: {node_id} ({node_label}) - Step {new_step}")
            
            # Checkpoint: node start (buffered)
            if self.state_manager.should_checkpoint(state['condition'], 'node_start'):
                with get_db_context() as db:
                    await self.state_manager.checkpoint_to_db(
                        db=db,
                        execution_id=execution_id,
                        step_number=new_step,
                        checkpoint_type='node_start',
                        state=dict(state),
                        node_id=node_id,
                        buffered=True 
                    )
            
            # Send WebSocket update (batched)
            if self.websocket_manager:
                await self.websocket_manager.send_node_progress(
                    session_id=state['session_id'],
                    execution_id=execution_id,
                    node_id=node_id,
                    step_number=new_step,
                    status='running',
                    node_label=node_label
                )
            
            # Prepare input data with full state context
            try:

                logger.info({'node':node, 'tool': tool})
                # Get working data using helper
                working_data = get_working_data_dict(state)
                
                input_data = {
                    'records': working_data['records'],
                    'total': working_data['total'],
                    'category': working_data.get('category', ''),
                    'product_titles': working_data.get('product_titles', {}),

                    # Node specifc config, as per client
                    'config': node.get('data', {}).get('config'),

                    # State context for BaseTool
                    'state': {
                        'session_id': state['session_id'],
                        'execution_id': execution_id,
                        'condition': state['condition']
                    },
                    
                    # Data source tracking
                    'data_source': state.get('data_source', []),
                    
                    # Operation history visibility
                    'row_operation_history': state.get('row_operation_history', []),
                    
                    # Direct IDs for backward compatibility & WebSocket
                    'session_id': state['session_id'],
                    'execution_id': execution_id
                }
                
                logger.debug(
                    f"Tool input: {input_data['total']} records, "
                    f"category={input_data['category']}, "
                    f"session_id={state['session_id']}, "
                    f"operations={len(input_data['row_operation_history'])}"
                )
                
            except Exception as e:
                logger.error(f"Failed to prepare input data: {e}")
                input_data = {
                    'records': [], 
                    'total': 0, 
                    'category': '',
                    'session_id': state.get('session_id'),
                    'execution_id': execution_id,
                    'state': {'session_id': state.get('session_id', ''), 'execution_id': execution_id}
                }
            
            # Execute tool
            try:
                # Execute tool with prepared input
                result = await tool.run(input_data)

                # Handle result based on tool category
                if result.get('success'):
                    # Get tool definition to check category                    
                    tool_def = self.registry.get_tool_definition( workflow_id = template_id )

                    if tool_def and tool_def.category == 'data':
                        # DATA TOOL (filter/clean/sort) - Track row modification
                        if result.get('filtered_records') is not None:
                            # Calculate rows before/after for RowOperation
                            rows_before = len(state['record_store']['records'])
                            rows_after = len(result['filtered_records'])
                            rows_removed = rows_before - rows_after
                            
                            # Construct proper RowOperation (validates schema)
                            row_op = RowOperation(
                                tool_id=template_id,
                                tool_name=node_label,
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
                                filtered_records=result['filtered_records'],
                                operation_type=row_op.operation_type,
                                criteria=row_op.criteria,
                                execution_time_ms=row_op.execution_time_ms
                            )
                            
                            logger.info(
                                f"✓ Row modification tracked: "
                                f"{rows_before} → {rows_after} records "
                                f"({rows_removed} removed) after {row_op.operation_type}"
                            )
                            
                            # Update Redis (only changed fields)
                            self.state_manager.update_state_fields(execution_id, {
                                'record_store': state['record_store'],
                                'row_operation_history': state['row_operation_history']
                            })
                    
                    elif tool_def and tool_def.category == 'analysis':
                        # ANALYSIS TOOL (sentiment/insights) - Add enrichment
                        if result.get('column_data'):
                            apply_enrichment(
                                state,
                                tool_name=node_label,
                                tool_id=template_id,
                                column_data=result['column_data'],
                                columns_added=result.get('columns_added', [])
                            )
                            
                            logger.info(
                                f"Enrichment added: "
                                f"{len(result.get('columns_added', []))} columns from {node_label}"
                            )
                            
                            # Update Redis (only enrichment registry)
                            self.state_manager.update_state_field(
                                execution_id,
                                'enrichment_registry',
                                state['enrichment_registry']
                            )
                    
                    elif tool_def and template_id == 'load-reviews':
                        # LOAD TOOL - Initialize records in state
                        data_source = result.get('data_source', {})

                        initialize_records(
                            state,
                            records=result['records'],
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
                            f"Data loaded: {len(result['records'])} records initialized, "
                            f"data_source stored (category: {result.get('data_source', {}).get('category')}, "
                            f"can_reload: {result.get('data_source', {}).get('can_reload')})"
                        )
                        
                        # Update Redis with record_store and data_source
                        self.state_manager.update_state_fields(execution_id, {
                            'record_store': state['record_store'],
                            'data_source': state['data_source']
                        })
                    
                    # Store result in results_registry
                    results_registry = ResultsRegistry(**state['results_registry'])
                    tool_result = ToolResult(
                        tool_id=template_id,
                        tool_name=node_label,
                        summary=result.get('summary', {}),
                        detailed_output=result.get('data', {}),
                        execution_time_ms=result.get('execution_time_ms', 0)
                    )
                    results_registry.add(tool_result)
                    state['results_registry'] = results_registry.model_dump()
                    
                    # Update results_registry in Redis
                    self.state_manager.update_state_field(
                        execution_id,
                        'results_registry',
                        state['results_registry']
                    )
                    
                    # Send success event
                    if self.websocket_manager:
                        await self.websocket_manager.send_node_progress(
                            session_id=state['session_id'],
                            execution_id=state['execution_id'],
                            node_id=node_id,
                            step_number=state['step_number'],
                            status='completed',
                            result=result
                        )
                        
                    logger.info(f"Node {node_id} completed successfully")
                else:
                    # Tool execution failed
                    error_msg = result.get('error', 'Unknown error')
                    error_type = result.get('error_type', 'execution_error')
                    
                    logger.error(f"Node {node_id} failed: {error_msg} (type: {error_type})")
                    
                    # Append error efficiently
                    error_entry = {
                        'step': new_step,
                        'node': node_id,
                        'node_label': node_label,
                        'error': error_msg,
                        'error_type': error_type,
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }
                    
                    self.state_manager.append_to_list_field(
                        execution_id,
                        'errors',
                        error_entry
                    )
                    state['errors'].append(error_entry)
                
                    # Send error event
                    if self.websocket_manager:
                        await self.websocket_manager.send_node_progress(
                            session_id=state['session_id'],
                            execution_id=state['execution_id'],
                            node_id=node_id,
                            step_number=state['step_number'],
                            status='failed',
                            result={'error': error_msg, 'error_type': error_type}
                        )
                    
                    # Check if node is critical
                    if self._is_critical_node(node_id, template_id):
                        logger.error(f"Critical node {node_id} failed - stopping execution")
                        state['status'] = 'error'
                
            except Exception as e:
                error_msg = str(e) 
                logger.exception(f"Node {node_id} execution exception: {e}")
                
                # Append error
                error_entry = {
                    'step': new_step,
                    'node': node_id,
                    'node_label': node_label,
                    'error': error_msg,
                    'error_type': 'exception',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                
                self.state_manager.append_to_list_field(
                    execution_id,
                    'errors',
                    error_entry
                )
                state['errors'].append(error_entry)
                
                # Send error event via WebSocket
                if self.websocket_manager:
                    await self.websocket_manager.send_node_progress(
                        session_id=state['session_id'],
                        execution_id=state['execution_id'],
                        node_id=node_id,
                        step_number=state['step_number'],
                        status='failed',
                        result={'error': error_msg, 'error_type': 'exception'}
                    )
                
                # Check if critical
                if self._is_critical_node(node_id, template_id):
                    logger.error(f"Critical node {node_id} failed - stopping execution")
                    state['status'] = 'error'
            
            # Update timing
            step_time = int((time.time() - step_start_time) * 1000)

            # Batch field updates
            self.state_manager.update_state_fields(execution_id, {
                'last_step_at': datetime.now(timezone.utc).isoformat(),
                'total_time_ms': state.get('total_time_ms', 0) + step_time
            })

            state['total_time_ms'] = state.get('total_time_ms', 0) + step_time
            state['last_step_at'] = datetime.now(timezone.utc).isoformat()
            
            # Checkpoint: node end
            if self.state_manager.should_checkpoint(state['condition'], 'node_end'):
                with get_db_context() as db:
                    await self.state_manager.checkpoint_to_db(
                        db=db,
                        execution_id=execution_id,
                        step_number=new_step,
                        checkpoint_type='node_end',
                        state=dict(state),
                        node_id=node_id,
                        time_since_last_ms=step_time,
                        buffered=True 
                    )
        
            return state
        
        return node_handler
    
# Part 2: Validation and Helper Methods

    def _validate_workflow_structure(
        self,
        nodes: List[Dict],
        edges: List[Dict]
    ) -> tuple[bool, List[str]]:
        """
        Validate workflow structure before execution
        
        Checks:
        1. First node must be LoadReviews
        2. Last node must be ShowResults
        3. No cycles in workflow
        4. All nodes connected
        5. Position-constrained tools in correct positions
        
        Args:
            nodes: List of workflow nodes
            edges: List of workflow edges
            
        Returns:
            (is_valid, error_messages)
        """
        errors = []
        
        if not nodes:
            errors.append("Workflow has no nodes")
            return False, errors
        
        if not edges:
            errors.append("Workflow has no edges")
            return False, errors
        
        # Get execution order
        execution_order = self._determine_execution_order(nodes, edges)
        
        if not execution_order:
            errors.append("Workflow contains cycles or disconnected nodes")
            return False, errors
        
        if len(execution_order) != len(nodes):
            errors.append(f"Not all nodes are connected (order: {len(execution_order)}, nodes: {len(nodes)})")
            return False, errors
        
        # Get first and last nodes
        first_node = next((n for n in nodes if n['id'] == execution_order[0]), None)
        last_node = next((n for n in nodes if n['id'] == execution_order[-1]), None)
        
        if not first_node or not last_node:
            errors.append("Could not determine first or last node")
            return False, errors
        
        first_tool_id = first_node['data'].get('template_id')
        last_tool_id = last_node['data'].get('template_id')

        # Validate first tool
        first_tool_def = self.registry._by_workflow_id.get(first_tool_id)
        if not first_tool_def or not first_tool_def.is_required_first:
            errors.append(
                f"First tool must be 'Load Reviews', found: '{first_tool_def.display_name if first_tool_def else first_tool_id}'"
            )
        
        # Validate last tool
        last_tool_def = self.registry._by_workflow_id.get(last_tool_id)
        if not last_tool_def or not last_tool_def.is_required_last:
            errors.append(
                f"Last tool must be 'Show Results', found: '{last_tool_def.display_name if last_tool_def else last_tool_id}'"
            )
        
        # Check for misplaced position-constrained tools
        for i, node_id in enumerate(execution_order):
            node = next((n for n in nodes if n['id'] == node_id), None)
            if not node:
                continue
            tool_id = node['data'].get('template_id')
            tool_def = self.registry._by_workflow_id.get(tool_id)
            
            if tool_def:
                # Check if FIRST tool is not first
                if tool_def.is_required_first and i != 0:
                    errors.append(
                        f"'{tool_def.display_name}' must be the first tool (found at position {i+1})"
                    )
                
                # Check if LAST tool is not last
                if tool_def.is_required_last and i != len(execution_order) - 1:
                    errors.append(
                        f"'{tool_def.display_name}' must be the last tool (found at position {i+1})"
                    )
        
        return len(errors) == 0, errors
    
    def _determine_execution_order(
        self,
        nodes: List[Dict],
        edges: List[Dict]
    ) -> List[str]:
        """
        Determine execution order using topological sort
        
        Returns:
            List of node IDs in execution order
        """
        # Build adjacency list
        graph = {node['id']: [] for node in nodes}
        in_degree = {node['id']: 0 for node in nodes}
        
        for edge in edges:
            source = edge['source']
            target = edge['target']
            if source in graph and target in graph:
                graph[source].append(target)
                in_degree[target] += 1
        
        # Find start nodes (in_degree == 0)
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        
        execution_order = []
        
        while queue:
            node_id = queue.pop(0)
            execution_order.append(node_id)
            
            for neighbor in graph[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check if all nodes were processed
        if len(execution_order) != len(nodes):
            logger.error("Cycle detected in workflow or disconnected nodes")
            return []
        
        return execution_order

    def _is_critical_node(self, node_id: str, template_id: str) -> bool:
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

    def _create_node_function(
        self, 
        tool: Any, 
        node_id: str, 
        node_data: Dict[str, Any]
    ) -> Callable:
        """
        Create a function to execute a workflow node
        
        Args:
            tool: Tool instance to execute
            node_id: Unique node identifier
            node_data: Node configuration data
            
        Returns:
            Async function that executes the node
        """
        async def execute_node(state: SharedWorkflowState) -> SharedWorkflowState:
            """Execute a single workflow node"""
            step_start_time = time.time()
            last_step_time = datetime.fromisoformat(state.get('last_step_at', datetime.utcnow().isoformat()))
            time_since_last = int((datetime.utcnow() - last_step_time).total_seconds() * 1000)
            
            state['step_number'] = state.get('step_number', 0) + 1
            state['current_node'] = node_id
            
            logger.info(f"Executing node: {node_id} (step {state['step_number']})")
            
            # Checkpoint: node start
            if self.state_manager.should_checkpoint(state['condition'], 'node_start'):
                with get_db_context() as db:
                    self.state_manager.checkpoint_to_db(
                        db=db,
                        execution_id=state['execution_id'],
                        step_number=state['step_number'],
                        checkpoint_type='node_start',
                        state=dict(state),
                        node_id=node_id,
                        time_since_last_ms=time_since_last,
                        metadata={'node_label': node_data.get('label', node_id)}
                    )
            
            # Send WebSocket progress update
            if self.websocket_manager:
                await self.websocket_manager.send_progress(state['session_id'], {
                    'type': 'node_start',
                    'execution_id': state['execution_id'],
                    'node_id': node_id,
                    'node_label': node_data.get('label', node_id),
                    'step': state['step_number']
                })
            
            try:
                # Execute tool
                result = await tool.run(state['working_data'])
                
                # Update state
                if result['success']:
                    state['results'][node_id] = result
                    state['working_data'] = result.get('data', state['working_data'])
                    logger.info(f"Node {node_id} completed successfully")
                else:
                    error_msg = result.get('error', 'Unknown error')
                    state['errors'].append({
                        'node_id': node_id,
                        'error': error_msg,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    logger.error(f"Node {node_id} failed: {error_msg}")
                
                # Update timing
                state['last_step_at'] = datetime.utcnow().isoformat()
                step_time = int((time.time() - step_start_time) * 1000)
                state['total_time_ms'] = state.get('total_time_ms', 0) + step_time
                
                # Update Redis state
                self.state_manager.save_state_to_memory(state['execution_id'], dict(state))
                
                # Checkpoint: node end
                if self.state_manager.should_checkpoint(state['condition'], 'node_end'):
                    with get_db_context() as db:
                        self.state_manager.checkpoint_to_db(
                            db=db,
                            execution_id=state['execution_id'],
                            step_number=state['step_number'],
                            checkpoint_type='node_end',
                            state=dict(state),
                            node_id=node_id,
                            time_since_last_ms=step_time,
                            metadata={
                                'success': result['success'],
                                'execution_time_ms': result.get('execution_time_ms', 0)
                            }
                        )
                
                # Send WebSocket progress update
                if self.websocket_manager:
                    await self.websocket_manager.send_progress(state['session_id'], {
                        'type': 'node_complete',
                        'execution_id': state['execution_id'],
                        'node_id': node_id,
                        'success': result['success'],
                        'step': state['step_number']
                    })
                
                return state
                
            except Exception as e:
                logger.exception(f"Exception in node {node_id}: {e}")
                state['errors'].append({
                    'node_id': node_id,
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                })
                state['status'] = 'error'
                return state
        
        return execute_node
    
    def _build_edge_map(self, edges: list) -> Dict[str, list]:
        """
        Build a map of source -> [targets] from edge list
        
        Args:
            edges: List of edge definitions
            
        Returns:
            Dictionary mapping source nodes to target nodes
        """
        edge_map = {}
        
        for edge in edges:
            source = edge.get('source', 'START')
            target = edge.get('target', 'END')
            
            if source not in edge_map:
                edge_map[source] = []
            
            edge_map[source].append(target)
        
        return edge_map
    
    def _add_conditional_edges(
        self, 
        graph: StateGraph, 
        node: Dict[str, Any], 
        edges: list
    ):
        """
        Add conditional edges for Logic If nodes
        
        Args:
            graph: LangGraph instance
            node: Logic If node definition
            edges: All edges in workflow
        """
        node_id = node['id']
        
        # Find edges from Logic If node
        true_edge = None
        false_edge = None
        
        for edge in edges:
            if edge['source'] == node_id:
                if edge.get('sourceHandle') == 'true':
                    true_edge = edge['target']
                elif edge.get('sourceHandle') == 'false':
                    false_edge = edge['target']
        
        if not true_edge or not false_edge:
            logger.warning(f"Logic If node {node_id} missing true/false edges")
            return
        
        def condition_router(state: SharedWorkflowState) -> str:
            """Route based on condition evaluation"""
            # Get condition result from node execution
            results_registry = ResultsRegistry(**state['results_registry'])
            node_result = results_registry.get_result(node_id)
            
            if node_result and node_result.summary.get('condition_met'):
                return true_edge
            else:
                return false_edge
        
        graph.add_conditional_edges(
            node_id,
            condition_router,
            {
                true_edge: true_edge,
                false_edge: false_edge
            }
        )
        
        logger.info(f"Added conditional edges for {node_id}: true->{true_edge}, false->{false_edge}")

# Part 3: Build Graph Method
    
    def _evaluate_condition(
        self, 
        state: SharedWorkflowState, 
        node: Dict[str, Any]
    ) -> bool:
        """
        Evaluate a conditional expression
        
        Args:
            state: Current workflow state
            node: Logic If node definition
            
        Returns:
            True or False
        """
        # Mock evaluation - in real implementation: parse and evaluate user conditions
        # Example: "records.length > 5"
        working_data = state.get('working_data', {})
        records = working_data.get('records', [])
        
        # Simple heuristic: if we have records, return true
        return len(records) > 0
    
    def build_graph(self, workflow_definition: Dict[str, Any]) -> StateGraph:
        """
        Build LangGraph from user-defined workflow
        
        Args:
            workflow_definition: {nodes: [...], edges: [...]}
            
        Returns:
            Compiled LangGraph
        """
        nodes = workflow_definition['nodes']
        edges = workflow_definition['edges']
        
        logger.info(f"Building workflow with {len(nodes)} nodes and {len(edges)} edges")

        # Validate workflow structure
        is_valid, errors = self._validate_workflow_structure(nodes, edges)
        if not is_valid:
            error_message = "Workflow validation failed:\n" + "\n".join(f"  • {e}" for e in errors)
            logger.error(error_message)
            raise ValueError(error_message)
        
        logger.info("Workflow validation passed")
        
        # Initialize graph
        graph = StateGraph(SharedWorkflowState)
        
        # Add nodes to graph
        for node in nodes:
            node_id = node['id']
            template_id = node['data']['template_id']
            
            tool = self.registry.get_workflow_tool(template_id)
            
            if not tool:
                logger.warning(f"Unknown tool: {template_id}, skipping node {node_id}")
                continue
            
            handler = self._create_node_handler(node, tool)
            graph.add_node(node_id, handler)
            
            logger.debug(f"Added node: {node_id} ({template_id})")
        
        # Find nodes with no incoming edges (potential entry points)
        all_node_ids = {node['id'] for node in nodes}
        target_node_ids = {edge['target'] for edge in edges}
        entry_candidates = all_node_ids - target_node_ids
        
        logger.info(f"Entry point candidates: {entry_candidates}")
        
        # Set entry point
        if entry_candidates:
            # Use the first node without incoming edges as entry point
            entry_point = list(entry_candidates)[0]
            graph.set_entry_point(entry_point)
            logger.info(f"Set entry point to: {entry_point}")
        elif nodes:
            # Fallback: use the first node in the list
            entry_point = nodes[0]['id']
            graph.set_entry_point(entry_point)
            logger.warning(f"No clear entry point found, using first node: {entry_point}")
        else:
            raise ValueError("Workflow has no nodes")
        
        # Build edge map
        edge_map = self._build_edge_map(edges)
        
        # Add edges to graph
        for node_id, targets in edge_map.items():
            if len(targets) == 1:
                target = targets[0]
                if target in all_node_ids:
                    # Normal edge to another node
                    graph.add_edge(node_id, target)
                    logger.debug(f"Added edge: {node_id} -> {target}")
                else:
                    # No target or END
                    graph.add_edge(node_id, END)
                    logger.debug(f"Added edge: {node_id} -> END")
            elif len(targets) == 0:
                # No outgoing edges - connect to END
                graph.add_edge(node_id, END)
                logger.debug(f"Added edge: {node_id} -> END (no targets)")
        
        # Find nodes with no outgoing edges and connect them to END
        source_node_ids = {edge['source'] for edge in edges}
        terminal_nodes = all_node_ids - source_node_ids
        
        for terminal_node in terminal_nodes:
            if terminal_node != entry_point:  # Don't add END edge for entry point if it's terminal
                graph.add_edge(terminal_node, END)
                logger.debug(f"Added terminal edge: {terminal_node} -> END")
        
        # Handle conditional nodes (Logic If)
        for node in nodes:
            if node['data']['template_id'] == 'logic-if':
                self._add_conditional_edges(graph, node, edges)
        
        logger.info("Graph construction complete")
        
        compiled_graph = graph.compile()
        
        logger.info("Graph compiled successfully")
        
        return compiled_graph