import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session
from sqlalchemy import text
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
from typing import Optional

from ..models.incidente_historico import IncidenteHistorico
from ..models.hotspot import Hotspot

def haversine(p1: np.ndarray, p2: np.ndarray) -> float:
    """Haversine distance in radians between two points given in radians."""
    dlat = p2[0] - p1[0]
    dlng = p2[1] - p1[1]
    a = np.sin(dlat / 2) ** 2 + np.cos(p1[0]) * np.cos(p2[0]) * np.sin(dlng / 2) ** 2
    return 2 * np.arcsin(np.sqrt(a))

def generate_hotspots(
        db: Session,
        eps_meters: float = 150.0, # Search radius in meters
        min_samples: int = 5, # Minimum incidents required to form a hotspot
        origin: str = "dbscan_historico",
        year:  Optional[int] = None,
        month: Optional[int] = None,
) -> int:

    filters = ""
    params = {}
    if year is not None:
        filters += " WHERE EXTRACT(YEAR FROM fecha_hora) = :year"
        params["year"] = year
    if month is not None:
        connector = " AND" if year is not None else " WHERE"
        filters += f"{connector} EXTRACT(MONTH FROM fecha_hora) = :month"
        params["month"] = month

    rows = db.execute(
        text(f"SELECT ST_Y(ubicacion) AS lat, ST_X(ubicacion) AS lng FROM incidentes_historicos{filters}"),
        params,
    ).fetchall()

    coords = np.array([[r.lat, r.lng] for r in rows])

    # DBSCAN requires coordinates in radians for geodesic distances
    coords_rad = np.radians(coords)

    EARTH_RADIUS = 6371000

    model = DBSCAN(eps=eps_meters / EARTH_RADIUS, min_samples=min_samples, algorithm='ball_tree', metric='haversine')
    labels = model.fit_predict(coords_rad)

    # Eliminar hotspots previos del mismo origen y periodo
    db.execute(
        text("DELETE FROM hotspots WHERE origen = :origin AND year IS NOT DISTINCT FROM :year AND month IS NOT DISTINCT FROM :month"),
        {"origin": origin, "year": year, "month": month},
    )

    cluster_ids = set(labels) - {-1}  # -1 is noise, does not belong to any cluster

    hotspots_created = 0

    for cluster_id in cluster_ids:
        mask = (labels == cluster_id)
        cluster_points = coords[mask]
        cluster_points_rad = coords_rad[mask]

        centroid_lat = cluster_points[:, 0].mean()  # Average latitude
        centroid_lng = cluster_points[:, 1].mean()  # Average longitude

        centroid_rad = np.radians([centroid_lat, centroid_lng])
        distances = np.array([
            haversine(centroid_rad, p) * EARTH_RADIUS
            for p in cluster_points_rad
        ])
        radius = distances.max()

        n = cluster_points.shape[0]
        if n > 30:
            risk_level = "Alto"
        elif n > 10:
            risk_level = "Medio"
        else:
            risk_level = "Bajo"

        new_hotspot = Hotspot(
            ubicacion=ST_SetSRID(ST_MakePoint(float(centroid_lng), float(centroid_lat)), 4326),
            radio_metros=float(radius),
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
