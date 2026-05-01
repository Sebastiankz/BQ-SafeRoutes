# SafeRoutes BQ — Contrato de API v0.1

> **Estado:** Borrador  
> **Firmado por:** Pendiente (Persona A, Persona B, Persona C)  
> **Última actualización:** 2026-04-21

---

## Base URL

```
http://localhost:8000
```

Documentación Swagger automática en: `http://localhost:8000/docs`

---

## Endpoints

### 1. Health Check

| Método | Ruta          | Descripción                                  |
|--------|---------------|----------------------------------------------|
| GET    | `/health`     | Verifica que la API esté activa              |
| GET    | `/health/db`  | Verifica conexión a PostgreSQL (`DATABASE_URL`) |

**Response 200 (`/health`):**
```json
{
  "status": "ok",
  "service": "SafeRoutes BQ API"
}
```

**Response 200 (`/health/db`):**
```json
{
  "status": "ok",
  "database": "reachable"
}
```

**Response 503 (`/health/db`):** BD inalcanzable o credenciales/URL incorrectas (`detail` con mensaje del driver).

---

### 2. Reportes

#### POST `/reportes/`
Crea un nuevo reporte ciudadano.

**Request Body:**
```json
{
  "tipo": "accidente | hueco | arroyo | semaforo_danado | otro",
  "descripcion": "Descripción opcional del incidente",
  "foto_url": "https://...",
  "latitud": 10.9685,
  "longitud": -74.7889,
  "severidad": 3
}
```

**Response 201:**
```json
{
  "id": 1,
  "usuario_id": 1,
  "tipo": "accidente",
  "descripcion": "...",
  "foto_url": "...",
  "latitud": 10.9685,
  "longitud": -74.7889,
  "severidad": 3,
  "validaciones": 0,
  "created_at": "2026-04-21T12:00:00Z"
}
```

#### GET `/reportes/`
Lista reportes con paginación.

**Query Params:**
- `limit` (int, default=50, max=200)
- `offset` (int, default=0)

**Response 200:** Array de reportes.

#### GET `/reportes/{reporte_id}`
Obtiene un reporte por ID.

**Response 200:** Objeto reporte.  
**Response 404:** `{"detail": "Reporte no encontrado"}`

---

### 3. Hotspots

#### GET `/hotspots/`
Lista hotspots activos.

**Query Params:**
- `activo` (bool, default=true)

**Response 200:**
```json
[
  {
    "id": 1,
    "latitud": 10.9685,
    "longitud": -74.7889,
    "radio_metros": 500.0,
    "nivel_riesgo": "alto",
    "num_incidentes": 45,
    "origen": "ipat",
    "activo": true,
    "created_at": "2026-04-21T12:00:00Z",
    "updated_at": "2026-04-21T12:00:00Z"
  }
]
```

---

### 4. Usuarios

#### POST `/usuarios/`
Registra un nuevo usuario.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "nombre": "Juan Pérez",
  "password": "mi_password_seguro"
}
```

**Response 201:** Objeto usuario (sin password).  
**Response 400:** `{"detail": "Email ya registrado"}`

#### GET `/usuarios/{usuario_id}`
Obtiene un usuario por ID.

**Response 200:** Objeto usuario.  
**Response 404:** `{"detail": "Usuario no encontrado"}`

---

## Endpoints planificados (semanas 3-5)

| Método | Ruta                     | Semana | Descripción                          |
|--------|--------------------------|--------|--------------------------------------|
| POST   | `/auth/login`            | 4      | Login con JWT                        |
| POST   | `/auth/google`           | 4      | OAuth Google                         |
| GET    | `/kpis`                  | 4      | KPIs para el dashboard               |
| GET    | `/reportes/recientes`    | 4      | Últimos reportes para el dashboard   |
| POST   | `/reportes/{id}/validar` | 3      | Validación comunitaria de un reporte |
| POST   | `/hotspots/recalcular`   | 3      | Dispara recálculo de DBSCAN          |

---

## Modelos de datos

### Usuario
| Campo            | Tipo         | Descripción                  |
|------------------|--------------|------------------------------|
| id               | int (PK)     | Autoincrementable            |
| email            | varchar(255) | Único                        |
| nombre           | varchar(255) |                              |
| hashed_password  | varchar(255) |                              |
| reputacion       | float        | 0.0 - 5.0, default 1.0      |
| created_at       | timestamptz  |                              |

### Reporte
| Campo        | Tipo              | Descripción                                              |
|--------------|-------------------|----------------------------------------------------------|
| id           | int (PK)          | Autoincrementable                                        |
| usuario_id   | int (FK)          | Referencia a usuarios                                    |
| tipo         | varchar(50)       | accidente, hueco, arroyo, semaforo_danado, otro          |
| descripcion  | text              | Opcional                                                 |
| foto_url     | varchar(500)      | Opcional                                                 |
| ubicacion    | GEOMETRY(POINT)   | SRID 4326                                                |
| severidad    | int               | 1-5                                                      |
| validaciones | int               | Contador de validaciones comunitarias                    |
| created_at   | timestamptz       |                                                          |

### Hotspot
| Campo          | Tipo            | Descripción                           |
|----------------|-----------------|---------------------------------------|
| id             | int (PK)        | Autoincrementable                     |
| ubicacion      | GEOMETRY(POINT) | Centro del cluster, SRID 4326         |
| radio_metros   | float           | Radio del hotspot                     |
| nivel_riesgo   | varchar(20)     | bajo, medio, alto                     |
| num_incidentes | int             | Cantidad de incidentes en el cluster  |
| origen         | varchar(20)     | ipat, ciudadano, mixto                |
| activo         | bool            | default true                          |
| created_at     | timestamptz     |                                       |
| updated_at     | timestamptz     |                                       |

---

## Notas técnicas

- **Base de datos:** PostgreSQL en **Supabase** con extensión **PostGIS**. La cadena de conexión del backend usa la URL que proporciona Supabase (variable de entorno `DATABASE_URL` / equivalente en FastAPI).
- **Ubicaciones:** no se expone geocodificación en la API como fuente de verdad; se trabaja con **coordenadas** (misma convención que el ETL y `etl/data/geocache.json`: objetos con **`lat`** y **`lng`** en decimal). Las direcciones en texto, si existen en CSV u otros orígenes, son **solo referencia/auditoría** frente al punto geográfico almacenado.
- **Coordenadas:** SRID 4326 (WGS 84). En JSON del API se envían **`latitud`/`longitud`** según los endpoints actuales, en línea con **lat/lng** decimal (equivalente semántico a `lat`/`lng` del geocache). En PostGIS: **longitud primero** — `ST_MakePoint(longitud, latitud)` con SRID 4326.
- **Paginación:** Offset-based con `limit` y `offset`.
- **Autenticación:** JWT Bearer token (semana 4). Hasta entonces, se usa `usuario_id=1` hardcodeado.
- **Formato de fechas:** ISO 8601 con timezone.
