from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import String, Integer, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Hotspot(Base):
    __tablename__ = "hotspots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ubicacion: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    radio_metros: Mapped[float] = mapped_column(Float, nullable=False)
    nivel_riesgo: Mapped[str] = mapped_column(String(20), nullable=False)
    num_incidentes: Mapped[int] = mapped_column(Integer, default=0)
    origen: Mapped[str] = mapped_column(String(20), nullable=False)
    activo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
