from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from ..config import get_settings
from ..deps_auth import get_current_usuario_uuid
from ..schemas.storage import StorageUploadOut
from ..services.storage_service import StorageServiceError, upload_public_image

router = APIRouter(prefix="/storage", tags=["storage"])

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _extension_for(file: UploadFile) -> str:
    if file.content_type in _ALLOWED_CONTENT_TYPES:
        return _ALLOWED_CONTENT_TYPES[file.content_type]

    filename = (file.filename or "").lower()
    if filename.endswith(".png"):
        return "png"
    if filename.endswith(".webp"):
        return "webp"
    return "jpg"


@router.post("/reportes/foto", response_model=StorageUploadOut, status_code=status.HTTP_201_CREATED)
async def subir_foto_reporte(
    file: UploadFile = File(...),
    usuario_id: UUID = Depends(get_current_usuario_uuid),
):
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no soportado. Usa JPG, PNG o WEBP.",
        )

    settings = get_settings()
    max_bytes = max(settings.MAX_UPLOAD_IMAGE_BYTES, 1)
    raw = await file.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"La imagen supera el máximo permitido ({max_bytes} bytes)",
        )

    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    path = f"{usuario_id}/{timestamp}-{uuid4().hex[:10]}.{_extension_for(file)}"

    try:
        foto_url = upload_public_image(path, raw, content_type)
    except StorageServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from None

    return StorageUploadOut(
        foto_url=foto_url,
        bucket=settings.SUPABASE_STORAGE_BUCKET,
        path=path,
    )
