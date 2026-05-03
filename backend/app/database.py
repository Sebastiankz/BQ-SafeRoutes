from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings # importa la función para obtener la configuración

settings = get_settings() # obtiene la configuración (incluyendo database_url)

engine = create_async_engine(
    settings.database_url,
    echo=(settings.environment == "development"),
    connect_args={"statement_cache_size": 0},
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session