# backend/tests/test_langSmith.py
# python tests/test_langSmith.py

import sys
from pathlib import Path
import os

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