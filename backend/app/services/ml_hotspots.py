import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session
from sqlalchemy import text
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
from typing import Optional

from ..models.incidente_historico import IncidenteHistorico
from ..models.hotspot import Hotspot


EARTH_RADIUS = 6_371_000  # meters


def haversine(p1: np.ndarray, p2: np.ndarray) -> float:
    """Haversine distance in radians between two points given in radians."""
    dlat = p2[0] - p1[0]
    dlng = p2[1] - p1[1]
    a = np.sin(dlat / 2) ** 2 + np.cos(p1[0]) * np.cos(p2[0]) * np.sin(dlng / 2) ** 2
    return 2 * np.arcsin(np.sqrt(a))


def _merge_overlapping(clusters: list[dict], merge_distance_m: float = 100) -> list[dict]:
    """
    Fusiona iterativamente clusters cuyos centroides estén a menos de
    merge_distance_m metros entre sí.  Después de cada fusión se recalcula
    el centroide del grupo resultante y se vuelve a evaluar.
    """
    # Cada entrada: {"points": np.ndarray de shape (N, 2) en grados}
    groups = [c.copy() for c in clusters]

    changed = True
    while changed:
        changed = False
        centroids_rad = np.array([
            np.radians(g["points"].mean(axis=0)) for g in groups
        ])
        n = len(groups)
        i = 0
        while i < n:
            j = i + 1
            while j < n:
                dist = haversine(centroids_rad[i], centroids_rad[j]) * EARTH_RADIUS
                if dist < merge_distance_m:
                    # Fusionar j en i
                    groups[i]["points"] = np.vstack([groups[i]["points"], groups[j]["points"]])
                    groups.pop(j)
                    # Recalcular centroide de i
                    centroids_rad[i] = np.radians(groups[i]["points"].mean(axis=0))
                    centroids_rad = np.delete(centroids_rad, j, axis=0)
                    n -= 1
                    changed = True
                    # No incrementar j, revisar la nueva posición j
                else:
                    j += 1
            i += 1

    return groups


def generate_hotspots(
        db: Session,
        eps_meters: float = 80,
        min_samples: int = 5,
        merge_distance_m: Optional[float] = None,
        origin: str = "dbscan_historico",
        year: Optional[int] = None,
        month: Optional[int] = None,
) -> int:
    if merge_distance_m is None:
        merge_distance_m = eps_meters * 2  # Default: 160 m

    # ── 1. Consultar incidentes ──────────────────────────────────────
    filters = ""
    params: dict = {}
    if year is not None:
        filters += " WHERE EXTRACT(YEAR FROM fecha_hora) = :year"
        params["year"] = year
    if month is not None:
        connector = " AND" if year is not None else " WHERE"
        filters += f"{connector} EXTRACT(MONTH FROM fecha_hora) = :month"
        params["month"] = month

    rows = db.execute(
        text(
            f"SELECT ST_Y(ubicacion) AS lat, ST_X(ubicacion) AS lng "
            f"FROM incidentes_historicos{filters}"
        ),
        params,
    ).fetchall()

    if len(rows) < min_samples:
        return 0

    coords = np.array([[r.lat, r.lng] for r in rows])
    coords_rad = np.radians(coords)

    # ── 2. DBSCAN ────────────────────────────────────────────────────
    model = DBSCAN(
        eps=eps_meters / EARTH_RADIUS,
        min_samples=min_samples,
        algorithm="ball_tree",
        metric="haversine",
    )
    labels = model.fit_predict(coords_rad)

    cluster_ids = set(labels) - {-1}
    if not cluster_ids:
        return 0

    # ── 3. Agrupar puntos por cluster ────────────────────────────────
    clusters = []
    for cid in cluster_ids:
        mask = labels == cid
        clusters.append({"points": coords[mask]})

    # ── 4. Fusionar clusters solapados ───────────────────────────────
    clusters = _merge_overlapping(clusters, merge_distance_m=merge_distance_m)

    # ── 5. Eliminar hotspots previos del mismo origen / periodo ──────
    db.execute(
        text(
            "DELETE FROM hotspots "
            "WHERE origen = :origin "
            "AND year IS NOT DISTINCT FROM :year "
            "AND month IS NOT DISTINCT FROM :month"
        ),
        {"origin": origin, "year": year, "month": month},
    )

    # ── 6. Crear hotspots ────────────────────────────────────────────
    hotspots_created = 0

    for cluster in clusters:
        cluster_points = cluster["points"]
        n = cluster_points.shape[0]

        centroid_lat = cluster_points[:, 0].mean()
        centroid_lng = cluster_points[:, 1].mean()

        centroid_rad = np.radians([centroid_lat, centroid_lng])
        cluster_points_rad = np.radians(cluster_points)

        distances = np.array([
            haversine(centroid_rad, p) * EARTH_RADIUS
            for p in cluster_points_rad
        ])
        radius = float(max(distances.max(), 50.0))

        if n > 30:
            risk_level = "Alto"
        elif n > 10:
            risk_level = "Medio"
        else:
            risk_level = "Bajo"

        new_hotspot = Hotspot(
            ubicacion=ST_SetSRID(ST_MakePoint(float(centroid_lng), float(centroid_lat)), 4326),
            radio_metros=radius,
            nivel_riesgo=risk_level,
            num_incidentes=int(n),
            origen=origin,
            activo=True,
            year=year,
            month=month,
        )
        db.add(new_hotspot)
        hotspots_created += 1

    db.commit()
    return hotspots_created