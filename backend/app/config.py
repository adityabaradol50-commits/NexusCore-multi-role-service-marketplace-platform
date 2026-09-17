import os
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "NexusCore Platform"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database Configuration
    # Defaults to local async SQLite for zero-friction setup; easily switches to PostgreSQL via .env
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexuscore.db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    
    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        """Ensures PostgreSQL URLs use the asyncpg driver (required for Render/Supabase/RDS)."""
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Security & JWT Authentication
    SECRET_KEY: str = "supersecret-nexuscore-dev-key-change-in-production-min32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PLATFORM_COMMISSION_PERCENTAGE: float = 10.0
    
    # Payment Provider Integration Configuration
    PAYMENT_PROVIDER: str = "test" # "test", "stripe", "razorpay"
    PAYMENT_KEY_ID: str = "test_key_id_nexuscore_dev"
    PAYMENT_KEY_SECRET: str = "test_key_secret_nexuscore_dev"
    PAYMENT_WEBHOOK_SECRET: str = "whsec_nexuscore_dev_secret"
    
    # Initial Superuser Bootstrapping
    FIRST_SUPERUSER_EMAIL: str = "admin@nexuscore.com"
    FIRST_SUPERUSER_PASSWORD: str = "AdminPassword123!"
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Supports comma-separated strings or JSON arrays for Render environment variable flexibility."""
        if isinstance(v, str):
            v_stripped = v.strip()
            if not v_stripped:
                return []
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    res = json.loads(v_stripped)
                    if isinstance(res, list):
                        return [str(i).strip() for i in res if str(i).strip()]
                except Exception:
                    pass
                items = v_stripped[1:-1].split(",")
                return [i.strip().strip("'\"") for i in items if i.strip().strip("'\"")]
            return [i.strip() for i in v_stripped.split(",") if i.strip()]
        return v
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
