from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class HotspotOut(BaseModel):
    id: int
    latitud: float
    longitud: float
    radio_metros: float
    nivel_riesgo: Literal["Bajo", "Medio", "Alto"]
    num_incidentes: int
    origen: str
    year: Optional[int] = None
    month: Optional[int] = None
    activo: bool
    created_at: datetime
    updated_at: datetime
