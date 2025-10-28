# backend/app/orchestrator/graphs/workflow_builder.py
from langgraph.graph import StateGraph, END
from typing import Dict, Any, Callable
import logging
import time
from datetime import datetime

from .shared_state import SharedWorkflowState
from ..tools.registry import tool_registry
from app.database import get_db_context

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
        # Give decision maker access to WebSocket for streaming decisions
            if hasattr(self.decision_maker, 'set_websocket_manager'):
                self.decision_maker.set_websocket_manager(self.websocket_manager)
                logger.info("✅ WebSocket manager injected into DecisionMaker")
        
            # Inject WebSocket into tools that need it
            self._inject_websocket_into_tools()
    
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
            'review_sentiment_analysis',  # ReviewSentimentAnalysisTool
            'generate_insights',          # GenerateInsightsTool
        ]
        
        injected_count = 0
        for ai_id in websocket_tool_ids:
            try:
                # Get tool definition from registry
                tool_def = self.registry.get_tool_definition(ai_id=ai_id)
                
                if tool_def:
                    # Get singleton instance
                    tool_instance = tool_def.instance
                    
                    # Check if tool supports WebSocket injection
                    if hasattr(tool_instance, 'set_websocket_manager'):
                        # Inject WebSocket manager
                        tool_instance.set_websocket_manager(self.websocket_manager)
                        injected_count += 1
                        logger.info(f"✅ WebSocket injected into {tool_def.display_name} (Workflow Builder)")
                    else:
                        logger.debug(f"⚠️ Tool {tool_def.display_name} doesn't support WebSocket")
                else:
                    logger.warning(f"⚠️ Tool not found in registry: {ai_id}")
                    
            except Exception as e:
                logger.error(f"❌ Failed to inject WebSocket into tool {ai_id}: {e}", exc_info=True)
        
        logger.info(f"Workflow Builder: WebSocket manager injected into {injected_count} tool(s)")

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
            
            logger.info(f"Executing node: {node_id} ({node_label})")
            
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
            
            # Execute tool
            try:
                # Prepare input from previous results
                input_data = state.get('working_data', {})
                
                # Execute tool
                result = await tool.run(input_data)

                # error_handler
                if not result.get('success'):
                    error_type = result.get('error')
                    
                    if error_type == 'timeout':
                        # Tool timed out - record and continue or fail
                        logger.error(f"Tool timeout: {node_label}")
                        
                        # Option 1: Fail execution
                        state['status'] = 'error'
                        state['errors'].append({
                            'step': state['step_number'],
                            'tool': node_label,
                            'error': 'timeout',
                            'message': result['error_message']
                        })

                if result.get('success'):
                    # Update working data in state
                    state['working_data'] = result.get('data', state['working_data'])

                    # Update Redis directly
                    self.state_manager.update_state_field(
                        execution_id,
                        'working_data',
                        state['working_data']
                    )
                    
                    # Store result
                    state['results'][node_id] = {
                        'success': True,
                        'output': result.get('data'),
                        'execution_time_ms': result.get('execution_time_ms', 0)
                    }
                    
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
                else:
                    # Append error efficiently
                    error_msg = result.get('error', 'Unknown error')
                    self.state_manager.append_to_list_field(
                        execution_id,
                        'errors',
                        {
                            'step': new_step,
                            'node': node_id,
                            'error': error_msg
                        }
                    )
                    state['errors'].append({
                        'step': new_step,
                        'node': node_id,
                        'error': error_msg
                    })
                
                    # Send error event
                    if self.websocket_manager:
                        await self.websocket_manager.send_node_progress(
                            session_id=state['session_id'],
                            execution_id=state['execution_id'],
                            node_id=node_id,
                            step_number=state['step_number'],
                            status='failed',
                            result={'error': error_msg}
                        )
                
            except Exception as e:
                logger.exception(f"Node {node_id} execution error: {e}")
                
                # Append error
                self.state_manager.append_to_list_field(
                    execution_id,
                    'errors',
                    {'step': new_step, 'node': node_id, 'error': str(e)}
                )
                
                # Send error event via WebSocket
                if self.websocket_manager:
                    await self.websocket_manager.send_node_progress(
                        session_id=state['session_id'],
                        execution_id=state['execution_id'],
                        node_id=node_id,
                        step_number=state['step_number'],
                        status='failed',
                        result={'error': error_msg}
                    )
            
            # Update timing
            step_time = int((time.time() - step_start_time) * 1000)

            # Batch field updates
            self.state_manager.update_state_fields(execution_id, {
                'last_step_at': datetime.utcnow().isoformat(),
                'total_time_ms': state.get('total_time_ms', 0) + step_time
            })

            state['total_time_ms'] = state.get('total_time_ms', 0) + step_time
            state['last_step_at'] = datetime.utcnow().isoformat()
            
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

        is_valid, errors = self.registry.validate_workflow_definition(workflow_definition)
        if not is_valid:
            error_msg = f"Invalid workflow: {', '.join(errors)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
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
            
            # Create node function with closure over tool and node_id
            
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
        
        return graph.compile()
    
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
        
        # Find true/false branches
        true_target = None
        false_target = None
        
        for edge in edges:
            if edge['source'] == node_id:
                if edge.get('sourceHandle') == 'true':
                    true_target = edge['target']
                elif edge.get('sourceHandle') == 'false':
                    false_target = edge['target']
        
        if true_target and false_target:
            def condition_router(state: SharedWorkflowState) -> str:
                """Evaluate condition and return branch"""
                # Simple condition evaluation
                # In real implementation: evaluate user-defined conditions
                condition_result = self._evaluate_condition(state, node)
                return 'true' if condition_result else 'false'
            
            graph.add_conditional_edges(
                node_id,
                condition_router,
                {'true': true_target, 'false': false_target}
            )
            
            logger.debug(f"Added conditional edges for {node_id}: true->{true_target}, false->{false_target}")
    
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