import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no está definida en el archivo .env")

# Motor de SQLAlchemy (flujo sincronico para endpoints actuales)
engine = create_engine(DATABASE_URL)

# Sesión por request en FastAPI
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos ORM
Base = declarative_base()


def get_db():
    # Dependency de FastAPI: abre/cierra una sesion por request.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()