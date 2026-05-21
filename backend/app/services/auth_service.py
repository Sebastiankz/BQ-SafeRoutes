from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from ..config import get_settings


class AuthServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass
class AuthSession:
    access_token: str
    refresh_token: Optional[str]
    expires_in: int
    usuario: dict[str, Optional[str]]


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
    json_body: Optional[dict[str, Any]] = None,
    access_token: Optional[str] = None,
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


def _normalizar_usuario(raw_user: Any) -> dict[str, Optional[str]]:
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

def _service_role_key() -> str:
    key = _settings().SUPABASE_SERVICE_ROLE_KEY.strip()
    if not key:
        raise AuthServiceError(500, "SUPABASE_SERVICE_ROLE_KEY no está configurada en backend/.env")
    return key


def _supabase_admin_request(
    method: str,
    path: str,
    *,
    json_body: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    service_key = _service_role_key()
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    url = f"{_auth_base_url()}{path}"
    try:
        response = httpx.request(method, url, headers=headers, json=json_body, timeout=12.0)
    except httpx.HTTPError as exc:
        raise AuthServiceError(503, "No se pudo contactar Supabase Admin") from exc

    if response.status_code >= 400:
        payload = None
        if response.content:
            try:
                payload = response.json()
            except ValueError:
                payload = None
        detail = _extract_error_message(payload, response.text)
        raise AuthServiceError(response.status_code, detail or "Error de Supabase Admin")

    if not response.content:
        return {}
    try:
        data = response.json()
    except ValueError as exc:
        raise AuthServiceError(502, "Respuesta inválida de Supabase Admin") from exc
    return data if isinstance(data, dict) else {}


def _verificar_id_token_google(id_token_str: str) -> dict[str, Any]:
    """Verifica firma, issuer y expiración del id_token usando las claves públicas de Google.

    No se valida `audience` para que el endpoint acepte tokens emitidos para
    cualquiera de nuestros Client IDs (Web/iOS/Android) sin hardcodear la lista.
    La firma criptográfica ya garantiza que el token proviene de Google.
    """
    try:
        claims = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            clock_skew_in_seconds=10,
        )
    except ValueError as exc:
        raise AuthServiceError(401, f"Token de Google inválido: {exc}") from exc

    issuer = claims.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise AuthServiceError(401, "Token de Google: emisor no es accounts.google.com")

    return claims


def login_con_google(id_token: str, access_token: Optional[str] = None) -> AuthSession:
    """Verifica el id_token de Google localmente y genera una sesión vía Supabase Admin API.

    Bypasea el endpoint /token?grant_type=id_token de Supabase, que requiere
    enviar el rawNonce — imposible con @react-native-google-signin/google-signin
    en iOS porque GoogleSignIn pod >= 8 incluye un nonce automático en el id_token
    y no expone el rawNonce que generó.

    Flujo:
        1. Verificar id_token (firma RS256, issuer, exp) con google-auth.
        2. Crear el usuario en auth.users si no existe (admin/users).
        3. Generar un magic link para ese email (admin/generate_link).
        4. Verificar el hashed_token para obtener access + refresh tokens.
    """
    del access_token  # ya no es necesario; el id_token se valida localmente.

    claims = _verificar_id_token_google(id_token)

    email = (claims.get("email") or "").strip().lower()
    if not email:
        raise AuthServiceError(400, "El token de Google no contiene un email")
    if not claims.get("email_verified"):
        raise AuthServiceError(401, "El email asociado a esta cuenta de Google no está verificado")
    full_name = (claims.get("name") or "").strip()

    # Crear el usuario si no existe; si ya existe, ignorar.
    try:
        _supabase_admin_request(
            "POST",
            "/admin/users",
            json_body={
                "email": email,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name} if full_name else {},
            },
        )
    except AuthServiceError as exc:
        # 422 / 400 ⇒ usuario ya existe; seguimos.
        if exc.status_code not in (400, 422):
            raise

    # Generar magic link para obtener tokens sin password.
    link_data = _supabase_admin_request(
        "POST",
        "/admin/generate_link",
        json_body={"type": "magiclink", "email": email},
    )

    properties = link_data.get("properties")
    if not isinstance(properties, dict):
        properties = link_data
    hashed_token = properties.get("hashed_token") or properties.get("token_hash")
    if not isinstance(hashed_token, str) or not hashed_token:
        raise AuthServiceError(502, "Supabase no devolvió hashed_token del magic link")

    # Intercambiar el hashed_token por una sesión real.
    payload = _supabase_request(
        "POST",
        "/verify",
        json_body={"type": "magiclink", "token_hash": hashed_token},
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


def get_user(access_token: str) -> dict[str, Optional[str]]:
    payload = _supabase_request("GET", "/user", access_token=access_token)
    return _normalizar_usuario(payload)


def logout(access_token: str) -> None:
    _supabase_request("POST", "/logout", access_token=access_token)
