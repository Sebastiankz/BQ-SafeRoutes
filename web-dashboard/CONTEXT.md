# Monitor Vial Barranquilla — Contexto del Dashboard

> Este archivo documenta la arquitectura, decisiones técnicas y estado actual del frontend para que cualquier IA o desarrollador pueda retomar el trabajo sin perderse.

---

## Stack técnico

| Tecnología | Versión | Rol |
|---|---|---|
| React | 19 | Framework UI |
| Vite | 8 | Build tool / dev server |
| Tailwind CSS | v4 | Estilos (`@tailwindcss/vite`, sin `tailwind.config.js`) |
| HeroUI | v3 (`@heroui/react`) | Componentes UI (Select, ListBox) |
| Recharts | 3 | Gráficas (AreaChart, BarChart, PieChart) |
| react-leaflet + leaflet | 1.9.4 | Mapa interactivo |
| leaflet.heat | 0.2.0 | Capa heatmap sobre el mapa |
| lucide-react | 1.14 | Iconografía |
| Papa Parse | 5 | Parseo del CSV en el navegador |

---

## Estructura de archivos relevantes

```
web-dashboard/
├── public/
│   └── accidentes.csv          ← Dataset real (~27.500 filas, 2018–2025)
├── src/
│   ├── main.jsx                ← Entry point (importa global.css)
│   ├── global.css              ← @import "tailwindcss" + dark variant
│   ├── App.jsx                 ← Renderiza <Dashboard />
│   ├── api/
│   │   └── accidentes.js       ← fetch + PapaParse del CSV
│   └── pages/Dashboard/
│       ├── Dashboard.jsx       ← Contenedor principal, maneja estado global
│       ├── Header.jsx          ← Navbar con filtros y toggle dark mode
│       ├── KPICard.jsx         ← Tarjeta de KPI individual
│       ├── Charts.jsx          ← Todas las gráficas (5 exports)
│       ├── MapaLeaflet.jsx     ← Mapa de calor con Leaflet
│       ├── ReporteFeed.jsx     ← Panel lateral de reportes ciudadanos
│       └── useDashboardData.js ← Custom hook: carga CSV, filtra, calcula
├── vite.config.js
└── CONTEXT.md                  ← Este archivo
```

---

## Configuraciones críticas

### `vite.config.js`
```js
// usePolling: true  ← fix obligatorio para HMR en Windows
server: { watch: { usePolling: true, interval: 300 } }
```

### `src/global.css`
```css
@import "tailwindcss";
@import "@heroui/styles";
/* Dark mode basado en clase, NO en media query */
@variant dark (&:where(.dark, .dark *));
```

### `src/main.jsx`
```js
import './global.css'  // ← DEBE ser la primera línea. Sin esto Tailwind no carga.
```

---

## Layout del Dashboard

```
┌─────────────────────────────────────────────────────┐
│  Header (shrink-0) — logo + 3 filtros + dark toggle │
├──────────────────────────────┬──────────────────────┤
│  main  (lg:w-[70%])          │  aside (lg:w-[30%])  │
│  overflow-y-auto             │  ReporteFeed         │
│  ┌──────────────────────┐    │                      │
│  │ 3 KPICards (grid)    │    │                      │
│  ├──────────────────────┤    │                      │
│  │ MapaLeaflet          │    │                      │
│  ├──────────────────────┤    │                      │
│  │ HourlyChart (100%)   │    │                      │
│  ├──────────┬───────────┤    │                      │
│  │DailyChart│GravedadCh.│    │                      │
│  ├──────────┼───────────┤    │                      │
│  │TipologíaCh│Top5Vias  │    │                      │
│  └──────────┴───────────┘    │                      │
└──────────────────────────────┴──────────────────────┘
```

**Responsive:**
- Mobile `<640px`: columna única, header en 2 filas, KPIs 1 col
- Tablet `640–1024px`: header en fila, KPIs 2 col, charts 2 col
- Desktop `≥1024px`: layout 70/30, KPIs 3 col

**Dark mode:** se activa agregando la clase `dark` al `<div>` raíz en `Dashboard.jsx`. El estado `isDark` lo controla el botón Moon/Sun en el Header.

---

## Estado global (`Dashboard.jsx`)

```jsx
const [año,     setAño]     = useState(2025);      // número | 'Todos'
const [gravedad, setGravedad] = useState('Todas');  // string
const [mes,     setMes]     = useState('Todos');    // string ('Todos' | '1'–'12')
const [isDark,  setIsDark]  = useState(false);
```

Todos los estados se pasan como props al `Header` y al hook `useDashboardData(año, gravedad, mes)`.

---

## Filtros — `Header.jsx`

Usa componentes **HeroUI v3** (`Select`, `ListBox`). Patrón importante:

```jsx
// onSelectionChange puede devolver un Set en algunas versiones de HeroUI
onSelectionChange={(key) => {
  const val = key instanceof Set ? [...key][0] : key;
  if (val != null) setGravedad(String(val));
}}
```

**Filtros disponibles:**
- **Gravedad**: `Todas | Solo Daños | Heridos | Muertos`
- **Período**: `Todos | 2022 | 2023 | 2024 | 2025`
- **Mes**: `Todos | Enero … Diciembre` (id numérico como string: `'1'`–`'12'`)

