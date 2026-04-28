from datetime import datetime

from pydantic import BaseModel


class HotspotRead(BaseModel):
    id: int
    latitud: float
    longitud: float
    radio_metros: float
    nivel_riesgo: str
    num_incidentes: int
    origen: str
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
