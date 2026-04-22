from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioRead

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.post("/", response_model=UsuarioRead, status_code=201)
async def crear_usuario(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    usuario = Usuario(
        email=data.email,
        nombre=data.nombre,
        hashed_password=data.password,  # TODO: hashear con passlib (semana 4)
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    return usuario


@router.get("/{usuario_id}", response_model=UsuarioRead)
async def obtener_usuario(usuario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario
