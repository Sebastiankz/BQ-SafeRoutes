from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base


class Validacion(Base):
    __tablename__ = "validaciones"
    __table_args__ = (
        UniqueConstraint("reporte_id", "usuario_id", "tipo", name="uq_validacion_reporte_usuario_tipo"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    reporte_id = Column(Integer, ForeignKey("reportes.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(UUID(as_uuid=True), nullable=False)
    tipo       = Column(String(40), nullable=False, default="confirmacion_nuevo_reporte")
    created_at = Column(DateTime(timezone=True), server_default=func.now())