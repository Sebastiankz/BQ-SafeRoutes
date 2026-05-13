// src/pages/Dashboard/MapaGoogleMaps.jsx
//
// Reemplaza MapaLeaflet.jsx.
// - Usa @react-google-maps/api (Google Maps JS API) en vez de Leaflet.
// - Consume GET /api/hotspots/ (mismos endpoints que la app mobile).
// - El gradiente, opacidad y pesos del heatmap son idénticos a MapScreen.tsx.
// - Props: { año, mes } — misma interfaz que tenía MapaLeaflet, sin cambios en Dashboard.jsx.
// - NO modifica la lógica de filtrado de useDashboardData.

import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { Layers } from "lucide-react";

// ── Constantes ────────────────────────────────────────────────────────────────

const BARRANQUILLA_CENTER = { lat: 10.9685, lng: -74.7889 };
const DEFAULT_ZOOM = 13;

// Gradiente basado en HEATMAP_GRADIENT de MapScreen.tsx.
// El primer color DEBE ser transparente en Google Maps JS API: sin él, el heatmap
// pinta de azul sólido toda el área visible aunque no haya datos.
const HEATMAP_GRADIENT = [
  "rgba(0, 0, 0, 0)", // 0 %  — sin datos → transparente (muestra el mapa)
  "#1a73e8", // 5 %  — azul Google
  "#43e97b", // 25 % — verde
  "#f6d365", // 50 % — amarillo
  "#f08080", // 75 % — salmón
  "#E53E3E", // 100 % — rojo (máxima densidad)
];

// Radio en píxeles pantalla. En mobile se usa 70 en unidades de densidad nativa;
// 35 px en web es equivalente visual a zoom 13.
const HEATMAP_RADIUS = 35;
const HEATMAP_OPACITY = 0.85; // idéntico a mobile

// Libraries array fuera del componente para evitar re-renders del loader.
const LIBRARIES = ["visualization"];

const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  scrollwheel: false,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeControl: false,
};

// ── Constantes de marcadores de reportes ciudadanos ───────────────────────────

const TIPO_LABEL_MAPA = {
  accidente: "Accidente",
  hueco: "Hueco peligroso",
  arroyo: "Arroyo / Inundación",
  semaforo_danado: "Semáforo dañado",
  otro: "Otro",
};

const TIPO_COLOR_HEX = {
  accidente: "#EF4444", // rojo
  hueco: "#F97316", // naranja
  arroyo: "#3B82F6", // azul
  semaforo_danado: "#EAB308", // amarillo
  otro: "#64748B", // gris
};

const SEVERIDAD_LABEL = {
  1: "Leve",
  2: "Solo daños",
  3: "Riesgo alto",
  4: "Heridos",
  5: "Muertos",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Emoji por tipo — mismo criterio que el mobile
const TIPO_EMOJI = {
  accidente:       "🚗",
  hueco:           "🕳️",
  arroyo:          "🌊",
  semaforo_danado: "🚦",
  otro:            "⚠️",
};

/**
 * Icono de marcador personalizado como data URI SVG.
 * Círculo de color + emoji del tipo + punta triangular hacia abajo.
 * Misma paleta de colores que el mobile (TIPO_COLOR_HEX / ICONO_POR_TIPO).
 */
function buildMarkerIcon(tipo, opacity = 1) {
  const color    = TIPO_COLOR_HEX[tipo] ?? "#64748B";
  const emoji    = TIPO_EMOJI[tipo]     ?? "⚠️";
  const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, "0");
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">`,
    // Sombra
    `<ellipse cx="22" cy="52" rx="9" ry="3.5" fill="rgba(0,0,0,0.20)"/>`,
    // Punta triangular
    `<polygon points="14,36 30,36 22,52" fill="${color}${alphaHex}"/>`,
    // Círculo de fondo
    `<circle cx="22" cy="20" r="18" fill="${color}${alphaHex}" stroke="white" stroke-width="2.5"/>`,
    // Emoji centrado
    `<text x="22" y="27" text-anchor="middle" font-size="18">${emoji}</text>`,
    `</svg>`,
  ].join("");
  return {
    url:        "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(44, 54),
    anchor:     new window.google.maps.Point(22, 54),
  };
}

/** Tiempo relativo para el InfoWindow. */
function tiempoRelativo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff} seg`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} día${Math.floor(diff / 86400) > 1 ? "s" : ""}`;
}

