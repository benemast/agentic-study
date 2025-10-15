# backend/app/orchestrator/graphs/workflow_builder.py
from langgraph.graph import StateGraph, END
from typing import Dict, Any, Callable
import logging
import time
from datetime import datetime

from .shared_state import SharedWorkflowState
from ..tools.data_tools import (
    GatherDataTool, FilterDataTool, CleanDataTool, 
    SortDataTool, CombineDataTool
)
from ..tools.analysis_tools import (
    SentimentAnalysisTool, GenerateInsightsTool, ShowResultsTool
)

logger = logging.getLogger(__name__)


class WorkflowBuilderGraph:
    """
    Build and execute user-defined workflows from Workflow Builder
    
    Users explicitly define the flow: nodes and edges
    System follows the exact path defined by the user
    High visibility and control for the user
    """
    
    # Tool registry: maps node template IDs to tool instances
    TOOL_REGISTRY = {
        'gather-data': GatherDataTool(),
        'filter-data': FilterDataTool(),
        'clean-data': CleanDataTool(),
        'sort-data': SortDataTool(),
        'combine-data': CombineDataTool(),
        'sentiment-analysis': SentimentAnalysisTool(),
        'generate-insights': GenerateInsightsTool(),
        'show-results': ShowResultsTool(),
    }
    
    def __init__(self, state_manager, websocket_manager=None):
        self.state_manager = state_manager
        self.websocket_manager = websocket_manager
    
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
        
        # Initialize graph
        graph = StateGraph(SharedWorkflowState)
        
        # Add nodes to graph
        for node in nodes:
            node_id = node['id']
            template_id = node['data']['template_id']
            tool = self.TOOL_REGISTRY.get(template_id)
            
            if not tool:
                logger.warning(f"Unknown tool: {template_id}, skipping node {node_id}")
                continue
            
            # Create node function with closure over tool and node_id
            graph.add_node(
                node_id,
                self._create_node_function(tool, node_id, node['data'])
            )
            
            logger.debug(f"Added node: {node_id} ({template_id})")
        
        # Add edges to graph
        edge_map = self._build_edge_map(edges)
        
        for node_id, targets in edge_map.items():
            if node_id == 'START':
                # Set entry point
                if targets:
                    graph.set_entry_point(targets[0])
            elif len(targets) == 1 and targets[0] != 'END':
                # Simple edge
                graph.add_edge(node_id, targets[0])
            elif not targets or targets[0] == 'END':
                # End node
                graph.add_edge(node_id, END)
        
        # Handle conditional nodes (Logic If)
        for node in nodes:
            if node['data']['template_id'] == 'logic-if':
                self._add_conditional_edges(graph, node, edges)
        
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
                from app.database import SessionLocal
                db = SessionLocal()
                try:
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
                finally:
                    db.close()
            
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
                    db = SessionLocal()
                    try:
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
                    finally:
                        db.close()
                
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