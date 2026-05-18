"""Lógica de consenso comunitario para reportes.

Define los umbrales y las operaciones que mueven un reporte entre
los tres estados: pendiente -> confirmado -> inactivo.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
from urllib.request import urlopen
from urllib.parse import urlencode
import json

from sqlalchemy import cast, func, or_, select, update
from sqlalchemy.orm import Session
from geoalchemy2 import Geography

from ..models.reporte import Reporte
from ..models.validacion import Validacion

_geo_logger = logging.getLogger(__name__)


def reverse_geocode(latitud: float, longitud: float, api_key: str) -> Optional[str]:
    """Convierte coordenadas en una dirección legible usando Google Maps Geocoding API.

    Retorna None si no hay API key, si falla la petición o si no hay resultados.
    No lanza excepciones — el caller no debe verse afectado por un error de geocodificación.
    """
    if not api_key:
        return None
    try:
        params = urlencode({"latlng": f"{latitud},{longitud}", "key": api_key, "language": "es"})
        url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
        with urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read().decode())
        results = data.get("results", [])
        if results:
            return results[0].get("formatted_address")
    except Exception as exc:  # noqa: BLE001
        _geo_logger.warning("reverse_geocode falló: %s", exc)
    return None


# --- Parámetros del consenso ---------------------------------------------
RADIO_AGRUPACION_METROS = 100.0
VENTANA_AGRUPACION_HORAS = 24
UMBRAL_CONFIRMACION = 2          # +2 confirmaciones (3 reportes en total) -> confirmado
UMBRAL_INACTIVACION = 3          # 3 'proximidad_no' consecutivos -> inactivo


def buscar_reporte_padre(
    db: Session,
    tipo: str,
    latitud: float,
    longitud: float,
) -> Optional[Reporte]:
    """Devuelve un reporte 'padre' candidato si existe.

    Criterios: mismo `tipo`, dentro de RADIO_AGRUPACION_METROS, creado dentro
    de la ventana de horas, no inactivo, y que él mismo no sea hijo de otro.
    """
    punto = func.ST_SetSRID(func.ST_MakePoint(longitud, latitud), 4326)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=VENTANA_AGRUPACION_HORAS)

    stmt = (
        select(Reporte)
        .where(
            Reporte.tipo == tipo,
            Reporte.estado.in_(("pendiente", "confirmado")),
            Reporte.reporte_padre_id.is_(None),
            Reporte.created_at >= cutoff,
            func.ST_DWithin(
                cast(Reporte.ubicacion, Geography),
                cast(punto, Geography),
                RADIO_AGRUPACION_METROS,
            ),
        )
        .order_by(Reporte.created_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def registrar_confirmacion(db: Session, padre: Reporte, usuario_id: UUID) -> Reporte:
    """Registra una confirmación sobre el padre y promueve a 'confirmado' si toca.

    No hace commit; el caller lo gestiona.
    """
    db.add(Validacion(
        reporte_id=padre.id,
        usuario_id=usuario_id,
        tipo="confirmacion_nuevo_reporte",
    ))
    padre.validaciones = (padre.validaciones or 0) + 1

    if padre.estado == "pendiente" and padre.validaciones >= UMBRAL_CONFIRMACION:
        padre.estado = "confirmado"
        padre.activo = True
        padre.confirmado_at = func.now()

    return padre



def inactivar_grupo(db: Session, reporte: Reporte) -> None:
    """Marca como inactivo el padre del grupo y todos sus hijos en una sola query.

    No hace commit; el caller lo gestiona.
    """
    raiz_id = reporte.reporte_padre_id if reporte.reporte_padre_id else reporte.id
    db.execute(
        update(Reporte)
        .where(or_(Reporte.id == raiz_id, Reporte.reporte_padre_id == raiz_id))
        .values(estado="inactivo", activo=False)
        .execution_options(synchronize_session="fetch")
    )
def registrar_vigencia(
    db: Session,
    reporte: Reporte,
    usuario_id: UUID,
    sigue: bool,
) -> Reporte:
    """Registra una respuesta de proximidad y desactiva si hay 3 'no' consecutivos.

    No hace commit; el caller lo gestiona.
    """
    tipo_voto = "proximidad_si" if sigue else "proximidad_no"
    db.add(Validacion(
        reporte_id=reporte.id,
        usuario_id=usuario_id,
        tipo=tipo_voto,
    ))

    db.flush()  # asegura que el voto recién insertado entre en el SELECT
    ultimos = db.execute(
        select(Validacion.tipo)
        .where(
            Validacion.reporte_id == reporte.id,
            Validacion.tipo.in_(("proximidad_si", "proximidad_no")),
        )
        .order_by(Validacion.created_at.desc(), Validacion.id.desc())
        .limit(UMBRAL_INACTIVACION)
    ).scalars().all()

    if (
        reporte.estado == "confirmado"
        and len(ultimos) == UMBRAL_INACTIVACION
        and all(v == "proximidad_no" for v in ultimos)
    ):
        inactivar_grupo(db, reporte)

    return reporte
