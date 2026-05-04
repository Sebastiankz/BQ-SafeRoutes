from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class HotspotOut(BaseModel):
    id: int
    latitud: float
    longitud: float
    radio_metros: float
    nivel_riesgo: Literal["Bajo", "Medio", "Alto"]
    num_incidentes: int
    origen: Literal["ipat", "ciudadano", "mixto"]
    activo: bool
    created_at: datetime
    updated_at: datetime
