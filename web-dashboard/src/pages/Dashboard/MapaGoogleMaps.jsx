// src/pages/Dashboard/MapaGoogleMaps.jsx
//
// Reemplaza MapaLeaflet.jsx.
// - Usa @react-google-maps/api (Google Maps JS API) en vez de Leaflet.
// - Consume GET /api/hotspots/ (mismos endpoints que la app mobile).
// - El gradiente, opacidad y pesos del heatmap son idénticos a MapScreen.tsx.
// - Props: { año, mes } — misma interfaz que tenía MapaLeaflet, sin cambios en Dashboard.jsx.
// - NO modifica la lógica de filtrado de useDashboardData.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  HeatmapLayer,
  useJsApiLoader,
} from "@react-google-maps/api";

// ── Constantes ────────────────────────────────────────────────────────────────

const BARRANQUILLA_CENTER = { lat: 10.9685, lng: -74.7889 };
const DEFAULT_ZOOM = 13;

// Gradiente basado en HEATMAP_GRADIENT de MapScreen.tsx.
// El primer color DEBE ser transparente en Google Maps JS API: sin él, el heatmap
// pinta de azul sólido toda el área visible aunque no haya datos.
const HEATMAP_GRADIENT = [
  "rgba(0, 0, 0, 0)", // 0 %  — sin datos → transparente (muestra el mapa)
  "#1a73e8",          // 5 %  — azul Google
  "#43e97b",          // 25 % — verde
  "#f6d365",          // 50 % — amarillo
  "#f08080",          // 75 % — salmón
  "#E53E3E",          // 100 % — rojo (máxima densidad)
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export default function MapaGoogleMaps({ año, mes, alturaContenedor = "320px" }) {
  const mapContainerStyle = { height: alturaContenedor, width: "100%", borderRadius: "12px" };

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "",
    libraries: LIBRARIES,
  });

  const [hotspots, setHotspots] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState(null);

  // Fetch hotspots cuando cambian los filtros (mismo ciclo que cargarHotspots en mobile)
  useEffect(() => {
    let cancelled = false;
    setCargando(true);
    setErrorFetch(null);

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

    return () => { cancelled = true; };
  }, [año, mes]);

  // Convierte hotspots a puntos weighted para HeatmapLayer.
  // Idéntico a heatmapPoints en MapScreen.tsx:
  //   { latitude: h.latitud, longitude: h.longitud, weight: Math.max(1, h.num_incidentes ?? 1) }
  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google) return [];
    return hotspots
      .filter((h) => Number.isFinite(h.latitud) && Number.isFinite(h.longitud))
      .map((h) => ({
        location: new window.google.maps.LatLng(h.latitud, h.longitud),
        weight: Math.max(1, h.num_incidentes ?? 1),
      }));
  }, [hotspots, isLoaded]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
      {/* Encabezado — igual que MapaLeaflet */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest">
          Mapa de Calor — Barranquilla
        </p>
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
          {cargando && (
            <span className="text-slate-300 dark:text-gray-600 italic">cargando...</span>
          )}
        </div>
      </div>

      {/* Error de carga de API key */}
      {loadError && (
        <div className="flex items-center justify-center h-[320px] rounded-xl bg-slate-100 dark:bg-gray-700">
          <p className="text-xs text-red-500 text-center px-4">
            No se pudo cargar Google Maps. Verifica que VITE_GOOGLE_MAPS_KEY sea válida
            y tenga habilitadas «Maps JavaScript API» y «Maps JavaScript API Visualization».
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
        >
          {heatmapData.length > 0 && (
            <HeatmapLayer
              data={heatmapData}
              options={{
                gradient: HEATMAP_GRADIENT,
                opacity: HEATMAP_OPACITY,
                radius: HEATMAP_RADIUS,
                // maxIntensity dinámico: el hotspot más denso marca el techo de color
                maxIntensity: Math.max(...hotspots.map((h) => h.num_incidentes ?? 1), 1),
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
}
