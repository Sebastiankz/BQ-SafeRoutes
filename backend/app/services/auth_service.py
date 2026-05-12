from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from ..config import get_settings


class AuthServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass
class AuthSession:
    access_token: str
    refresh_token: str | None
    expires_in: int
    usuario: dict[str, str | None]


def _settings():
    return get_settings()


def _auth_base_url() -> str:
    settings = _settings()
    url = settings.SUPABASE_URL.strip().rstrip("/")
    if not url:
        raise AuthServiceError(500, "SUPABASE_URL no está configurada en backend/.env")
    return f"{url}/auth/v1"


def _anon_key() -> str:
    key = _settings().SUPABASE_ANON_KEY.strip()
    if not key:
        raise AuthServiceError(500, "SUPABASE_ANON_KEY no está configurada en backend/.env")
    return key


def _extract_error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        for key in ("msg", "error_description", "error", "message", "detail"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
    return fallback


def _supabase_request(
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
    access_token: str | None = None,
) -> dict[str, Any]:
    headers = {
        "apikey": _anon_key(),
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    url = f"{_auth_base_url()}{path}"
    try:
        response = httpx.request(method, url, headers=headers, json=json_body, timeout=12.0)
    except httpx.HTTPError as exc:
        raise AuthServiceError(503, "No se pudo contactar el servicio de autenticación") from exc

    if response.status_code >= 400:
        payload = None
        if response.content:
            try:
                payload = response.json()
            except ValueError:
                payload = None
        detail = _extract_error_message(payload, response.text)
        raise AuthServiceError(response.status_code, detail or "Error de autenticación")

    if not response.content:
        return {}

    try:
        data = response.json()
    except ValueError as exc:
        raise AuthServiceError(502, "Respuesta inválida del proveedor de autenticación") from exc

    if not isinstance(data, dict):
        raise AuthServiceError(502, "Respuesta inesperada del proveedor de autenticación")

    return data


def _normalizar_usuario(raw_user: Any) -> dict[str, str | None]:
    if not isinstance(raw_user, dict):
        raise AuthServiceError(502, "No se recibió información de usuario desde autenticación")

    raw_name = None
    meta = raw_user.get("user_metadata")
    if isinstance(meta, dict):
        raw_name = meta.get("full_name")

    nombre = raw_name.strip() if isinstance(raw_name, str) else ""

    return {
        "id": str(raw_user.get("id") or ""),
        "email": str(raw_user.get("email") or ""),
        "nombre": nombre or None,
    }


def _normalizar_sesion(payload: dict[str, Any]) -> AuthSession:
    source = payload
    if isinstance(payload.get("session"), dict):
        session_payload = payload["session"]
        source = {**session_payload, "user": payload.get("user") or session_payload.get("user")}

    token = source.get("access_token")
    if not isinstance(token, str) or not token.strip():
        raise AuthServiceError(
            400,
            "Si Supabase tiene confirmación por correo activada, confirma tu cuenta antes de iniciar sesión.",
        )

    expires_in = source.get("expires_in")
    if not isinstance(expires_in, int):
        expires_in = 3600

    return AuthSession(
        access_token=token,
        refresh_token=source.get("refresh_token") if isinstance(source.get("refresh_token"), str) else None,
        expires_in=expires_in,
        usuario=_normalizar_usuario(source.get("user")),
    )


def login(email: str, password: str) -> AuthSession:
    payload = _supabase_request(
        "POST",
        "/token?grant_type=password",
        json_body={"email": email, "password": password},
    )
    return _normalizar_sesion(payload)


def register(email: str, password: str, nombre: str) -> AuthSession:
    payload = _supabase_request(
        "POST",
        "/signup",
        json_body={
            "email": email,
            "password": password,
            "data": {"full_name": nombre.strip()},
        },
    )
    return _normalizar_sesion(payload)


def refresh(refresh_token: str) -> AuthSession:
    payload = _supabase_request(
        "POST",
        "/token?grant_type=refresh_token",
        json_body={"refresh_token": refresh_token},
    )
    return _normalizar_sesion(payload)


def get_user(access_token: str) -> dict[str, str | None]:
    payload = _supabase_request("GET", "/user", access_token=access_token)
    return _normalizar_usuario(payload)


def logout(access_token: str) -> None:
    _supabase_request("POST", "/logout", access_token=access_token)