/** Contenido HTML para el InfoWindow de un reporte. */
function buildInfoContent(r) {
  const label = TIPO_LABEL_MAPA[r.tipo] ?? r.tipo;
  const dir =
    r.direccion ?? `${r.latitud.toFixed(4)}, ${r.longitud.toFixed(4)}`;
  const hace = tiempoRelativo(r.created_at);
  const sev = SEVERIDAD_LABEL[r.severidad] ?? "—";
  const color = TIPO_COLOR_HEX[r.tipo] ?? "#64748B";
  const estadoBadge = {
    pendiente: { icon: "🟡", label: "Pendiente" },
    confirmado: { icon: "🟢", label: "Confirmado" },
    inactivo: { icon: "⚪", label: "Inactivo" },
  }[r.estado] ?? { icon: "⚫", label: r.estado };
  return `
    <div style="font-family:sans-serif;font-size:13px;min-width:170px;max-width:230px;padding:4px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <p style="font-weight:700;margin:0;color:${color};font-size:14px">${label}</p>
        <span style="font-size:10px;background:#f1f5f9;border-radius:999px;padding:1px 6px;color:#475569">${estadoBadge.icon} ${estadoBadge.label}</span>
      </div>
      <p style="margin:0 0 3px;color:#444">📍 ${dir}</p>
      <p style="margin:0 0 3px;color:#666">🕐 hace ${hace}</p>
      <p style="margin:0;color:#888;font-size:11px">Severidad: ${sev} · #${r.id}</p>
    </div>
  `;
}

/**
 * Convierte los filtros del dashboard a query params del endpoint /hotspots/.
 * Mismo criterio que buildQuery() en mobile/services/hotspots.ts.
 */
