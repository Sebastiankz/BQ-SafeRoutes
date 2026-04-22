from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_X, ST_Y

from app.database import get_db
from app.models.hotspot import Hotspot
from app.schemas.hotspot import HotspotRead

router = APIRouter(prefix="/hotspots", tags=["Hotspots"])


def _row_to_read(row: Hotspot, lat: float, lon: float) -> HotspotRead:
    return HotspotRead(
        id=row.id,
        latitud=lat,
        longitud=lon,
        radio_metros=row.radio_metros,
        nivel_riesgo=row.nivel_riesgo,
        num_incidentes=row.num_incidentes,
        origen=row.origen,
        activo=row.activo,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/", response_model=list[HotspotRead])
async def listar_hotspots(
    activo: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(
        Hotspot,
        ST_Y(Hotspot.ubicacion).label("lat"),
        ST_X(Hotspot.ubicacion).label("lon"),
    ).where(Hotspot.activo == activo)
    result = await db.execute(stmt)
    rows = result.all()
    return [_row_to_read(r[0], r[1], r[2]) for r in rows]
