from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Hotspot
from ..schemas import HotspotOut

router = APIRouter(prefix="/hotspots", tags=["hotspots"])


@router.get("/", response_model=list[HotspotOut])
def listar_hotspots(
    activo: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    rows = (
        db.execute(
            select(
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
            )
            .where(Hotspot.activo == activo)
            .order_by(Hotspot.id.desc())
        )
        .mappings()
        .all()
    )
    return rows
