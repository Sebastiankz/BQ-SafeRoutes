from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReporteCreate(BaseModel):
    tipo: str = Field(..., description="Tipo de incidente: accidente, hueco, arroyo, semaforo_danado, otro")
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)
    severidad: int = Field(default=1, ge=1, le=5)


class ReporteRead(BaseModel):
    id: int
    usuario_id: int
    tipo: str
    descripcion: Optional[str]
    foto_url: Optional[str]
    latitud: float
    longitud: float
    severidad: int
    validaciones: int
    created_at: datetime

    model_config = {"from_attributes": True}
