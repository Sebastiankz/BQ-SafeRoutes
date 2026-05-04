# src/routers/incidentes_historicos.py
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case, extract, Numeric
from sqlalchemy.orm import Session
import math

from ..database import get_db
from ..models.incidente_historico import IncidenteHistorico
from ..schemas.incidentes_historicos import IncidenteHistoricoOut

router = APIRouter(prefix="/incidentes-historicos", tags=["incidentes-historicos"])


@router.get("/heatmap")
def heatmap_points(
    ano: Optional[int] = Query(default=None, description="Año (ej: 2023). Omitir = 2022-2025."),
    mes: Optional[int] = Query(default=None, ge=1, le=12, description="Mes numérico (1-12). Omitir = todos."),
    db: Session = Depends(get_db),
):
    """
    Devuelve { points: [[lat, lng, peso], ...], heat_max: float }

    Normalización contra el máximo real del subconjunto:
    - Cada punto recibe peso = log1p(score) / log1p(score_max), en [0, 1].
    - heat_max = percentil 5 de los pesos (el 5% superior llega al rojo).
    - El frontend usa heat_max directamente en L.heatLayer({ max: heat_max }).

    Por qué devolver heat_max desde el backend:
    - El p5 varía según el filtro activo (todos=0.57, un año=0.61, mes=0.67).
    - Así el frontend no necesita lógica de calibración — recibe el valor exacto.

    Error anterior: se normalizaba contra percentil-95 del score, que era 1 o 3
    en casi todos los casos → log1p(1)=0.69 → todos los pesos clampados a 1.0
    → leaflet recibía 1.000 para cada punto → sin gradiente visible.
    """

    score_expr = func.sum(
        case(
            (IncidenteHistorico.gravedad == "Con muertos", 10),
            (IncidenteHistorico.gravedad == "Con heridos", 3),
            else_=1,
        )
    ).label("score")

    q = (
        select(
            func.round(
                func.ST_Y(IncidenteHistorico.ubicacion).cast(Numeric(9, 4)), 4
            ).label("lat"),
            func.round(
                func.ST_X(IncidenteHistorico.ubicacion).cast(Numeric(9, 4)), 4
            ).label("lng"),
            score_expr,
        )
        .where(IncidenteHistorico.ubicacion.isnot(None))
        .group_by("lat", "lng")
    )

    if ano is not None:
        q = q.where(extract("year", IncidenteHistorico.fecha_hora) == ano)
    else:
        q = q.where(
            extract("year", IncidenteHistorico.fecha_hora).in_([2022, 2023, 2024, 2025])
        )

    if mes is not None:
        q = q.where(extract("month", IncidenteHistorico.fecha_hora) == mes)

    rows = db.execute(q).mappings().all()
    if not rows:
        return {"points": [], "heat_max": 0.6}

    scores = [float(r["score"]) for r in rows]
    score_max = max(scores)
    log_max = math.log1p(score_max)

    # Pesos normalizados contra el máximo real: garantiza rango [0, 1] real
    pesos = [math.log1p(s) / log_max for s in scores]

    # heat_max = p5 de los pesos (top 5% llega al rojo)
    pesos_sorted = sorted(pesos)
    p5_idx = max(0, int(len(pesos_sorted) * 0.95) - 1)  # top 5% → índice 95%
    heat_max = round(pesos_sorted[p5_idx], 3)

    points = [
        [float(r["lat"]), float(r["lng"]), round(math.log1p(float(r["score"])) / log_max, 4)]
        for r in rows
    ]

    return {"points": points, "heat_max": heat_max}


@router.get("/", response_model=list[IncidenteHistoricoOut], response_model_by_alias=True)
def listar_incidentes(db: Session = Depends(get_db)):
    rows = db.query(IncidenteHistorico).all()
    return [IncidenteHistoricoOut.from_db(r) for r in rows]