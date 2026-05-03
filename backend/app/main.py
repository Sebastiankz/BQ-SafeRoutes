from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import health, reportes, hotspots, usuarios


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — verifica la conexión a Supabase antes de aceptar requests.
    # Si la BD no responde, el error aparece al arrancar (no en el primer request).
    from sqlalchemy import text
    from app.database import async_session
    import logging
    log = logging.getLogger("uvicorn")
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        log.info("Database connection OK (Supabase)")
    except Exception as e:
        log.error(f"Database connection FAILED: {e}")
    yield
    # Shutdown


settings = get_settings()

app = FastAPI(
    title="SafeRoutes BQ API",
    description="API para la gestión preventiva de seguridad vial en Barranquilla",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, restringir a dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(reportes.router)
app.include_router(hotspots.router)
app.include_router(usuarios.router)
