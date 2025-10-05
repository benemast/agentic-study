# backend/app/config.py
"""
Centralized configuration with validation
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings with validation"""
    
    # Database
    database_url: str
    db_pool_size: int = 5
    db_max_overflow: int = 10
    
    # Optional individual DB components (for building DATABASE_URL)
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_name: Optional[str] = None
    db_user: Optional[str] = None
    db_password: Optional[str] = None
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    
    # CORS
    frontend_url: str = "http://localhost:5173"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"  # TEMPORARY for development - REMOVE in production!
    ]
    
    # OpenAI
    openai_api_key: str
    openai_api_url: Optional[str] = "https://api.openai.com/v1/chat/completions"
    llm_model: str = "gpt-3.5-turbo"
    max_context_messages: int = 10
    default_max_tokens: int = 500
    
    # Redis (Optional)
    redis_url: str = "redis://localhost:6379"
    redis_enabled: bool = True
    cache_ttl: int = 3600
    
    # Session
    session_timeout_minutes: int = 60
    auto_sync_interval_minutes: int = 5
    
    # Rate Limiting
    rate_limit_enabled: bool = True
    chat_rate_limit: str = "20/minute"
    api_rate_limit: str = "100/minute"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env
        
    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins if provided as JSON string"""
        if isinstance(self.cors_origins, str):
            import json
            try:
                return json.loads(self.cors_origins)
            except:
                return [self.cors_origins]
        return self.cors_origins

# Global settings instance
settings = Settings()

# Validate critical settings at import
def validate_settings():
    """Validate critical configuration"""
    errors = []
    
    if not settings.openai_api_key or settings.openai_api_key == "your_openai_api_key_here":
        errors.append("OPENAI_API_KEY is not set or using default value")
    
    if not settings.database_url or "your_" in settings.database_url:
        errors.append("DATABASE_URL is not properly configured")
    
    if errors:
        error_msg = "Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors)
        raise ValueError(error_msg)

# Run validation on import
try:
    validate_settings()
except ValueError as e:
    print(f"⚠️  WARNING: {e}")
    print("The application may not function correctly. Please check your .env file.")