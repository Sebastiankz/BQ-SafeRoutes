from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, reportes, hotspots, usuarios


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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
