from typing import Annotated, Optional
from uuid import UUID

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
