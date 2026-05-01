# SafeRoutes BQ

Plataforma Web y Móvil de Colaboración Ciudadana para la Gestión Preventiva y Detección de Puntos Críticos de Seguridad Vial en Barranquilla.

## Stack tecnológico

| Componente    | Tecnología                       |
| ------------- | -------------------------------- |
| Backend API   | FastAPI (Python 3.12), venv       |
| Base de datos | PostgreSQL + PostGIS (p. ej. Supabase) |
| Cache         | Redis (opcional en local)        |
| App móvil     | React Native + Expo              |
| Dashboard web | React (Vite) en `web-dashboard/` |
| ML            | scikit-learn (DBSCAN), GeoPandas |
| Contenedores  | Opcional: solo `db` + `redis` vía docker-compose |

## Estructura del proyecto

```
bq-saferoutes/
├── backend/              # FastAPI (venv local — ver backend/README.md)
│   ├── app/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── database.py
│   │   └── main.py
│   └── README.md
├── mobile/               # App Expo (React Native)
├── web-dashboard/        # Dashboard React (Vite)
├── ml/                   # Notebooks y datos
├── docker-compose.yml    # Servicios locales opcionales
├── API.md                # Contrato de la API
└── README.md
```

## Inicio rápido

### Requisitos previos

- **Python 3.12** (backend)
- [Node.js 20+](https://nodejs.org/) (mobile y dashboard)
- [Git](https://git-scm.com/)

### Backend (venv)

Instrucciones detalladas: **[backend/README.md](./backend/README.md)**.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Configura `DATABASE_URL` en `.env` en la raíz del repo o en `backend/.env`.

### Postgres + Redis locales (opcional)

Si quieres BD/caché en Docker sin contenedor del API:

```bash
docker compose up db redis
```

La API en venv debe apuntar a `127.0.0.1` (puertos definidos en `.env.example`).

### App móvil

```bash
cd mobile
npm install
npx expo start
```

### Dashboard web

```bash
cd web-dashboard
npm install
npm run dev
```

## Equipo

| Rol | Persona                    | Responsabilidades                           |
| --- | -------------------------- | ------------------------------------------- |
| A   | Frontend móvil + web       | React Native, React.js, UX                  |
| B   | Backend + datos            | FastAPI, PostgreSQL+PostGIS, Supabase       |
| C   | ML + integraciones + datos | scikit-learn, ETL IPAT, IDEAM, FCM          |

## Documentación

- [Contrato de API](./API.md)
- Backend local: [backend/README.md](./backend/README.md)
- Swagger con el servidor en marcha: `http://localhost:8000/docs`
