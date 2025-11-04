#!/usr/bin/env python3
"""
Import Validation Script

Tests that all imports in the new LLM architecture files work correctly.
Run this after copying files to your backend to verify dependencies.

Usage:
    python validate_imports.py
"""
import sys
from pathlib import Path

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def test_import(module_name: str, description: str) -> bool:
    """Test if a module can be imported"""
    try:
        __import__(module_name)
        print(f"{GREEN}✓{RESET} {description}: {module_name}")
        return True
    except ImportError as e:
        print(f"{RED}✗{RESET} {description}: {module_name}")
        print(f"  Error: {e}")
        return False
    except Exception as e:
        print(f"{YELLOW}⚠{RESET} {description}: {module_name}")
        print(f"  Warning: {e}")
        return True  # Don't fail on non-import errors

def main():
    print("=" * 60)
    print("LLM Architecture - Import Validation")
    print("=" * 60)
    print()
    
    all_ok = True
    
    # Core Python dependencies
    print("Core Python Libraries:")
    all_ok &= test_import("asyncio", "Async support")
    all_ok &= test_import("logging", "Logging")
    all_ok &= test_import("json", "JSON")
    all_ok &= test_import("time", "Time")
    all_ok &= test_import("typing", "Type hints")
    all_ok &= test_import("enum", "Enums")
    all_ok &= test_import("datetime", "DateTime")
    print()
    
    # Pydantic
    print("Pydantic:")
    all_ok &= test_import("pydantic", "Pydantic core")
    all_ok &= test_import("pydantic.fields", "Pydantic fields")
    print()
    
    # LangChain Core (required)
    print("LangChain Core (REQUIRED):")
    all_ok &= test_import("langchain_core", "LangChain core package")
    all_ok &= test_import("langchain_core.messages", "Message types")
    all_ok &= test_import("langchain_core.outputs", "Output types")
    all_ok &= test_import("langchain_core.callbacks", "Callbacks")
    all_ok &= test_import("langchain_core.tools", "Tools")
    all_ok &= test_import("langchain_core.agents", "Agents")
    print()
    
    # LangChain OpenAI (required)
    print("LangChain OpenAI (REQUIRED):")
    all_ok &= test_import("langchain_openai", "LangChain OpenAI package")
    all_ok &= test_import("langchain_openai.chat_models", "ChatOpenAI")
    print()
    
    # OpenAI (required)
    print("OpenAI SDK (REQUIRED):")
    all_ok &= test_import("openai", "OpenAI SDK")
    print()
    
    # Tenacity (required)
    print("Tenacity (REQUIRED):")
    all_ok &= test_import("tenacity", "Retry library")
    print()
    
    # FastAPI (required for your backend)
    print("FastAPI (REQUIRED):")
    all_ok &= test_import("fastapi", "FastAPI")
    print()
    
    # Check versions
    print("=" * 60)
    print("Checking Package Versions:")
    print("=" * 60)
    
    try:
        import langchain_core
        print(f"langchain-core: {langchain_core.__version__}")
    except:
        print("langchain-core: version unknown")
    
    try:
        import langchain_openai
        print(f"langchain-openai: {langchain_openai.__version__}")
    except:
        print("langchain-openai: version unknown")
    
    try:
        import openai
        print(f"openai: {openai.__version__}")
    except:
        print("openai: version unknown")
    
    try:
        import pydantic
        print(f"pydantic: {pydantic.__version__}")
    except:
        print("pydantic: version unknown")
    
    print()
    print("=" * 60)
    
    if all_ok:
        print(f"{GREEN}✓ All imports successful!{RESET}")
        return 0
    else:
        print(f"{RED}✗ Some imports failed!{RESET}")
        print()
        print("Install missing packages:")
        print()
        print("pip install -r requirements.txt")
        print()
        print("Or use your requirements.txt:")
        print("pip install -r backend/requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())