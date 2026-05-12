import logging
from typing import Annotated, Optional
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
from ..schemas.reporte import VigenciaIn, VigenciaOut
from ..services.reporte_service import (
    buscar_reporte_padre,
    registrar_confirmacion,
    registrar_vigencia,
)

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
        Reporte.estado,
        Reporte.activo,
        Reporte.reporte_padre_id,
        Reporte.created_at,
    )


@router.post("/", response_model=ReporteOut, status_code=status.HTTP_201_CREATED)
def crear_reporte(
    payload: ReporteCreate,
    usuario_id: Annotated[UUID, Depends(get_current_usuario_uuid)],
    db: Session = Depends(get_db),
):
    # 1. Buscar un posible reporte padre (mismo tipo, cercano y reciente).
    padre = buscar_reporte_padre(db, payload.tipo, payload.latitud, payload.longitud)

    # 2. Si el padre existe y no es del mismo usuario, este reporte queda como hijo
    #    y dispara una confirmación. Si fuera el mismo usuario, no contamos como
    #    confirmación (sería autovoto), pero igual lo enlazamos para evitar duplicados visibles.
    reporte = Reporte(
        usuario_id=usuario_id,
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        foto_url=payload.foto_url,
        ubicacion=func.ST_SetSRID(func.ST_MakePoint(payload.longitud, payload.latitud), 4326),
        severidad=payload.severidad,
        estado="pendiente",
        activo=False,
        reporte_padre_id=padre.id if padre else None,
    )
    db.add(reporte)

    try:
        if padre is not None and padre.usuario_id != usuario_id:
            registrar_confirmacion(db, padre, usuario_id)
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

    # 3. Devolvemos el reporte recién creado (no el padre).
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
    # El usuario ve TODOS sus reportes, sin importar el estado.
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
    estado: Optional[str] = Query(
        default="confirmado",
        description="Filtrar por estado. Por defecto solo 'confirmado'. Usar 'todos' para no filtrar.",
    ),
    db: Session = Depends(get_db),
):
    stmt = _build_reporte_select().where(Reporte.reporte_padre_id.is_(None))
    if estado and estado != "todos":
        stmt = stmt.where(Reporte.estado == estado)

    rows = (
        db.execute(stmt.order_by(Reporte.id.desc()).limit(limit).offset(offset))
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


@router.post("/{reporte_id}/vigencia", response_model=VigenciaOut)
def responder_vigencia(
    reporte_id: int,
    payload: VigenciaIn,
    usuario_id: Annotated[UUID, Depends(get_current_usuario_uuid)],
    db: Session = Depends(get_db),
):
    """Respuesta del usuario al prompt de proximidad: ¿sigue el incidente?"""
    reporte = db.execute(select(Reporte).where(Reporte.id == reporte_id)).scalar_one_or_none()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if reporte.estado != "confirmado":
        raise HTTPException(
            status_code=400,
            detail="Solo se puede votar vigencia de reportes confirmados",
        )

    try:
        registrar_vigencia(db, reporte, usuario_id, payload.sigue)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya respondiste a este reporte") from None

    return VigenciaOut(reporte_id=reporte.id, estado=reporte.estado, activo=reporte.activo)