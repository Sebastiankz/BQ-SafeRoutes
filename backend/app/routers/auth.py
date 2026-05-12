from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..config import get_settings
from ..schemas.auth import (
    AuthResponse,
    LoginIn,
    LogoutIn,
    LogoutOut,
    RefreshIn,
    RegisterIn,
    SessionMode,
    UsuarioSesion,
)
from ..services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


def _auth_cookie_kwargs() -> dict[str, object]:
    settings = get_settings()
    kwargs: dict[str, object] = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "path": "/",
        "max_age": settings.AUTH_REFRESH_COOKIE_MAX_AGE,
    }
    domain = settings.AUTH_COOKIE_DOMAIN.strip()
    if domain:
        kwargs["domain"] = domain
    return kwargs


def _set_refresh_cookie(response: Response, refresh_token: str | None) -> None:
    if not refresh_token:
        raise HTTPException(status_code=502, detail="No se recibió refresh token del proveedor de auth")
    response.set_cookie(
        key=get_settings().AUTH_COOKIE_NAME,
        value=refresh_token,
        **_auth_cookie_kwargs(),
    )


def _clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    delete_kwargs: dict[str, object] = {"path": "/"}
    domain = settings.AUTH_COOKIE_DOMAIN.strip()
    if domain:
        delete_kwargs["domain"] = domain
    response.delete_cookie(settings.AUTH_COOKIE_NAME, **delete_kwargs)


def _to_auth_response(session: auth_service.AuthSession, mode: SessionMode) -> AuthResponse:
    include_refresh = mode == "body"
    return AuthResponse(
        access_token=session.access_token,
        token_type="bearer",
        expires_in=session.expires_in,
        refresh_token=session.refresh_token if include_refresh else None,
        usuario=UsuarioSesion(**session.usuario),
    )


def _raise_service_error(exc: auth_service.AuthServiceError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from None


def _extraer_access_token(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    if creds is None or (creds.scheme or "").lower() != "bearer" or not creds.credentials.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere Authorization: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return creds.credentials.strip()


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginIn, response: Response):
    try:
        session = auth_service.login(payload.email.strip(), payload.password)
    except auth_service.AuthServiceError as exc:
        _raise_service_error(exc)

    if payload.session_mode == "cookie":
        _set_refresh_cookie(response, session.refresh_token)

    return _to_auth_response(session, payload.session_mode)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, response: Response):
    try:
        session = auth_service.register(
            payload.email.strip(),
            payload.password,
            payload.nombre.strip(),
        )
    except auth_service.AuthServiceError as exc:
        _raise_service_error(exc)

    if payload.session_mode == "cookie":
        _set_refresh_cookie(response, session.refresh_token)

    return _to_auth_response(session, payload.session_mode)


@router.post("/refresh", response_model=AuthResponse)
def refresh(payload: RefreshIn, request: Request, response: Response):
    refresh_token = payload.refresh_token
    if payload.session_mode == "cookie":
        refresh_token = request.cookies.get(get_settings().AUTH_COOKIE_NAME)

    if not refresh_token:
        raise HTTPException(status_code=401, detail="No hay refresh token disponible")

    try:
        session = auth_service.refresh(refresh_token)
    except auth_service.AuthServiceError as exc:
        _raise_service_error(exc)

    if payload.session_mode == "cookie":
        _set_refresh_cookie(response, session.refresh_token)

    return _to_auth_response(session, payload.session_mode)


@router.get("/me", response_model=UsuarioSesion)
def me(access_token: str = Depends(_extraer_access_token)):
    try:
        user = auth_service.get_user(access_token)
    except auth_service.AuthServiceError as exc:
        _raise_service_error(exc)

    return UsuarioSesion(**user)


@router.post("/logout", response_model=LogoutOut)
def logout(
    response: Response,
    payload: LogoutIn = LogoutIn(),
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
):
    access_token = None
    if creds is not None and (creds.scheme or "").lower() == "bearer" and creds.credentials.strip():
        access_token = creds.credentials.strip()

    if access_token:
        try:
            auth_service.logout(access_token)
        except auth_service.AuthServiceError as exc:
            if exc.status_code >= 500:
                _raise_service_error(exc)

    if payload.session_mode == "cookie":
        _clear_refresh_cookie(response)

    return LogoutOut(ok=True)