function buildHotspotsQuery(año, mes) {
  const params = new URLSearchParams({ activo: "true" });

  if (año === "Todos") {
    // Sin año específico → hotspots globales (year=NULL, month=NULL)
    params.set("global", "true");
  } else {
    params.set("year", String(año));
    if (mes !== "Todos") {
      params.set("month", String(mes));
    }
  }

  return params.toString();
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function MapaGoogleMaps({
  año,
  mes,
  alturaContenedor = "320px",
  reportes = [], // array crudo del API — reportes ciudadanos
  newIds = new Set(), // IDs que llegaron en el último poll
}) {
  const mapContainerStyle = {
    height: alturaContenedor,
    width: "100%",
    borderRadius: "12px",
  };

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "",
    libraries: LIBRARIES,
  });

  const [hotspots, setHotspots] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState(null);
  const [mostrarHeatmap, setMostrarHeatmap] = useState(true);

  // Referencias para gestión imperativa del HeatmapLayer
  const mapRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Referencias para marcadores de reportes ciudadanos
  // Mapa de id → { marker, listener } para gestión imperativa (diff-based)
  const markersRef = useRef(new Map());
  const infoWindowRef = useRef(null);

  function onMapLoad(map) {
    mapRef.current = map;
    setMapReady(true);
  }

  // Fetch hotspots cuando cambian los filtros (mismo ciclo que cargarHotspots en mobile)
  useEffect(() => {
    let cancelled = false;
    setCargando(true);
    setErrorFetch(null);
    setHotspots([]); // limpia puntos anteriores antes de que llegue la nueva respuesta

    const qs = buildHotspotsQuery(año, mes);
    fetch(`/api/hotspots/?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status} al cargar hotspots`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setHotspots(data);
      })
      .catch((e) => {
        if (!cancelled) setErrorFetch(e.message);
      })
      .finally(() => {
        if (!cancelled) setCargando(false);
      });

    return () => {
      cancelled = true;
    };
  }, [año, mes]);

  // Convierte hotspots a puntos weighted para el HeatmapLayer.
  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google) return [];
    return hotspots
      .filter((h) => Number.isFinite(h.latitud) && Number.isFinite(h.longitud))
      .map((h) => ({
        location: new window.google.maps.LatLng(h.latitud, h.longitud),
        weight: Math.max(1, h.num_incidentes ?? 1),
      }));
  }, [hotspots, isLoaded]);

  // Gestión imperativa del HeatmapLayer:
  // Destruye la capa anterior con setMap(null) ANTES de crear la nueva.
  // Esto garantiza que el canvas de Google Maps se limpie completamente,
  // independientemente del ciclo de vida de React.
  useEffect(() => {
    if (!mapReady || !window.google?.maps?.visualization) return;

    // Destruir capa anterior
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
      heatmapLayerRef.current = null;
    }

    // Si el toggle está desactivado o no hay datos, no crear capa
    if (!mostrarHeatmap || heatmapData.length === 0) return;

    // Crear nueva capa con los datos actuales
    heatmapLayerRef.current = new window.google.maps.visualization.HeatmapLayer(
      {
        data: heatmapData,
        map: mapRef.current,
        gradient: HEATMAP_GRADIENT,
        opacity: HEATMAP_OPACITY,
        radius: HEATMAP_RADIUS,
        maxIntensity: Math.max(
          ...hotspots.map((h) => h.num_incidentes ?? 1),
          1,
        ),
      },
    );

    return () => {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.setMap(null);
        heatmapLayerRef.current = null;
      }
    };
  }, [heatmapData, mapReady, mostrarHeatmap]);

  // ── Gestión imperativa de marcadores de reportes ──────────────────────────
  // Diff-based: añade marcadores nuevos, elimina los que ya no existen.
  // NO recrea marcadores existentes para evitar que DROP se repita.
  useEffect(() => {
    if (!mapReady || !window.google?.maps) return;

    const currentIds = new Set(reportes.map((r) => r.id));

    // Eliminar markers para reportes que ya no están en el array
    for (const [id, { marker, listener }] of markersRef.current) {
      if (!currentIds.has(id)) {
        window.google.maps.event.removeListener(listener);
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }

    // Crear markers para reportes que aún no tienen uno
    for (const r of reportes) {
      if (markersRef.current.has(r.id)) continue; // ya existe
      if (!Number.isFinite(r.latitud) || !Number.isFinite(r.longitud)) continue;

      const isNew  = newIds.has(r.id);
      // pendiente: opacidad reducida para indicar que aún no está confirmado
      const opacity = r.estado === "pendiente" ? 0.55 : 1.0;

      const marker = new window.google.maps.Marker({
        position: { lat: r.latitud, lng: r.longitud },
        map: mapRef.current,
        title: TIPO_LABEL_MAPA[r.tipo] ?? r.tipo,
        icon: buildMarkerIcon(r.tipo, opacity),
        animation: isNew ? window.google.maps.Animation.DROP : null,
        zIndex: isNew ? 10 : 5,
      });

      const listener = marker.addListener("click", () => {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow();
        }
        infoWindowRef.current.setContent(buildInfoContent(r));
        infoWindowRef.current.open(mapRef.current, marker);
      });

      markersRef.current.set(r.id, { marker, listener });
    }
  }, [reportes, newIds, mapReady]);

  // Cleanup completo al desmontar el componente
  useEffect(() => {
    return () => {
      for (const { marker, listener } of markersRef.current.values()) {
        window.google?.maps?.event?.removeListener(listener);
        marker.setMap(null);
      }
      markersRef.current.clear();
      infoWindowRef.current?.close();
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
      {/* Encabezado — igual que MapaLeaflet */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest">
            {mostrarHeatmap ? "Mapa de Calor" : "Reportes"} — Barranquilla
          </p>
          {reportes.length > 0 && (
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
              {reportes.length} reporte{reportes.length !== 1 ? "s" : ""} activo
              {reportes.length !== 1 ? "s" : ""} en el mapa
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle mapa de calor */}
          <button
            onClick={() => setMostrarHeatmap((v) => !v)}
            title={
              mostrarHeatmap ? "Ocultar mapa de calor" : "Mostrar mapa de calor"
            }
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer",
              mostrarHeatmap
                ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-600",
            ].join(" ")}
          >
            <Layers size={12} />
            {mostrarHeatmap ? "Calor activo" : "Calor oculto"}
          </button>

          {/* Leyenda (solo visible cuando el heatmap está activo) */}
          {mostrarHeatmap && (
            <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Bajo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                Medio
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Alto
              </span>
            </div>
          )}

          {cargando && (
            <span className="text-[10px] text-slate-300 dark:text-gray-600 italic">
              cargando...
            </span>
          )}
        </div>
      </div>

      {/* Error de carga de API key */}
      {loadError && (
        <div className="flex items-center justify-center h-[320px] rounded-xl bg-slate-100 dark:bg-gray-700">
          <p className="text-xs text-red-500 text-center px-4">
            No se pudo cargar Google Maps. Verifica que VITE_GOOGLE_MAPS_KEY sea
            válida y tenga habilitadas «Maps JavaScript API» y «Maps JavaScript
            API Visualization».
            <br />
            <span className="text-slate-400">{loadError.message}</span>
          </p>
        </div>
      )}

      {/* Error de fetch */}
      {!loadError && errorFetch && (
        <div className="flex items-center justify-center h-[320px] rounded-xl bg-slate-100 dark:bg-gray-700">
          <p className="text-xs text-red-500 text-center px-4">
            Error al cargar hotspots: {errorFetch}
          </p>
        </div>
      )}

      {/* Skeleton mientras carga el script de Google Maps */}
      {!isLoaded && !loadError && (
        <div
          style={mapContainerStyle}
          className="bg-slate-200 dark:bg-gray-700 animate-pulse flex items-center justify-center"
        >
          <span className="text-xs text-slate-400">Cargando mapa...</span>
        </div>
      )}

      {/* Mapa */}
      {isLoaded && !loadError && !errorFetch && (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={BARRANQUILLA_CENTER}
          zoom={DEFAULT_ZOOM}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
        />
      )}
    </div>
  );
}
