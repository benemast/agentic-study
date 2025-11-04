# backend/app/configs/config.py
"""
Centralized configuration with validation
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, computed_field, PrivateAttr
from typing import Optional, Literal
from pathlib import Path
from dotenv import load_dotenv
import os

class Settings(BaseSettings):
    """Application settings with validation"""
    
    _base_dir = Path(__file__).resolve().parent.parent.parent
    _api_keys: dict = PrivateAttr(default_factory=dict)
    
    # ============================================================
    #     # MODEL & STREAMING CONFIGURATION
    # ============================================================
    
    llm_model: str = Field(
        default= "gpt-5-nano", #"gpt-3.5-turbo",
        description="OpenAI model to use"
    )
    
    use_stream: bool = Field(
        default=True,
        description="Enable streaming for LLM responses"
    )
    
    # ============================================================
    # OPENAI CONFIGURATION
    # ============================================================
    
    openai_api_url: str = Field(
        default="https://api.openai.com/v1/chat/completions",
        description="OpenAI API endpoint"
    )
    
    max_context_messages: int = Field(
        default=10,
        description="Maximum number of context messages to send"
    )
    
    default_max_tokens: int = Field(
        default=2000,
        description="Default max tokens for completion"
    )
    
    default_temperature: float = Field(
        default=0.7,
        ge=0.0, # greater than or equal
        le=2.0,  # less than or equal
        description="Default temperature for LLM"
    )
    
    include_usage: bool = Field(
        default=True,
        description="Include token usage in stream response. Set in streaming_options."
    )
    
    include_obfuscation: bool = Field(
        default=False,
        description="Include obfuscation strings in stream response. Set in streaming_options."
    )

    verbosity: Optional[Literal["low", "medium", "high"]] = Field(
        default="medium",
        description="GPT-5: Control output length (low=terse, medium=balanced, high=verbose)"
    )
    
    reasoning_effort: Optional[Literal["minimal", "medium", "high"]] = Field(
        default="medium",
        description="GPT-5: Control reasoning depth (minimal=fast/simple, medium=default, high=complex)"
    )    
    # Usage recommendations:
    # - verbosity="low" → for chat UI (concise responses)
    # - verbosity="high" → for research/analysis tasks (detailed responses)
    # - reasoning_effort="minimal" → for simple extraction/formatting
    # - reasoning_effort="high" → for multi-step planning/complex reasoning

    # ============================================================
    # APPLICATION SETTINGS
    # ============================================================
    
    rate_limit_enabled: bool = Field(
        default=True,
        description="Enable rate limiting"
    )
    
    websocket_rate_limit: int= Field(
        default=200, # messages pro minute
        description="Rate limit for WebSocket downstream"
    )

    chat_rate_limit: str = Field(
        default="20/minute",
        pattern=r"^\d+/(second|minute|hour|day)$",
        description="Rate limit for chat endpoint"
    )
    
    save_chat_rate_limit: str = Field(
        default="30/minute",
        pattern=r"^\d+/(second|minute|hour|day)$",
        description="Rate limit for save chat endpoint"
    )

    api_rate_limit: str = Field(
        default="100/minute",
        pattern=r"^\d+/(second|minute|hour|day)$",
        description="Overall API rate limit"
    )
    
    # API
    api_host: str = Field(
        default="0.0.0.0",
        description="Host used by API",
        pattern=r"^(\b25[0-5]|\b2[0-4][0-9]|\b[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$" # validate IP v4
    )

    api_port: int = Field(
        default=8000,
        ge=1024,  # greater than or equal
        le=65535,  # less than or equal
        description="Port used by API"
    )

    debug: bool = Field(
        default=False,
        description="Enable debug mode"
    )
    
    # Database
    database_url: str = Field(
        default="postgresql://localhost/dbname",
        description="Database connection URL"
    )

    db_pool_size: int = Field(
        default=5,
        description="Standard connection pool size"
    )
    
    db_max_overflow: int = Field(
        default=10,
        description="Max number of overflow pool connections"
    )
    
    # Optional individual DB components (for building DATABASE_URL)
    db_host: Optional[str] = Field(
        default=None,
        description="Database host address"
    )
    db_port: Optional[int] = Field(
        default=None,
        description="Database port number"
    )
    db_name: Optional[str] = Field(
        default=None,
        description="Database name"
    )
    db_user: Optional[str] = Field(
        default=None,
        description="Database username"
    )
    db_password: Optional[str] = Field(
        default=None,
        description="Database password"
    )
    
    # Sentry (optional)
    sentry_dsn: Optional[str] = Field(
        default=None,
        description="Sentry DSN for error tracking"
    )

    sentry_environment: str = Field(
        default="development",
        description="Sentry environment for error tracking",
        pattern=r"^(development|staging|production)$"
    )

    sentry_traces_sample_rate: float = Field(
        default=0.1, # 10% of transactions
        description="Percentage of transactions to send to Sentry for performance monitoring (0.0-1.0)",
        ge=0.0, # greater than or equal
        le=1.0  # less than or equal
    )

    sentry_profiles_sample_rate: float = Field(
        default=0.1, # 10% of transactions
        description="Percentage of profiled transactions to send to Sentry for performance analysis (0.0-1.0)",
        ge=0.0, # greater than or equal
        le=1.0  # less than or equal
    )

    # LangSmith
    langsmith_enabled: bool = Field(
        default=True,
        description="Global setting"
    )
    langsmith_tracing: bool = Field(
        default=True,
        description="Enables tracing via LangSmith"
    )
    langsmith_endpoint: str = Field(
        default="https://eu.api.smith.langchain.com",
        description="LangSmith API endpoint"
    )
    langsmith_api_key: Optional[str] = Field(
        default=None,
        description="API key used with LangSmith"
    )
    langsmith_org_id: Optional[str] = Field(
        default=None,
        description="LangSmith Organization ID"
    )
    langsmith_org_name: str = Field(
        default="Personal",
        description="LangSmith Organization Name"
    )
    langsmith_project: str = Field(
        default="agentic-study",
        description="Project name for organizing traces"    
    )
    langsmith_sample_rate: float = Field(
        default=1.0,
        description="Fraction of traces to send to LangSmith (0.0-1.0). Use 1.0 for dev, 0.1-0.3 for production",
        ge=0.0,
        le=1.0
    )

    # Redis (optional)
    redis_enabled: bool = Field(
        default=True,
        description="Enable Redis caching"
    )
    
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL"
    )

    cache_ttl: int = Field(
        default=3600,
        description="Redis cache time to live"
    )


    # WebSocket
    heartbeat_timeout: int = Field(
        default=90,
        description="Seconds after which connection is considered dead by backend"
    )
    session_timeout: int = Field(
        default=300, # 5 minuted
        description="Seconds after which session is marked inactive by backend"
    )

    # Session
    session_timeout_minutes: int = Field(
        default=60,
        description="Minutes of inactivity before user session expires"
    )
    auto_sync_interval_minutes: int = Field(
        default=5,
        description="Interval in minutes for automatic session synchronization"
    )

    # CORS
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "*"  # TEMPORARY for development - REMOVE in production!
        ],
        description="Allowed CORS origins"
    )
    
    frontend_url: str = Field(
        default= "http://localhost:5173",
        description="Frontend application URL for redirects and CORS"
    ) 

    # ============================================================
    # PYDANTIC CONFIGURATION
    # ============================================================

    model_config = SettingsConfigDict(  
        env_file=str(_base_dir / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow"  # Allow extra fields from .env
    )
    

    # ============================================================
    # INITIALIZATION
    # ============================================================
    
    def model_post_init(self, __context) -> None:
        """Load API keys directly from environment"""
        
        # Explicitly load .env file first (Pydantic only loads defined fields)
        load_dotenv(self._base_dir / ".env")
        
        # Now load from environment
        institute_key = os.getenv('OPENAI_API_KEY_INSTITUTE', '')
        personal_key = os.getenv('OPENAI_API_KEY_PERSONAL', '')
        
        if not institute_key or not personal_key:
            raise ValueError(
                f"API keys missing! Institute: {bool(institute_key)}, "
                f"Personal: {bool(personal_key)}"
            )
        
        # Store in private dict only
        self._api_keys = {
            'institute': institute_key,
            'personal': personal_key
        }
            

        
    # ============================================================
    # API KEY SELECTION
    # ============================================================
    
    @computed_field
    @property
    def openai_api_key(self) -> str:
        """
        Automatically select appropriate API key
        
        Selection Rules:
        1. If model is gpt-3.5-turbo → Institute key
        2. If streaming is disabled → Institute key
        3. Otherwise → Personal key
        
        Returns:
            str: The selected API key
        """
        # Rule 1: GPT-3.5-turbo always uses institute key
        if self.llm_model == "gpt-3.5-turbo":
            return self._api_keys['institute']
        
        # Rule 2: Non-streaming uses institute key
        if not self.use_stream:
            return self._api_keys['institute']
        
        # Default: Use personal key
        return self._api_keys['personal']
    
    def get_api_key_with_reason(self) -> tuple[str, str]:
        """
        Get API key with explanation
        
        Useful for logging and debugging
        
        Returns:
            tuple[str, str]: (api_key, reason)
        """
        if self.llm_model == "gpt-3.5-turbo":
            return (self._api_keys['institute'], "model is gpt-3.5-turbo")
        
        if not self.use_stream:
            return (self._api_keys['institute'], "streaming is disabled")
        
        return (self._api_keys['personal'], "default: gpt-4+ with streaming")
    
    # ============================================================
    # UTILITY METHODS
    # ============================================================
    
    def has_valid_keys(self) -> bool:
        """Check if both API keys are configured"""
        return bool(self._api_keys.get('institute')) and \
               bool(self._api_keys.get('personal'))
    
    def get_current_key_type(self) -> str:
        """Get the type of key currently in use"""
        current_key = self.openai_api_key
        if current_key == self._api_keys['institute']:
            return "institute"
        return "personal"
    
    def get_cors_origins(self) -> list:
        """Get CORS origins as list"""
        if isinstance(self.cors_origins, str):
            # Parse if it's a string (e.g., from .env)
            import json
            try:
                return json.loads(self.cors_origins)
            except:
                return [self.cors_origins]
        return self.cors_origins


# ============================================================
# CREATE GLOBAL SETTINGS INSTANCE
# ============================================================

settings = Settings()


# ============================================================
# STARTUP VALIDATION
# ============================================================

if __name__ == "__main__":
    print("=" * 70)
    print("CONFIGURATION VALIDATION")
    print("=" * 70)
    
    # Check keys are loaded
    print(f"\n✓ Model: {settings.llm_model}")
    print(f"✓ Streaming: {settings.use_stream}")
    print(f"✓ Valid keys: {settings.has_valid_keys()}")
    print(f"✓ Current key type: {settings.get_current_key_type()}")
    
    # Show key selection
    key, reason = settings.get_api_key_with_reason()
    print(f"✓ Using: {key[:20]}... ({reason})")
    
    # Test scenarios
    print("\n" + "-" * 70)
    print("KEY SELECTION SCENARIOS")
    print("-" * 70)
    
    scenarios = [
        ("gpt-3.5-turbo", True, "institute"),
        ("gpt-3.5-turbo", False, "institute"),
        ("gpt-4", False, "institute"),
        ("gpt-4", True, "personal"),
        ("gpt-4o", True, "personal"),
    ]
    
    for model, stream, expected in scenarios:
        settings.llm_model = model
        settings.use_stream = stream
        actual = settings.get_current_key_type()
        status = "✅" if actual == expected else "❌"
        print(f"{status} {model:<20} stream={stream!s:<5} → {actual} (expected: {expected})")
    
    # Check privacy
    print("\n" + "-" * 70)
    print("PRIVACY CHECK")
    print("-" * 70)
    print(f"✓ 'openai_api_key_institute' accessible: {hasattr(settings, 'openai_api_key_institute')}")
    print(f"✓ 'openai_api_key_personal' accessible: {hasattr(settings, 'openai_api_key_personal')}")
    print(f"✓ '_api_keys' in serialization: {'_api_keys' in settings.model_dump()}")
    
    print("\n" + "=" * 70)
    print("✅ CONFIGURATION VALID!")
    print("=" * 70)