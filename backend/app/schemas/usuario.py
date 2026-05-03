from datetime import datetime

from pydantic import BaseModel, Field


class UsuarioCreate(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    nombre: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=6, max_length=255)


class UsuarioOut(BaseModel):
    id: int
    email: str
    nombre: str
    reputacion: float
    created_at: datetime
