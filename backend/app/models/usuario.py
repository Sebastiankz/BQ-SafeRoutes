from sqlalchemy import Column, Integer, String, Float, DateTime, func
from ..database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    email          = Column(String(255), unique=True, nullable=False)
    nombre         = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    reputacion     = Column(Float, default=1.0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())