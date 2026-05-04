from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Hotspot
from ..schemas import HotspotOut

from ..services.ml_hotspots import generate_hotspots

router = APIRouter(prefix="/hotspots", tags=["hotspots"])


# Listar hotspots con filtros opcionales por año, mes y estado activo

'''
  GET /hotspots/                         → hotspots globales
  GET /hotspots/?year=2023               → hotspots del 2023
  GET /hotspots/?year=2023&month=6       → hotspots de junio 2023
'''
@router.get("/", response_model=list[HotspotOut])
def list_hotspots(
    activo: bool = Query(default=True),
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(
        Hotspot.id,
        func.ST_Y(Hotspot.ubicacion).label("latitud"),
        func.ST_X(Hotspot.ubicacion).label("longitud"),
        Hotspot.radio_metros,
        Hotspot.nivel_riesgo,
        Hotspot.num_incidentes,
        Hotspot.origen,
        Hotspot.activo,
        Hotspot.created_at,
        Hotspot.updated_at,
    ).where(Hotspot.activo == activo)
    if year is not None:
        query = query.where(Hotspot.year == year)
    if month is not None:
        query = query.where(Hotspot.month == month)
    rows = (
        db.execute(query)
        .mappings()
        .all()
    )
    return rows


'''
corre regeneración global:
  POST /hotspots/regenerate              → hotspots de todos los tiempos (year=NULL, month=NULL)

corre regeneración por año:
  POST /hotspots/regenerate?year=2023    → hotspots solo con datos del 2023

corre regeneración por mes:
  POST /hotspots/regenerate?year=2023&month=6  → hotspots de junio 2023
'''
@router.post("/regenerate")
def generar_hotspots(
    eps_meters: float = Query(default=150.0, gt=0, description="Radio de búsqueda en metros"),
    min_samples: int = Query(default=5, ge=2, description="Número mínimo de incidentes para formar un hotspot"),
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
):
    total = generate_hotspots(db, eps_meters=eps_meters, min_samples=min_samples, year=year, month=month)
    return {"hotspots_created": total}
