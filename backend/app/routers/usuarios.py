import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Usuario
from ..schemas import UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def _hash_password(password: str) -> str:
    # Hash simple para etapa inicial; luego migrar a passlib/bcrypt.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(payload: UsuarioCreate, db: Session = Depends(get_db)):
    existente = db.execute(select(Usuario).where(Usuario.email == payload.email)).scalar_one_or_none()
    if existente:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    usuario = Usuario(
        email=payload.email,
        nombre=payload.nombre,
        hashed_password=_hash_password(payload.password),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/{usuario_id}", response_model=UsuarioOut)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario
