from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field


TipoReporte = Literal["accidente", "hueco", "arroyo", "semaforo_danado", "otro"]
EstadoReporte = Literal["pendiente", "confirmado", "inactivo"]


class ReporteCreate(BaseModel):
    tipo: TipoReporte
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    severidad: int = Field(ge=1, le=5)


class ReporteOut(BaseModel):
    id: int
    usuario_id: UUID
    tipo: str
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None
    latitud: float
    longitud: float
    severidad: int
    validaciones: int
    estado: EstadoReporte
    activo: bool
    reporte_padre_id: Optional[int] = None
    created_at: datetime
    direccion: Optional[str] = None
    confirmado_at: Optional[datetime] = None

# Para endpoints de validación
class VigenciaIn(BaseModel):
    sigue: bool

class VigenciaOut(BaseModel):
    reporte_id: int
    estado: EstadoReporte
    activo: bool

# Para cambio manual de estado por admin
class EstadoCambioIn(BaseModel):
    estado: Literal["confirmado", "inactivo"]
