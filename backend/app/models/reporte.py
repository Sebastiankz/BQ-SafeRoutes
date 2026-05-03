from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, func
from geoalchemy2 import Geometry
from ..database import Base

class Reporte(Base):
    __tablename__ = "reportes"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo        = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=True)
    foto_url    = Column(String(500), nullable=True)
    ubicacion   = Column(Geometry("POINT", srid=4326), nullable=False)
    severidad   = Column(Integer, nullable=False)
    validaciones = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())