# backend/tests/test_langSmith.py
# python tests/test_langSmith.py

import sys
from pathlib import Path
import os

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.configs.config import settings

# Set OpenAI API key as environment variable
os.environ["OPENAI_API_KEY"] = settings.openai_api_key 

from langchain.agents import create_agent

def get_weather(city: str) -> str:
    """Get weather for a given city."""
    return f"It's always sunny in {city}!"


agent = create_agent(
    model="openai:gpt-5-nano",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)

# Run the agent
agent.invoke(
    {"messages": [{"role": "user", "content": "What is the weather in San Francisco?"}]}
)