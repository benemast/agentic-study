# backend/tests/__init__.py
"""
Test Suite Initialization

This file automatically sets up the Python path for all tests.
No need to add path manipulation in individual test files!

Usage:
    # Just run tests normally
    python tests/test_circuit_breakers.py
    pytest tests/
    pytest tests/test_llm_client.py -v
"""
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

print(f"Test environment initialized (backend: {backend_dir})")