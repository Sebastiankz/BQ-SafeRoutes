from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://saferoutes:saferoutes_dev@db:5432/saferoutes"
    redis_url: str = "redis://redis:6379/0"
    secret_key: str = "dev-secret-key-change-in-production"
    environment: str = "development"

    # JWT (semana 4)
    access_token_expire_minutes: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
