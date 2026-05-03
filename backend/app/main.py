from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from .database import engine, Base, get_db
from . import models  # noqa: F401  # registra modelos para create_all
from .routers import reportes_router, usuarios_router, hotspots_router

# Crea tablas faltantes al iniciar (MVP). Para produccion, usar migraciones.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SafeRoutes BQ API")
app.include_router(reportes_router)
app.include_router(usuarios_router)
app.include_router(hotspots_router)

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