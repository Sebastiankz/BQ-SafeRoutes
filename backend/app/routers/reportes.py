import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps_auth import get_current_usuario_uuid
from ..models import Reporte
from ..models.validacion import Validacion
from ..schemas import ReporteCreate, ReporteOut

logger = logging.getLogger(__name__)

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
def crear_reporte(
    payload: ReporteCreate,
    usuario_id: Annotated[UUID, Depends(get_current_usuario_uuid)],
    db: Session = Depends(get_db),
):
    reporte = Reporte(
        usuario_id=usuario_id,
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        foto_url=payload.foto_url,
        ubicacion=func.ST_SetSRID(func.ST_MakePoint(payload.longitud, payload.latitud), 4326),
        severidad=payload.severidad,
    )
    db.add(reporte)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        logger.error("IntegrityError al crear reporte: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo crear el reporte. Verifica que tu cuenta esté correctamente registrada.",
        ) from None
    except Exception as e:
        db.rollback()
        logger.error("Error inesperado al crear reporte: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al guardar el reporte. Intenta de nuevo.",
        ) from None

    created = (
        db.execute(_build_reporte_select().where(Reporte.id == reporte.id)).mappings().first()
    )
    return created


@router.get("/mios", response_model=list[ReporteOut])
def mis_reportes(
    usuario_actual: Annotated[UUID, Depends(get_current_usuario_uuid)],
    db: Session = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = (
        db.execute(
            _build_reporte_select()
            .where(Reporte.usuario_id == usuario_actual)
            .order_by(Reporte.id.desc())
            .limit(limit)
            .offset(offset)
        )
        .mappings()
        .all()
    )
    return rows


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
    row = db.execute(_build_reporte_select().where(Reporte.id == reporte_id)).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return row


@router.post("/{reporte_id}/validar", status_code=status.HTTP_200_OK)
def validar_reporte(
    reporte_id: int,
    usuario_id: Annotated[UUID, Depends(get_current_usuario_uuid)],
    db: Session = Depends(get_db),
):
    """Incrementa validaciones de un reporte. Un usuario solo puede validar una vez cada reporte."""
    reporte = db.execute(select(Reporte).where(Reporte.id == reporte_id)).scalar_one_or_none()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if reporte.usuario_id == usuario_id:
        raise HTTPException(status_code=400, detail="No puedes validar tu propio reporte")

    existente = db.execute(
        select(Validacion).where(
            Validacion.reporte_id == reporte_id,
            Validacion.usuario_id == usuario_id,
        )
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(status_code=409, detail="Ya validaste este reporte")

    db.add(Validacion(reporte_id=reporte_id, usuario_id=usuario_id))
    reporte.validaciones = (reporte.validaciones or 0) + 1
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya validaste este reporte") from None

    return {"validaciones": reporte.validaciones}
