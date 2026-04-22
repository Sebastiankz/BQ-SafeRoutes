# SafeRoutes BQ

Plataforma Web y Móvil de Colaboración Ciudadana para la Gestión Preventiva y Detección de Puntos Críticos de Seguridad Vial en Barranquilla.

## Stack tecnológico

| Componente | Tecnología |
|------------|-----------|
| Backend API | FastAPI (Python 3.12) |
| Base de datos | PostgreSQL 16 + PostGIS 3.4 |
| Cache | Redis 7 |
| App móvil | React Native + Expo |
| Dashboard web | React (Vite) |
| ML | scikit-learn (DBSCAN), GeoPandas |
| Contenedores | Docker + docker-compose |

## Estructura del proyecto

```
bq-saferoutes/
├── backend/              # FastAPI + ML
│   ├── app/
│   │   ├── models/       # Modelos SQLAlchemy
│   │   ├── schemas/      # Schemas Pydantic
│   │   ├── routers/      # Endpoints
│   │   └── services/     # Lógica de negocio y ML
│   ├── scripts/          # SQL de inicialización
│   ├── Dockerfile
│   └── requirements.txt
├── mobile/               # App Expo (React Native)
├── dashboard/            # Dashboard React (Vite)
├── ml/                   # Notebooks y datos
│   ├── notebooks/
│   └── data/
├── docker-compose.yml
├── API.md                # Contrato de la API
└── README.md
```

## Inicio rápido

### Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/) (para mobile y dashboard)
- [Git](https://git-scm.com/)

### Levantar el backend + DB + Redis

```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar todos los servicios
docker-compose up --build

# La API estará disponible en:
# http://localhost:8000
# Swagger docs en:
# http://localhost:8000/docs
```

### Levantar la app móvil

```bash
cd mobile
npm install
npx expo start
```

### Levantar el dashboard

```bash
cd dashboard
npm install
npm run dev
```

## Equipo

| Rol | Persona | Responsabilidades |
|-----|---------|-------------------|
| A | Frontend móvil + web | React Native, React.js, UX |
| B | Backend + DB + Docker | FastAPI, PostgreSQL+PostGIS, docker-compose |
| C | ML + integraciones + datos | scikit-learn, ETL IPAT, IDEAM, FCM |

## Documentación

- [Contrato de API](./API.md)
- Swagger automático: `http://localhost:8000/docs`
