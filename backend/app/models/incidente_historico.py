from sqlalchemy import Column, Integer, String, Text, DateTime
from geoalchemy2 import Geometry
from ..database import Base

class IncidenteHistorico(Base):
    __tablename__ = "incidentes_historicos"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    fecha_hora         = Column(DateTime, nullable=False)
    gravedad           = Column(String(50), nullable=True)
    clase_accidente    = Column(String(100), nullable=True)
    direccion_original = Column(String(255), nullable=True)
    cant_heridos       = Column(Integer, default=0)
    cant_muertos       = Column(Integer, default=0)
    ubicacion          = Column(Geometry("POINT", srid=4326), nullable=False)
    origen_datos       = Column(String(50), default="datos_abiertos_gov")