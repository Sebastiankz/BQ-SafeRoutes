from __future__ import annotations

from urllib.parse import quote

import httpx

from ..config import get_settings


class StorageServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _settings():
    return get_settings()


def _supabase_base_url() -> str:
    url = _settings().SUPABASE_URL.strip().rstrip("/")
    if not url:
        raise StorageServiceError(500, "SUPABASE_URL no está configurada en backend/.env")
    return url


def _service_role_key() -> str:
    key = _settings().SUPABASE_SERVICE_ROLE_KEY.strip()
    if not key:
        raise StorageServiceError(
            500,
            "SUPABASE_SERVICE_ROLE_KEY no está configurada en backend/.env",
        )
    return key


def upload_public_image(path: str, image_bytes: bytes, content_type: str) -> str:
    settings = _settings()
    bucket = settings.SUPABASE_STORAGE_BUCKET.strip()
    if not bucket:
        raise StorageServiceError(500, "SUPABASE_STORAGE_BUCKET no está configurado")

    object_path = quote(path, safe="/")
    upload_url = f"{_supabase_base_url()}/storage/v1/object/{bucket}/{object_path}"

    headers = {
        "apikey": _service_role_key(),
        "Authorization": f"Bearer {_service_role_key()}",
        "Content-Type": content_type,
        "x-upsert": "false",
    }

    try:
        response = httpx.post(upload_url, headers=headers, content=image_bytes, timeout=20.0)
    except httpx.HTTPError as exc:
        raise StorageServiceError(503, "No se pudo subir la imagen al almacenamiento") from exc

    if response.status_code >= 400:
        detail = "No se pudo subir la imagen"
        if response.content:
            try:
                payload = response.json()
                if isinstance(payload, dict):
                    detail = str(payload.get("message") or payload.get("error") or detail)
            except ValueError:
                detail = response.text or detail
        raise StorageServiceError(response.status_code, detail)

    return f"{_supabase_base_url()}/storage/v1/object/public/{bucket}/{object_path}"
