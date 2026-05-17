# SafeRoutes BQ

Plataforma integral de **colaboración ciudadana y análisis de seguridad vial** para Barranquilla, Colombia. Permite a los ciudadanos reportar incidentes en tiempo real, analiza datos históricos de accidentalidad mediante machine learning y visualiza zonas de peligro (hotspots) en mapas interactivos tanto en una app móvil como en un dashboard web administrativo.

---

## Tabla de contenido

1. [Descripción general](#1-descripción-general)
2. [Arquitectura](#2-arquitectura)
3. [Tecnologías utilizadas](#3-tecnologías-utilizadas)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Flujos principales](#5-flujos-principales)
6. [Cómo correr el proyecto localmente](#6-cómo-correr-el-proyecto-localmente)
7. [Decisiones técnicas destacadas](#7-decisiones-técnicas-destacadas)
8. [Equipo](#8-equipo)
9. [Documentación adicional](#9-documentación-adicional)

---

## 1. Descripción general

SafeRoutes BQ integra tres grandes subsistemas:

| Subsistema                          | Propósito                                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App móvil** (React Native / Expo) | Los ciudadanos visualizan el mapa con hotspots y reportes, crean nuevos reportes geolocalizados y votan la vigencia de reportes existentes.              |
| **Dashboard web** (React / Vite)    | Los administradores y analistas consultan KPIs de accidentalidad histórica, tablas de reportes ciudadanos en tiempo real y el mapa de calor de hotspots. |
| **Backend API** (FastAPI)           | Orquesta la autenticación, la gestión de reportes y hotspots, la geocodificación inversa y el algoritmo de detección de zonas críticas.                  |

Los datos de accidentalidad histórica provienen del IPAT (Instituto de Tránsito de Barranquilla) y son procesados mediante un pipeline ETL que los geolocaliza y carga en la base de datos PostgreSQL/PostGIS alojada en Supabase.

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                 │
│                                                                 │
│   ┌─────────────────┐          ┌──────────────────────────┐    │
│   │   App Móvil      │          │    Dashboard Web          │    │
│   │ React Native     │          │    React + Vite           │    │
│   │ Expo SDK 54      │          │    Tailwind + Recharts    │    │
│   │ Google Maps SDK  │          │    @react-google-maps     │    │
│   └────────┬────────┘          └─────────────┬────────────┘    │
│            │  REST / JWT                      │  REST / Cookie   │
└────────────┼──────────────────────────────────┼─────────────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                            │
│                                                                 │
│  /auth          /reportes        /hotspots    /storage          │
│  Supabase Auth  CRUD + votos     DBSCAN ML    Supabase Storage  │
│                 Geocodificación  Regenerar                      │
│                 inversa (GMaps)                                 │
│                                                                 │
│  Middlewares: CORS · Rate Limiting (slowapi) · JWT validation   │
└────────────────────────────┬────────────────────────────────────┘
                             │  SQLAlchemy + GeoAlchemy2
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         PostgreSQL + PostGIS  (Supabase)                        │
│                                                                 │
│  Tablas: reportes · hotspots · incidentes_historicos            │
│  Índices GIST sobre columnas Geometry(POINT, 4326)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
             ┌───────────────┘
             │
             ▼
┌────────────────────────────┐
│  ETL (Python + pandas)     │
│                            │
│  CSV IPAT → normalizar     │
│  direcciones → geocodifi-  │
│  car (Google Maps) →       │
│  insertar incidentes_      │
│  historicos                │
└────────────────────────────┘
```

### Comunicación entre módulos

- **App móvil → Backend**: HTTP/REST con `fetch`. El JWT de Supabase se envía como `Authorization: Bearer <token>`.
- **Dashboard web → Backend**: HTTP/REST para reportes y hotspots. La autenticación del admin usa cookie HttpOnly (`sr_refresh_token`) para el refresh token y Bearer en headers para el access token.
- **Dashboard web → Supabase JS**: Suscripción Realtime para recibir actualizaciones de reportes ciudadanos en vivo (canal `public:reportes`).
- **Dashboard web → CSV estático**: Los datos históricos de accidentalidad se cargan desde `public/accidentes.csv` directamente en el navegador con PapaParse (sin servidor).
- **Backend → Supabase Auth**: El backend actúa como proxy de autenticación realizando peticiones HTTP a la API `auth/v1` de Supabase.
- **Backend → Google Maps API**: Geocodificación inversa para obtener la dirección legible de un reporte.
- **ETL → Google Maps API**: Geocodificación directa para convertir las direcciones del CSV IPAT en coordenadas GPS.

---

## 3. Tecnologías utilizadas

### Backend

| Tecnología               | Versión  | Por qué                                                                                                                                                       |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FastAPI**              | ≥ 0.115  | Framework asíncrono de alto rendimiento para Python; validación automática con Pydantic; generación de Swagger/OpenAPI sin configuración extra.               |
| **SQLAlchemy**           | ≥ 2.0    | ORM maduro con soporte completo para Core (queries expresivas) y tipos personalizados como geometrías.                                                        |
| **GeoAlchemy2**          | ≥ 0.14   | Extiende SQLAlchemy con el tipo `Geometry` y funciones espaciales PostGIS (`ST_MakePoint`, `ST_Y`, `ST_X`).                                                   |
| **PostgreSQL + PostGIS** | 16 + 3.4 | Base de datos relacional con extensión geoespacial; índices GIST para consultas espaciales eficientes.                                                        |
| **Supabase**             | —        | BaaS que provee PostgreSQL gestionado, Auth (JWT), Storage de archivos y Realtime. Elimina la necesidad de gestionar infraestructura de base de datos propia. |
| **PyJWT + PyJWKClient**  | ≥ 2.8    | Validación de tokens HS256 (secret compartido) y RS256/ES256 (JWKS asimétrico) emitidos por Supabase Auth.                                                    |
| **scikit-learn**         | 1.5.0    | Algoritmo DBSCAN para clustering geoespacial de incidentes históricos.                                                                                        |
| **slowapi**              | ≥ 0.1.9  | Rate limiting por IP (60 req/min por defecto) para proteger la API de abuso.                                                                                  |
| **googlemaps**           | ≥ 4.10   | SDK oficial de Python para geocodificación inversa (coordenadas → dirección).                                                                                 |
| **httpx**                | —        | Cliente HTTP asíncrono usado por el servicio de auth para comunicarse con Supabase Auth API.                                                                  |

### App móvil

| Tecnología                   | Versión | Por qué                                                                                                                                       |
| ---------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **React Native**             | 0.81.5  | Framework multiplataforma iOS/Android con una única base de código TypeScript.                                                                |
| **Expo SDK**                 | 54      | Abstrae la configuración nativa; permite usar `expo-location`, `expo-image-picker`, `expo-file-system` sin necesidad de código nativo manual. |
| **react-native-maps**        | 1.20.1  | Integración con Google Maps SDK nativo; soporta `<Heatmap>` para visualizar densidad de hotspots.                                             |
| **@supabase/supabase-js**    | ≥ 2.105 | Cliente oficial de Supabase para autenticación y, opcionalmente, suscripciones Realtime.                                                      |
| **@react-navigation/drawer** | ≥ 7     | Navegación lateral tipo cajón para acceder a las distintas pantallas.                                                                         |
| **expo-location**            | ~19     | Acceso al GPS del dispositivo para geolocalizar reportes y centrar el mapa.                                                                   |
| **TypeScript**               | ~5.9    | Tipado estático para mayor robustez y mantenibilidad.                                                                                         |

### Dashboard web

| Tecnología                 | Versión | Por qué                                                                                         |
| -------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| **React**                  | 19      | Framework de UI declarativo basado en componentes.                                              |
| **Vite**                   | 8       | Build tool ultrarrápido con HMR para desarrollo; reemplaza CRA con menor overhead.              |
| **Tailwind CSS**           | v4      | Utilidades CSS atómicas; integrado como plugin de Vite sin archivo de configuración extra.      |
| **@react-google-maps/api** | ≥ 2.20  | Wrapper de React sobre Google Maps JS API; habilita `HeatmapLayer` (librería `visualization`).  |
| **Recharts**               | 3       | Gráficas de React (AreaChart, BarChart, PieChart) basadas en SVG; API declarativa y responsiva. |
| **PapaParse**              | 5       | Parsea el CSV de accidentalidad histórica directamente en el navegador, sin backend.            |
| **HeroUI**                 | v3      | Componentes UI accesibles (Select, ListBox) con soporte nativo a Tailwind v4.                   |
| **@supabase/supabase-js**  | ≥ 2.105 | Suscripción Realtime al canal de reportes ciudadanos para actualizar la tabla sin polling.      |

### ETL / Datos

| Tecnología                             | Por qué                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **pandas**                             | Lectura, limpieza y transformación del CSV IPAT (~27.500 filas).                                         |
| **googlemaps SDK**                     | Geocodificación directa de las direcciones del IPAT hacia coordenadas GPS.                               |
| **tqdm**                               | Barra de progreso para monitorear el proceso de geocodificación (lento por límites de la API).           |
| **Cache JSON local** (`geocache.json`) | Evita re-geocodificar direcciones ya procesadas, reduciendo el coste de la API y el tiempo de ejecución. |

### Infraestructura local

| Tecnología         | Por qué                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| **Docker Compose** | Levanta PostgreSQL+PostGIS y Redis con un solo comando para desarrollo local. |
| **Redis**          | Caché opcional para sesiones o colas de tareas futuras.                       |

---

## 4. Estructura de carpetas

```
BQ-SafeRoutes/
│
├── backend/                        # API REST en FastAPI
│   ├── app/
│   │   ├── main.py                 # Punto de entrada: registra routers, CORS, rate limiting
│   │   ├── config.py               # Configuración via pydantic-settings (.env)
│   │   ├── database.py             # Engine SQLAlchemy y sesión de BD
│   │   ├── deps_auth.py            # Dependencias FastAPI para extraer usuario/admin del JWT
│   │   ├── supabase_jwt.py         # Validación de JWT Supabase (HS256 y RS256/JWKS)
│   │   ├── models/
│   │   │   ├── reporte.py          # ORM: tabla reportes (geom POINT, estado, validaciones)
│   │   │   ├── hotspot.py          # ORM: tabla hotspots (geom POINT, nivel_riesgo, year/month)
│   │   │   └── incidente_historico.py  # ORM: tabla incidentes_historicos (datos IPAT)
│   │   ├── schemas/
│   │   │   ├── reporte.py          # Pydantic: ReporteCreate, ReporteOut, VigenciaIn/Out
│   │   │   ├── hotspot.py          # Pydantic: HotspotOut
│   │   │   └── auth.py             # Pydantic: LoginIn, RegisterIn, AuthResponse, etc.
│   │   ├── routers/
│   │   │   ├── auth.py             # POST /auth/register, /login, /refresh, /logout
│   │   │   ├── reportes.py         # POST/GET /reportes/, vigencia, confirmación, estado
│   │   │   ├── hotspots.py         # GET /hotspots/, POST /hotspots/regenerate[-all]
│   │   │   ├── incidentes_historicos.py  # GET /incidentes/ (consulta datos IPAT)
│   │   │   └── storage.py          # POST /storage/reportes/foto (upload a Supabase Storage)
│   │   └── services/
│   │       ├── auth_service.py     # Proxy HTTP a Supabase Auth API (/signup, /token, etc.)
│   │       ├── ml_hotspots.py      # DBSCAN geoespacial + fusión de clusters + escritura en BD
│   │       ├── reporte_service.py  # Lógica de negocio: deduplicación, confirmación, vigencia
│   │       └── storage_service.py  # Upload de imágenes a Supabase Storage
│   ├── scripts/
│   │   └── migrate_reportes_fk_auth_users.sql  # Migración de FK a auth.users de Supabase
│   └── requirements.txt
│
├── mobile/                         # App móvil Expo / React Native
│   ├── app.config.js               # Configuración Expo (nombres, permisos, Google Maps API key)
│   ├── App.tsx                     # Punto de entrada React Native
│   ├── screens/
│   │   ├── MapScreen.tsx           # Pantalla principal: mapa con heatmap + marcadores + filtros
│   │   ├── MisReportesScreen.tsx   # Lista de reportes del usuario autenticado
│   │   ├── AjustesScreen.tsx       # Configuración de la app
│   │   └── MiCuentaScreen.tsx      # Perfil del usuario
│   ├── components/
│   │   ├── NuevoReporteModal.tsx   # Modal para crear un nuevo reporte (tipo, foto, severidad)
│   │   ├── FiltroHotspotsSheet.tsx # Bottom sheet para filtrar hotspots por año/mes
│   │   └── VigenciaModal.tsx       # Modal para votar si un reporte sigue vigente
│   ├── services/
│   │   ├── hotspots.ts             # listarHotspots() → GET /hotspots/
│   │   ├── reportes.ts             # listarReportes(), crearReporte(), responderVigencia()
│   │   ├── auth.ts                 # login, register, logout via Supabase JS
│   │   ├── storage.ts              # upload de foto al endpoint /storage/reportes/foto
│   │   └── config.ts               # Lee EXPO_PUBLIC_API_URL
│   ├── context/
│   │   └── AuthContext.tsx         # Proveedor de sesión global (Supabase onAuthStateChange)
│   └── navigation/
│       └── DrawerRoot.tsx          # Navegador Drawer con todas las pantallas
│
├── web-dashboard/                  # Dashboard administrativo React + Vite
│   ├── public/
│   │   └── accidentes.csv          # Dataset IPAT (~27.500 filas, 2018-2025) — cargado en navegador
│   ├── src/
│   │   ├── App.jsx                 # Raíz: renderiza Login o Dashboard según autenticación
│   │   ├── main.jsx                # Entry point (importa global.css con Tailwind v4)
│   │   ├── api/
│   │   │   ├── accidentes.js       # fetch + PapaParse del CSV estático
│   │   │   ├── reportes.js         # GET/PATCH /reportes/ con auth Bearer
│   │   │   ├── auth.js             # login/logout hacia el backend FastAPI
│   │   │   └── client.js           # fetch base con interceptor de token
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Estado de sesión admin (cookie + JWT)
│   │   ├── lib/
│   │   │   └── supabase.js         # Cliente Supabase JS para Realtime
│   │   └── pages/Dashboard/
│   │       ├── Dashboard.jsx       # Contenedor con estado global de filtros
│   │       ├── Header.jsx          # Navbar con filtros de año/mes/gravedad y toggle dark
│   │       ├── KPICard.jsx         # Tarjeta de KPI (total, víctimas, promedio mensual)
│   │       ├── Charts.jsx          # 5 gráficas Recharts (hora, día, gravedad, tipología, vías)
│   │       ├── MapaGoogleMaps.jsx  # Mapa Google Maps con HeatmapLayer de hotspots + marcadores
│   │       ├── useDashboardData.js # Custom hook: carga CSV, filtra y calcula KPIs + series
│   │       ├── useReportesLive.js  # Custom hook: suscripción Realtime a reportes ciudadanos
│   │       └── views/
│   │           ├── AnaliticaView.jsx  # Vista de KPIs y gráficas de accidentalidad histórica
│   │           ├── MapaView.jsx       # Vista del mapa de calor
│   │           └── ReportesView.jsx   # Vista de tabla de reportes ciudadanos con gestión de estado
│   └── CONTEXT.md                  # Documentación interna del dashboard
│
├── etl/                            # Pipeline de carga de datos históricos
│   ├── cargar_ipat.py              # Script principal: lee CSV IPAT, geocodifica y carga en BD
│   ├── requirements.txt            # Dependencias ETL (pandas, googlemaps, tqdm, etc.)
│   └── data/
│       ├── Accidentalidad_en_Barranquilla_20260430.csv  # Fuente de datos IPAT
│       ├── geocache.json           # Cache de geocodificación (dirección → lat/lng)
│       └── geocoding_cache.json    # Cache secundario de geocodificación
│
├── db/
│   └── init.sql                    # SQL de inicialización para Docker (tablas + índices GIST)
│
├── docker-compose.yml              # PostgreSQL+PostGIS + Redis para desarrollo local
├── API.md                          # Contrato completo de la API (todos los endpoints)
└── Proyecto_Final.md               # Documentación académica del proyecto
```

---

## 5. Flujos principales

### 5.1 Recolección de reportes ciudadanos

```
[Usuario en app móvil]
        │
        │ 1. Abre NuevoReporteModal
        │    - Selecciona tipo (accidente / hueco / arroyo / semáforo / otro)
        │    - Opcional: toma o adjunta una foto
        │    - Asigna severidad (1-5)
        │    - La ubicación se obtiene del GPS del dispositivo (expo-location)
        │
        │ 2. Si hay foto:
        │    POST /storage/reportes/foto  (multipart/form-data)
        │    ← El backend valida tipo MIME (JPG/PNG/WEBP), sube a Supabase Storage
        │    ← Retorna { foto_url }
        │
        │ 3. POST /reportes/
        │    { tipo, descripcion, foto_url, latitud, longitud, severidad }
        │    Authorization: Bearer <JWT supabase>
        │
[Backend FastAPI - router reportes.py]
        │
        │ 4. Verifica JWT (supabase_jwt.py → PyJWT/JWKS)
        │
        │ 5. buscar_reporte_padre():
        │    Busca en BD un reporte del mismo tipo, a menos de 80 m
        │    y creado recientemente
        │
        │ 6a. Si hay padre y es de otro usuario:
        │     - Crea el reporte como hijo (reporte_padre_id = padre.id)
        │     - registrar_confirmacion(): incrementa padre.validaciones
        │     - Si validaciones ≥ umbral → padre.estado = 'confirmado', padre.activo = True
        │
        │ 6b. Si no hay padre:
        │     - Crea el reporte con estado='pendiente', activo=False
        │
        │ 7. reverse_geocode() → Google Maps API → guarda direccion textual
        │
        │ 8. Commit en PostgreSQL (columna ubicacion como GEOMETRY POINT SRID 4326)
        │
        └─→ [Base de datos PostgreSQL/PostGIS]
                 │
                 └─→ [Dashboard web - useReportesLive.js]
                          Supabase Realtime notifica al dashboard
                          → tabla de reportes se actualiza en tiempo real
```

### 5.2 Detección de hotspots (ML pipeline)

```
[Datos históricos IPAT]
        │
        │ 1. ETL (etl/cargar_ipat.py):
        │    - Lee CSV (~27.500 filas de accidentalidad 2018-2025)
        │    - normalize_address(): estandariza abreviaturas, elimina ruido
        │    - Geocodifica con Google Maps SDK (con cache local JSON)
        │    - Filtra por BBOX de Barranquilla
        │    - INSERT INTO incidentes_historicos (fecha_hora, gravedad, clase_accidente,
        │      cant_heridos, cant_muertos, ubicacion GEOMETRY POINT)
        │
        ▼
[Base de datos: tabla incidentes_historicos]
        │
        │ 2. POST /hotspots/regenerate (o /hotspots/regenerate-all)
        │    Parámetros opcionales: eps_meters, min_samples, year, month
        │
[Backend - ml_hotspots.generate_hotspots()]
        │
        │ 3. Consulta coordenadas:
        │    SELECT ST_Y(ubicacion) AS lat, ST_X(ubicacion) AS lng
        │    FROM incidentes_historicos [WHERE year/month]
        │
        │ 4. Convierte a radianes y aplica DBSCAN:
        │    - metric='haversine' + algorithm='ball_tree'
        │    - eps = eps_meters / EARTH_RADIUS (por defecto 80 m)
        │    - min_samples = 5 (mínimo de incidentes para formar un cluster)
        │    - Puntos etiquetados como -1 son ruido (descartados)
        │
        │ 5. _merge_overlapping():
        │    Fusiona iterativamente clusters cuyos centroides estén
        │    a menos de merge_distance_m (default: eps×2 = 160 m)
        │
        │ 6. Para cada cluster resultante:
        │    - Centroide = media geográfica de los puntos
        │    - radio_metros = distancia máxima desde centroide
        │    - num_incidentes = cantidad de puntos
        │    - nivel_riesgo = 'Alto' (≥15), 'Medio' (≥8), 'Bajo' (resto)
        │
        │ 7. DELETE hotspots anteriores del mismo origen/periodo
        │    INSERT nuevos hotspots como GEOMETRY POINT SRID 4326
        │
        └─→ [Base de datos: tabla hotspots]
```

### 5.3 Visualización en el mapa

```
[App móvil - MapScreen.tsx]
        │
        │ 1. Al montar: listarHotspots(filter) → GET /hotspots/?activo=true[&year&month&global]
        │    Retorna array de { latitud, longitud, radio_metros, nivel_riesgo, num_incidentes }
        │
        │ 2. Los hotspots se muestran como <Heatmap> de react-native-maps:
        │    - Cada punto tiene weight = num_incidentes (normalizado)
        │    - Gradiente azul→verde→amarillo→salmón→rojo
        │    - HEATMAP_RADIUS = 70 (unidades de densidad nativa)
        │
        │ 3. Los reportes ciudadanos activos se muestran como <Marker>
        │    con color por tipo (accidente=rojo, hueco=amarillo, arroyo=azul, etc.)
        │
        │ 4. El usuario puede abrir FiltroHotspotsSheet para cambiar entre:
        │    - "Histórico global" (todos los años)
        │    - Filtrar por año específico
        │    - Filtrar por año + mes específico
        │
        │ 5. Proximidad: si el usuario está a < 80 m de un hotspot 'Alto' o 'Medio',
        │    se muestra una alerta visual automática
        │
[Dashboard web - MapaGoogleMaps.jsx]
        │
        │ 1. useJsApiLoader carga Google Maps JS API + librería 'visualization'
        │
        │ 2. Consulta GET /hotspots/ con los mismos parámetros de filtro que la app
        │
        │ 3. Construye array de LatLng con peso = num_incidentes para HeatmapLayer
        │    - HEATMAP_RADIUS = 35 px (equivalente visual a zoom 13)
        │    - HEATMAP_OPACITY = 0.85
        │    - Mismo gradiente que la app móvil (6 colores, primer color transparente)
        │
        │ 4. Los reportes ciudadanos se muestran como Markers SVG con pin coloreado
        │    - InfoWindow al hacer clic: tipo, severidad, dirección, fecha
```

### 5.4 Analítica del dashboard web

```
[Dashboard web - useDashboardData.js]
        │
        │ 1. Carga accidentes.csv con PapaParse (sin petición al servidor)
        │    ~27.500 registros de accidentalidad histórica 2018-2025
        │
        │ 2. Filtros del Header: año (2022-2025 o 'Todos'), mes, gravedad
        │
        │ 3. calcularTodo() produce:
        │    - KPIs: total de accidentes, víctimas (heridos + muertos), promedio mensual
        │    - Tendencia vs año anterior (variación porcentual)
        │    - hourlyData: distribución por hora (normalizada 0-100)
        │    - dailyData: distribución por día de la semana
        │    - gravedadData: desglose Solo Daños / Con Heridos / Con Muertos
        │    - tipologiaData: tipos de accidente (choque, atropello, volcamiento, etc.)
        │    - top5Vias: las 5 vías con más accidentes
        │
        │ 4. Todas las gráficas (Recharts) se re-renderizan al cambiar los filtros
```

---

## 6. Cómo correr el proyecto localmente

### Requisitos previos

- **Python 3.12+**
- **Node.js 20+** y npm
- **Docker Desktop** (opcional, para base de datos local)
- Cuenta en **Supabase** (o PostgreSQL+PostGIS local)
- **Google Maps API Key** (para geocodificación y mapa)

### 6.1 Base de datos (opción Docker — recomendada para desarrollo)

```powershell
# Desde la raíz del repositorio
docker compose up db redis
```

PostgreSQL queda disponible en `localhost:5432`. El script `db/init.sql` crea las tablas e índices automáticamente.

### 6.2 Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crea el archivo `backend/.env` con las siguientes variables:

```env
# Conexión a la base de datos (Supabase o Docker local)
DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_db

# Supabase
SUPABASE_URL=https://TUPROYECTO.supabase.co
SUPABASE_JWT_SECRET=tu_jwt_secret_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_STORAGE_BUCKET=reportes-fotos

# Google Maps (geocodificación inversa en reportes)
GOOGLE_MAPS_API_KEY=tu_api_key

# CORS (permite el dashboard web y la app en desarrollo)
CORS_ORIGINS=http://localhost:5173,http://localhost:19006
```

Inicia el servidor:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger disponible en: `http://localhost:8000/docs`

### 6.3 ETL — Carga de datos históricos IPAT

> Solo necesario la primera vez o cuando haya un nuevo dataset.

```powershell
cd ..   # raíz del repositorio
python -m venv .venv-etl
.\.venv-etl\Scripts\Activate.ps1
pip install -r etl/requirements.txt

# Ejecutar el ETL (geocodifica y carga en la BD)
python etl/cargar_ipat.py --csv etl/data/Accidentalidad_en_Barranquilla_20260430.csv
```

Tras cargar los datos, regenerar hotspots:

```powershell
# Con el backend corriendo:
curl -X POST "http://localhost:8000/hotspots/regenerate-all"
```

### 6.4 App móvil (Expo)

```powershell
cd mobile
npm install
```

Crea `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000
EXPO_PUBLIC_GOOGLE_MAPS_KEY=tu_api_key
EXPO_PUBLIC_SUPABASE_URL=https://TUPROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

```powershell
npx expo start
# Escanea el QR con Expo Go (Android/iOS) o presiona 'a' para Android emulator
```

### 6.5 Dashboard web

```powershell
cd web-dashboard
npm install
```

Crea `web-dashboard/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=tu_api_key
VITE_SUPABASE_URL=https://TUPROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

```powershell
npm run dev
# Dashboard disponible en http://localhost:5173
```

---

## 7. Decisiones técnicas destacadas

### 7.1 DBSCAN con métrica Haversine para detección de hotspots

Se eligió **DBSCAN** (Density-Based Spatial Clustering of Applications with Noise) en lugar de K-Means por dos razones fundamentales:

1. **No requiere definir el número de clusters a priori**: el número de zonas críticas es desconocido y variable.
2. **Maneja ruido geográfico**: los puntos aislados (accidentes en intersecciones únicas sin patrón) se etiquetan como `-1` y se descartan sin distorsionar los clusters.

La métrica **Haversine** calcula distancias en la superficie esférica de la Tierra, lo que es esencial para datos geoespaciales. Al convertir las coordenadas a radianes y expresar `eps` como `distancia_metros / RADIO_TIERRA`, el algoritmo trabaja directamente en metros, independientemente de la latitud.

Parámetros por defecto (ajustables por endpoint):

- `eps_meters = 80`: radio en metros para considerar dos incidentes como vecinos.
- `min_samples = 5`: mínimo de incidentes para formar un cluster.

### 7.2 Fusión de clusters solapados

Después de DBSCAN, se aplica un paso adicional de **fusión iterativa**: si dos clusters quedan con centroides a menos de `merge_distance_m` (por defecto `eps × 2 = 160 m`), se fusionan en uno solo. Esto evita la fragmentación artificial de zonas críticas reales que quedaron divididas por el eps.

### 7.3 Arquitectura de validación de reportes

Los reportes usan un **patrón de deduplicación y confirmación**:

- El primer reporte de un tipo en un radio de 80 m queda como "padre" en estado `pendiente`.
- Los reportes posteriores del mismo tipo y zona se convierten en "hijos" y disparan una confirmación del padre.
- Al acumular suficientes confirmaciones de usuarios distintos, el reporte padre pasa a `confirmado` y se activa (`activo=True`) para ser visible en el mapa.
- Esto filtra el ruido y la desinformación sin moderación manual.

### 7.4 Gradiente de heatmap consistente entre plataformas

El mismo gradiente de colores (`azul → verde → amarillo → salmón → rojo`) se define tanto en `MapScreen.tsx` (mobile) como en `MapaGoogleMaps.jsx` (web), garantizando coherencia visual. La única diferencia: en Google Maps JS API el primer color debe ser `rgba(0,0,0,0)` (transparente) para evitar que pinte de azul sólido áreas sin datos.

### 7.5 Datos históricos sin servidor (CSV en navegador)

El dataset de accidentalidad histórica (`accidentes.csv`, ~27.500 filas) se sirve como archivo estático y se parsea en el navegador con **PapaParse**. Esto elimina la necesidad de un endpoint de analítica y de almacenar los datos en la base de datos principal, reduciendo la carga del backend y simplificando el despliegue del dashboard.

### 7.6 Autenticación JWT compatible con HS256 y RS256

La función `decodificar_usuario_uuid_supabase()` detecta automáticamente el algoritmo del token inspeccionando el header JWT. Si es `HS256`, verifica con el `SUPABASE_JWT_SECRET` compartido. Si es `RS256` o similar, descarga las claves públicas del endpoint JWKS de Supabase (`/auth/v1/.well-known/jwks.json`). Esto hace el backend compatible tanto con proyectos Supabase legacy como con los que usan claves asimétricas.

### 7.7 Datos geoespaciales con PostGIS

Todas las coordenadas (reportes, hotspots, incidentes históricos) se almacenan como `GEOMETRY(POINT, 4326)` — el estándar EPSG:4326 (WGS 84, el mismo que usa GPS). Los índices **GIST** sobre estas columnas aceleran las consultas espaciales como `ST_DWithin` (puntos dentro de un radio) y los joins por proximidad. SQLAlchemy accede a las funciones espaciales a través de **GeoAlchemy2**, que mapea `ST_MakePoint`, `ST_Y`, `ST_X`, etc. de forma nativa.

### 7.8 Cache de geocodificación en ETL

Para evitar llamadas repetidas a la Google Maps Geocoding API (que tiene coste y límites de tasa), el ETL mantiene un archivo `geocache.json` local que persiste el mapeo `dirección → coordenadas`. En ejecuciones sucesivas, solo se geocodifican las direcciones nuevas.

---

## 8. Equipo

| Rol                      | Responsabilidades                                          |
| ------------------------ | ---------------------------------------------------------- |
| **Frontend móvil + web** | React Native, React.js, UX/UI, integración de mapas        |
| **Backend + datos**      | FastAPI, PostgreSQL+PostGIS, Supabase, autenticación       |
| **ML + integraciones**   | scikit-learn, ETL IPAT, geocodificación, análisis de datos |

---

## 9. Documentación adicional

- [Contrato de la API (endpoints detallados)](./API.md)
- [README del backend](./backend/README.md)
- [Contexto del dashboard web](./web-dashboard/CONTEXT.md)
- Swagger interactivo (con el backend corriendo): `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
