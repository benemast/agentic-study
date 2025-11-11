# backend/app/orchestrator/__init__.py
"""
LangGraph Orchestrator Module

Provides execution orchestration for both Workflow Builder and AI Assistant conditions
in the user study.

Key Components:
- HybridStateManager: Redis (memory) + PostgreSQL (persistence)
- WorkflowBuilderGraph: User-steered workflow execution
- AIAssistantAgent: Autonomous agent execution
- OrchestrationService: Main execution coordinator
"""

from .state_manager import HybridStateManager
from .service import OrchestrationService, orchestrator
from .graphs.workflow_builder import WorkflowBuilderGraph
from .graphs.ai_assistant_agent import AIAssistantAgent
from .graphs.shared_state import SharedWorkflowState, NodeExecutionResult, AgentDecision

__all__ = [
    # State Management
    'HybridStateManager',
    
    # Services
    'OrchestrationService',
    'orchestrator',
    
    # Graphs
    'WorkflowBuilderGraph',
    'AIAssistantAgent',
    
    # State Types
    'SharedWorkflowState',
    'NodeExecutionResult',
    'AgentDecision',
]

__version__ = '1.0.0'