from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID

from app.database import get_db
from app.models.reporte import Reporte
from app.schemas.reporte import ReporteCreate, ReporteRead

router = APIRouter(prefix="/reportes", tags=["Reportes"])


def _row_to_read(row: Reporte, lat: float, lon: float) -> ReporteRead:
    return ReporteRead(
        id=row.id,
        usuario_id=row.usuario_id,
        tipo=row.tipo,
        descripcion=row.descripcion,
        foto_url=row.foto_url,
        latitud=lat,
        longitud=lon,
        severidad=row.severidad,
        validaciones=row.validaciones,
        created_at=row.created_at,
    )


@router.post("/", response_model=ReporteRead, status_code=201)
async def crear_reporte(data: ReporteCreate, db: AsyncSession = Depends(get_db)):
    point = ST_SetSRID(ST_MakePoint(data.longitud, data.latitud), 4326)

    reporte = Reporte(
        usuario_id=1,  # TODO: obtener del token JWT (semana 4)
        tipo=data.tipo,
        descripcion=data.descripcion,
        foto_url=data.foto_url,
        ubicacion=point,
        severidad=data.severidad,
    )
    db.add(reporte)
    await db.commit()
    await db.refresh(reporte)

    return _row_to_read(reporte, data.latitud, data.longitud)


@router.get("/", response_model=list[ReporteRead])
async def listar_reportes(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    from geoalchemy2.functions import ST_X, ST_Y

    stmt = (
        select(
            Reporte,
            ST_Y(Reporte.ubicacion).label("lat"),
            ST_X(Reporte.ubicacion).label("lon"),
        )
        .order_by(Reporte.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [_row_to_read(r[0], r[1], r[2]) for r in rows]


@router.get("/{reporte_id}", response_model=ReporteRead)
async def obtener_reporte(reporte_id: int, db: AsyncSession = Depends(get_db)):
    from geoalchemy2.functions import ST_X, ST_Y

    stmt = select(
        Reporte,
        ST_Y(Reporte.ubicacion).label("lat"),
        ST_X(Reporte.ubicacion).label("lon"),
    ).where(Reporte.id == reporte_id)
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return _row_to_read(row[0], row[1], row[2])
