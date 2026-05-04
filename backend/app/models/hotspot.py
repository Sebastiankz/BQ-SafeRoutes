from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, func
from geoalchemy2 import Geometry
from ..database import Base

class Hotspot(Base):
    __tablename__ = "hotspots"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    ubicacion      = Column(Geometry("POINT", srid=4326), nullable=False)
    radio_metros   = Column(Float, nullable=False)
    nivel_riesgo   = Column(String(20), nullable=False)
    num_incidentes = Column(Integer, default=0)
    origen         = Column(String(20), nullable=False)
    year  = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)
    activo         = Column(Boolean, default=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())