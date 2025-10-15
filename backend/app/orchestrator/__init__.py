# backend/app/orchestrator/__init__.py
"""
LangGraph Orchestrator Module

Provides execution orchestration for both Workflow Builder and AI Assistant conditions
in the user study.

Key Components:
- HybridStateManager: Redis (memory) + PostgreSQL (persistence)
- WorkflowBuilderGraph: User-steered workflow execution
- AIAssistantGraph: Autonomous agent execution
- OrchestrationService: Main execution coordinator
"""

from .state_manager import HybridStateManager
from .service import OrchestrationService, WebSocketManager, orchestrator
from .graphs.workflow_builder import WorkflowBuilderGraph
from .graphs.ai_assistant import AIAssistantGraph
from .graphs.shared_state import SharedWorkflowState, NodeExecutionResult, AgentDecision

__all__ = [
    # State Management
    'HybridStateManager',
    
    # Services
    'OrchestrationService',
    'WebSocketManager',
    'orchestrator',
    
    # Graphs
    'WorkflowBuilderGraph',
    'AIAssistantGraph',
    
    # State Types
    'SharedWorkflowState',
    'NodeExecutionResult',
    'AgentDecision',
]

__version__ = '1.0.0'