from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


TipoReporte = Literal["accidente", "hueco", "arroyo", "semaforo_danado", "otro"]


class ReporteCreate(BaseModel):
    tipo: TipoReporte
    descripcion: str | None = None
    foto_url: str | None = None
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    severidad: int = Field(ge=1, le=5)


class ReporteOut(BaseModel):
    id: int
    usuario_id: int
    tipo: str
    descripcion: str | None = None
    foto_url: str | None = None
    latitud: float
    longitud: float
    severidad: int
    validaciones: int
    created_at: datetime
