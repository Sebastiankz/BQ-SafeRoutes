from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Reporte
from ..schemas import ReporteCreate, ReporteOut

router = APIRouter(prefix="/reportes", tags=["reportes"])


def _build_reporte_select():
    return select(
        Reporte.id,
        Reporte.usuario_id,
        Reporte.tipo,
        Reporte.descripcion,
        Reporte.foto_url,
        func.ST_Y(Reporte.ubicacion).label("latitud"),
        func.ST_X(Reporte.ubicacion).label("longitud"),
        Reporte.severidad,
        Reporte.validaciones,
        Reporte.created_at,
    )


@router.post("/", response_model=ReporteOut, status_code=status.HTTP_201_CREATED)
def crear_reporte(payload: ReporteCreate, db: Session = Depends(get_db)):
    reporte = Reporte(
        usuario_id=1,  # Temporal hasta implementar autenticacion JWT
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        foto_url=payload.foto_url,
        ubicacion=func.ST_SetSRID(func.ST_MakePoint(payload.longitud, payload.latitud), 4326),
        severidad=payload.severidad,
    )
    db.add(reporte)
    db.commit()

    created = (
        db.execute(_build_reporte_select().where(Reporte.id == reporte.id))
        .mappings()
        .first()
    )
    return created


@router.get("/", response_model=list[ReporteOut])
def listar_reportes(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    rows = (
        db.execute(_build_reporte_select().order_by(Reporte.id.desc()).limit(limit).offset(offset))
        .mappings()
        .all()
    )
    return rows


@router.get("/{reporte_id}", response_model=ReporteOut)
def obtener_reporte(reporte_id: int, db: Session = Depends(get_db)):
    row = (
        db.execute(_build_reporte_select().where(Reporte.id == reporte_id))
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return row
