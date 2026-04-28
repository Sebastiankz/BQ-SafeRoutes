"""
Módulo de ML para detección de hotspots con DBSCAN.

Se integrará en semana 2-3 por Persona C.
La función detectar_hotspots() será importada directamente
desde el endpoint POST /reportes en el backend.
"""

import numpy as np
from sklearn.cluster import DBSCAN


def detectar_hotspots(
    coordenadas: list[tuple[float, float]],
    eps_km: float = 0.5,
    min_samples: int = 5,
) -> list[dict]:
    """
    Ejecuta DBSCAN sobre coordenadas (lat, lon) para encontrar clusters de incidentes.

    Args:
        coordenadas: Lista de tuplas (latitud, longitud).
        eps_km: Radio del vecindario en kilómetros (se convierte a radianes para haversine).
        min_samples: Número mínimo de puntos para formar un cluster.

    Returns:
        Lista de hotspots detectados con centro, radio y número de incidentes.
    """
    if len(coordenadas) < min_samples:
        return []

    coords_rad = np.radians(np.array(coordenadas))

    EARTH_RADIUS_KM = 6371.0
    eps_rad = eps_km / EARTH_RADIUS_KM

    db = DBSCAN(eps=eps_rad, min_samples=min_samples, metric="haversine")
    labels = db.fit_predict(coords_rad)

    hotspots = []
    unique_labels = set(labels)
    unique_labels.discard(-1)

    for label in unique_labels:
        mask = labels == label
        cluster_coords = np.array(coordenadas)[mask]

        centro_lat = float(cluster_coords[:, 0].mean())
        centro_lon = float(cluster_coords[:, 1].mean())
        num_incidentes = int(mask.sum())

        hotspots.append({
            "latitud": centro_lat,
            "longitud": centro_lon,
            "radio_metros": eps_km * 1000,
            "num_incidentes": num_incidentes,
        })

    return hotspots
