# backend/tests/conftest.py
"""
Pytest Configuration

This file is automatically loaded by pytest and sets up the test environment.
Provides fixtures and utilities for all tests.

Features:
- Automatic Python path setup
- Mock fixtures for WebSocket, Database, etc.
- Shared test utilities
- Handles async initialization issues
"""
import sys
from pathlib import Path
import pytest
import asyncio
import os

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Set test environment variables BEFORE any imports
os.environ.setdefault('TESTING', 'true')
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/15')  # Test DB
os.environ.setdefault('OPENAI_API_KEY', 'test-key-for-testing')
os.environ.setdefault('SKIP_ASYNC_INIT', 'true')  # Prevent async init at import


# ============================================================
# ASYNC SUPPORT
# ============================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


# ============================================================
# MOCK FIXTURES
# ============================================================

@pytest.fixture
def mock_websocket_manager():
    """Mock WebSocket manager for testing"""
    class MockWebSocketManager:
        def __init__(self):
            self.messages_sent = []
            self.sessions = set()
        
        async def send_to_session(self, session_id, message):
            self.messages_sent.append({
                'session_id': session_id,
                'message': message
            })
            self.sessions.add(session_id)
        
        def is_connected(self, session_id):
            return session_id in self.sessions
        
        def get_message_count(self):
            return len(self.messages_sent)
    
    return MockWebSocketManager()


@pytest.fixture
def mock_tool_registry():
    """Mock tool registry for testing"""
    class MockToolRegistry:
        def __init__(self):
            self.tools = {}
        
        def get_tool_definition(self, ai_id):
            return self.tools.get(ai_id)
        
        def get_all_definitions(self):
            return list(self.tools.values())
    
    return MockToolRegistry()


@pytest.fixture
def sample_state():
    """Sample workflow state for testing"""
    return {
        'session_id': 'test_session_123',
        'execution_id': 456,
        'step_number': 1,
        'condition': 'ai_assistant',
        'working_data': {
            'records': []
        },
        'agent_memory': []
    }


@pytest.fixture
def sample_state_with_data():
    """Sample workflow state with data loaded"""
    return {
        'session_id': 'test_session_123',
        'execution_id': 456,
        'step_number': 2,
        'condition': 'ai_assistant',
        'working_data': {
            'records': [
                {'review_id': '1', 'star_rating': 5, 'review_body': 'Great product!'},
                {'review_id': '2', 'star_rating': 4, 'review_body': 'Good value'},
                {'review_id': '3', 'star_rating': 3, 'review_body': 'Average'}
            ]
        },
        'agent_memory': [
            {
                'step': 1,
                'decision': {
                    'action': 'load',
                    'tool_name': 'load_reviews'
                }
            }
        ]
    }


# ============================================================
# PYTEST CONFIGURATION
# ============================================================

def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    for item in items:
        # Add asyncio marker to async tests
        if asyncio.iscoroutinefunction(item.function):
            item.add_marker(pytest.mark.asyncio)


# ============================================================
# UTILITIES
# ============================================================

@pytest.fixture
def capture_logs(caplog):
    """Capture logs for testing"""
    import logging
    caplog.set_level(logging.DEBUG)
    return caplog


# ============================================================
# MODULE ISOLATION
# ============================================================

@pytest.fixture(autouse=True)
def isolate_modules():
    """Isolate module imports between tests to prevent side effects"""
    # Store original modules
    original_modules = sys.modules.copy()
    
    yield
    
    # Remove any new modules that were imported during the test
    # This prevents issues with singleton patterns and global state
    new_modules = set(sys.modules.keys()) - set(original_modules.keys())
    for module_name in new_modules:
        if module_name.startswith('app.'):
            sys.modules.pop(module_name, None)


# ============================================================
# CLEANUP
# ============================================================

@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset singleton instances between tests"""
    yield
    
    # Reset LLM client singleton
    try:
        from app.orchestrator.llm import client_langchain
        client_langchain._llm_client_instance = None
    except ImportError:
        pass
    
    # Reset circuit breaker manager
    try:
        from app.orchestrator.llm import circuit_breaker_enhanced
        # Circuit breaker manager may need reset
    except ImportError:
        pass
    
    # Reset callback factory
    try:
        from app.orchestrator.llm import streaming_callbacks
        streaming_callbacks._callback_factory_instance = None
    except ImportError:
        pass