from typing import Literal, Optional

from pydantic import BaseModel, Field


SessionMode = Literal["body", "cookie"]


class UsuarioSesion(BaseModel):
    id: str
    email: str
    nombre: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    usuario: UsuarioSesion


class LoginIn(BaseModel):
    email: str
    password: str = Field(min_length=6)
    session_mode: SessionMode = "body"


class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6)
    nombre: str = Field(min_length=1)
    session_mode: SessionMode = "body"


class RefreshIn(BaseModel):
    refresh_token: Optional[str] = None
    session_mode: SessionMode = "body"


class LogoutIn(BaseModel):
    session_mode: SessionMode = "body"


class LogoutOut(BaseModel):
    ok: bool = True

class GoogleLoginIn(BaseModel):
    id_token: str = Field(min_length=10)  # JWT firmado por Google
    access_token: Optional[str] = None  # OAuth access token; permite a Supabase verificar vía UserInfo y omitir el chequeo de nonce
    session_mode: SessionMode = "body"
