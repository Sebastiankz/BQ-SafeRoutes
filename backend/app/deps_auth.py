from typing import Annotated, Optional
from uuid import UUID

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .supabase_jwt import decodificar_usuario_uuid_supabase

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_usuario_uuid(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
) -> UUID:
    """Requiere Authorization: Bearer <jwt>. Para rutas públicas no uses esta dependencia."""
    if creds is None or (creds.scheme or "").lower() != "bearer" or not creds.credentials.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere iniciar sesión para esta acción",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return decodificar_usuario_uuid_supabase(creds.credentials.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None


def get_current_admin_uuid(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
) -> UUID:
    """
    Igual que get_current_usuario_uuid pero además exige que el email del JWT
    pertenezca al dominio @admin (ej: policia@admin.co, admin@admin.barranquilla.gov.co).
    Devuelve 403 si el usuario está autenticado pero no es admin.
    """
    if creds is None or (creds.scheme or "").lower() != "bearer" or not creds.credentials.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere iniciar sesión para esta acción",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = creds.credentials.strip()
    try:
        usuario_id = decodificar_usuario_uuid_supabase(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    # Leer el claim `email` del JWT (sin re-verificar firma — ya fue validada arriba)
    try:
        payload = pyjwt.decode(token, options={"verify_signature": False})
        email: str = payload.get("email") or ""
    except Exception:
        email = ""

    # El dominio debe ser exactamente `admin` o empezar con `admin.`
    # Ejemplos válidos: @admin, @admin.co, @admin.barranquilla.gov.co
    domain = email.split("@")[-1].lower() if "@" in email else ""
    if domain != "admin" and not domain.startswith("admin."):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores",
        )

    return usuario_id
