from __future__ import annotations

from datetime import datetime
from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Reporte(Base):
    __tablename__ = "reportes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    foto_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ubicacion: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    severidad: Mapped[int] = mapped_column(Integer, default=1)
    validaciones: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    usuario: Mapped["Usuario"] = relationship(back_populates="reportes")
