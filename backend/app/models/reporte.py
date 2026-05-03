from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from ..database import Base


class Reporte(Base):
    __tablename__ = "reportes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(UUID(as_uuid=True), nullable=False)
    tipo        = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=True)
    foto_url    = Column(String(500), nullable=True)
    ubicacion   = Column(Geometry("POINT", srid=4326), nullable=False)
    severidad   = Column(Integer, nullable=False)
    validaciones = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())