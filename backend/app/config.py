from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_env_file = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_env_file), env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "reportes-fotos"
    ENVIRONMENT: str = "development"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    CORS_ALLOW_CREDENTIALS: bool = True
    RATE_LIMIT: str = "60/minute"
    GOOGLE_MAPS_API_KEY: str = ""

    AUTH_COOKIE_NAME: str = "sr_refresh_token"
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"
    AUTH_COOKIE_DOMAIN: str = ""
    AUTH_REFRESH_COOKIE_MAX_AGE: int = 60 * 60 * 24 * 7

    MAX_UPLOAD_IMAGE_BYTES: int = 8 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
