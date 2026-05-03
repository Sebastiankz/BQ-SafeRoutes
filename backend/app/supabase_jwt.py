"""Valida access_token JWT de Supabase Auth: HS256 (legacy secret) o asimétrico vía JWKS (RS256, etc.)."""
from uuid import UUID

import jwt
from jwt import PyJWKClient

from .config import get_settings

_settings = get_settings()
SUPABASE_JWT_SECRET = _settings.SUPABASE_JWT_SECRET.strip()
SUPABASE_URL = _settings.SUPABASE_URL.strip().rstrip("/")


def decodificar_usuario_uuid_supabase(token: str) -> UUID:
    """
    Extrae UUID de usuario desde claim `sub`.
    - HS256: `SUPABASE_JWT_SECRET` (Project Settings → API → JWT Secret legacy).
    - RS256/elípticas: `SUPABASE_URL` + JWKS en `{url}/auth/v1/.well-known/jwks.json`
      (cuando el proyecto usa JWT Signing Keys asimétricas).
    """
    token = token.strip()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as e:
        raise ValueError("token JWT mal formado") from e

    alg = (header.get("alg") or "").upper()

    opts = {"require": ["exp", "sub"]}

    if alg == "HS256":
        if not SUPABASE_JWT_SECRET:
            raise ValueError(
                "SUPABASE_JWT_SECRET no está configurado (necesario para tokens HS256)"
            )
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options=opts,
        )
    elif alg in ("RS256", "ES256", "PS256", "RS384", "RS512"):
        if not SUPABASE_URL:
            raise ValueError(
                "SUPABASE_URL no está configurada; es obligatoria para validar JWT asimétricos "
                "(p. ej. RS256)"
            )
        issuer = f"{SUPABASE_URL}/auth/v1"
        jwks_url = f"{issuer}/.well-known/jwks.json"
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=[header.get("alg") or alg],
            audience="authenticated",
            issuer=issuer,
            options=opts,
        )
    else:
        raise ValueError(f"Algoritmo JWT no soportado: {header.get('alg')}")

    sub = payload.get("sub")
    if payload.get("role") != "authenticated":
        raise ValueError("solo se admiten usuarios autenticados")
    try:
        return UUID(sub) if isinstance(sub, str) else UUID(str(sub))
    except (ValueError, TypeError) as e:
        raise ValueError("sub no es un UUID válido") from e
