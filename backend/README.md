# Backend SafeRoutes BQ (FastAPI + Supabase/PostGIS)

Este backend expone una API REST en FastAPI para gestión de salud del servicio, usuarios, reportes y hotspots.

## Estado actual

Implementado y funcionando:

- Conexión a PostgreSQL en Supabase mediante `DATABASE_URL`.
- Modelos ORM con SQLAlchemy para `Usuario`, `Reporte` y `Hotspot`.
- Tipos geoespaciales con PostGIS (`Geometry(POINT, 4326)`).
- Endpoints de salud (`/health`, `/health/db`).
- Endpoints de `reportes`, `usuarios` y lectura de `hotspots`.

Pendiente:

- Autenticación JWT (hoy se usa `usuario_id=1` temporal en creación de reportes).
- Endpoints de autenticación, KPIs y recalculo de hotspots.

## Requisitos

- Python 3.12+
- Proyecto Supabase con extensión PostGIS habilitada
- Variable de entorno `DATABASE_URL`

Ejemplo:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.TUPROYECTO.supabase.co:5432/postgres
```

## Arranque local

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv geoalchemy2
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger: `http://localhost:8000/docs`

## Estructura actual

```text
backend/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── usuario.py
│   │   ├── reporte.py
│   │   └── hotspot.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── usuario.py
│   │   ├── reporte.py
│   │   └── hotspot.py
│   └── routers/
│       ├── __init__.py
│       ├── usuarios.py
│       ├── reportes.py
│       └── hotspots.py
└── README.md
```

## Endpoints implementados

### Health

- `GET /health`
- `GET /health/db`

### Reportes

- `POST /reportes/`
  - Recibe `tipo`, `descripcion`, `foto_url`, `latitud`, `longitud`, `severidad`.
  - Guarda coordenadas con `ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)`.
- `GET /reportes/`
  - Soporta `limit` (1-200) y `offset` (>=0).
- `GET /reportes/{reporte_id}`

### Usuarios

- `POST /usuarios/`
  - Valida email duplicado.
  - Guarda `hashed_password` con SHA-256 (temporal para fase inicial).
- `GET /usuarios/{usuario_id}`

### Hotspots

- `GET /hotspots/`
  - Filtra por `activo` (default `true`).

## Notas de implementación

- `Base.metadata.create_all(bind=engine)` crea tablas faltantes al arrancar.
- Las coordenadas se devuelven como `latitud`/`longitud` usando `ST_Y` y `ST_X`.
- Para producción se recomienda migrar de `create_all` a migraciones (Alembic).
- Para contraseñas en producción se debe reemplazar SHA-256 por `bcrypt`/`argon2`.
