from pydantic_settings import BaseSettings
from functools import lru_cache


#es una clase especial que lee las variables de entorno automaticamente
class Settings(BaseSettings):
    database_url: str = ""
    redis_url: str = "redis://redis:6379/0"
    secret_key: str = "dev-secret-key-change-in-production"
    environment: str = "development"
    access_token_expire_minutes: int = 60

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    #lee el archivo .env e ignora cualquier otra variable que no esté definida en la clase
    model_config = {"env_file": ".env", "extra": "ignore"} #

@lru_cache()
def get_settings() -> Settings:
    return Settings()