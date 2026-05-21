from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from sqlalchemy import text

from .config import get_settings
from .database import engine, Base, get_db
from . import models  # noqa: F401
from .routers import reportes_router, hotspots_router, incidentes_router, auth_router, storage_router, geocode_router

settings = get_settings()

if settings.ENVIRONMENT == "development":
    Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])

app = FastAPI(title="SafeRoutes BQ API")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiadas peticiones. Intenta de nuevo en un momento."},
    )


origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
allow_credentials = settings.CORS_ALLOW_CREDENTIALS and "*" not in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(storage_router)
app.include_router(reportes_router)
app.include_router(hotspots_router)
app.include_router(incidentes_router)
app.include_router(geocode_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "SafeRoutes BQ API"}


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