---

## Custom Hook — `useDashboardData.js`

**Firma:** `useDashboardData(año, gravedad, mes)` → `{ result, loading }`

**Flujo:**
1. Carga el CSV una sola vez vía `useRef` como caché (no vuelve a hacer fetch si ya cargó)
2. Llama a `calcularTodo(filas, año, gravedad, mes)` dentro de un `setTimeout(500ms)` para simular loading
3. Re-ejecuta cuando cambia cualquiera de los 3 filtros (`useEffect` deps)

**Columnas del CSV usadas:**
- `AÑO_ACCIDENTE` — número
- `MES_ACCIDENTE` — **texto en inglés** (`"January"`, `"February"`, etc.)  ⚠️
- `DIA_ACCIDENTE` — abreviatura inglesa (`"Mon"`, `"Tue"`, etc.)
- `HORA_ACCIDENTE` — formato `"01:30:00:am"` — parseado con `parseHora()`
- `GRAVEDAD_ACCIDENTE` — `"Con heridos"` | `"Solo daños"` | `"Con muertos"`
- `CLASE_ACCIDENTE` — tipología (Choque, Atropello, etc.)
- `SITIO_NORMALIZADO` — nombre de vía normalizado
- `CANT_HERIDOS_EN _SITIO_ACCIDENTE` — nota: tiene espacio antes de `SITIO`
- `CANT_MUERTOS_EN _SITIO_ACCIDENTE` — ídem

**Mapas de conversión:**
```js
// Gravedad: valor del filtro → valor en CSV
GRAVEDAD_MAP = { 'Todas': null, 'Solo Daños': 'Solo daños', 'Heridos': 'Con heridos', 'Muertos': 'Con muertos' }

// Mes: id numérico string → nombre en inglés del CSV
MES_CSV_MAP = { '1': 'January', '2': 'February', ..., '12': 'December' }
```

**`result` contiene:**
```js
{
  kpi: { total, victimas, promedio, t1, t2, t3 },
  hourlyData:    [{ hora: '00:00', valor: 0–100 }, ...],  // 24 items, normalizado
  dailyData:     [{ dia: 'Lun', valor: N }, ...],          // 7 items
  gravedadData:  [{ name, value }, ...],
  tipologiaData: [{ name, value }, ...],                   // top 5
  top5Vias:      [{ rank, via, cantidad }, ...],           // top 5
}
```

**Tendencia (t1):** compara `año` actual vs `año-1`, aplicando los mismos filtros de gravedad y mes. Si `año = 'Todos'` → tendencia = 0.

---

## Mapa de Calor — `MapaLeaflet.jsx`

**Problema conocido con `leaflet.heat`:** Es un plugin global que depende de `window.L`. Si se importa estáticamente, el hoisting de ES modules ejecuta el import antes de que `window.L = L` esté asignado.

**Solución aplicada:**
```js
window.L = L;  // asignación síncrona al cargar el módulo
// ...
import('leaflet.heat').then(() => { ... })  // dynamic import DENTRO de useEffect
```

**Coordenadas actuales (hardcoded):** Epicentro en Av. Circunvalar × Calle 110 (`[11.0183, -74.8066]`, intensidad 1.0), con degradado decreciente hacia Calle 72 y Calle 30. Centro del mapa: `[11.006, -74.8035]`, zoom 13.

**Gradiente del heatmap:**
```js
{ 0.0: '#22c55e', 0.3: '#84cc16', 0.5: '#eab308', 0.7: '#f97316', 1.0: '#dc2626' }
```

> Pendiente futuro: geocodificar el CSV con Python para reemplazar las coordenadas hardcoded por datos reales.

---

## Panel de Reportes — `ReporteFeed.jsx`

- 10 reportes ciudadanos **hardcodeados** (simulados)
- Al hacer click en un reporte se abre un modal de detalle
- **El modal usa `ReactDOM.createPortal(jsx, document.body)`** — obligatorio para que se renderice por encima del mapa de Leaflet, que crea su propio stacking context
- Z-index del modal: `z-[9999]` (Leaflet usa hasta ~1000)

---

## Bugs resueltos (histórico)

| Bug | Causa | Solución |
|---|---|---|
| Tailwind no carga | Faltaba `import './global.css'` en `main.jsx` | Añadido como primera línea |
| HMR no funciona en Windows | Vite no detecta cambios en NTFS | `usePolling: true` en `vite.config.js` |
| `leaflet.heat` no se aplica | Import estático hoisteado antes de `window.L = L` | Dynamic import dentro de `useEffect` |
| Modal se renderiza bajo el mapa | `overflow-y-auto` en `<main>` crea stacking context | `createPortal` al `document.body` |
| Filtro de mes devuelve 0 | `MES_ACCIDENTE` en CSV es texto en inglés, no número | Mapa `MES_CSV_MAP` para convertir |
| `onSelectionChange` HeroUI rompe estado | HeroUI puede pasar un `Set` en vez de un valor directo | Guard: `key instanceof Set ? [...key][0] : key` |
| Tags JSX mal anidados en Header | Edición parcial dejó `<Select.Trigger>` faltante | Reescritura completa del archivo |

m
