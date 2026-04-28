from datetime import datetime

from pydantic import BaseModel, EmailStr


class UsuarioCreate(BaseModel):
    email: EmailStr
    nombre: str
    password: str


class UsuarioRead(BaseModel):
    id: int
    email: str
    nombre: str
    reputacion: float
    created_at: datetime

    model_config = {"from_attributes": True}
