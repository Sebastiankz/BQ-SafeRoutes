import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { Layers } from "lucide-react";
import ReportePopup from "./ReportePopup";
import { apiFetch } from "../../api/client";


const BARRANQUILLA_CENTER = { lat: 10.9685, lng: -74.7889 };
const DEFAULT_ZOOM = 13;

const HEATMAP_GRADIENT = [
  "rgba(0, 0, 0, 0)",
  "#1a73e8",
  "#43e97b",
  "#f6d365",
  "#f08080",
  "#E53E3E",
];

const HEATMAP_RADIUS = 35;
const HEATMAP_OPACITY = 0.85;
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

function buildIconGroup(tipo) {
  const g = (inner) =>
    `<g transform="translate(13,11) scale(0.75)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

  switch (tipo) {
    case "accidente": // Car
      return g(
        '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>' +
        '<circle cx="7" cy="17" r="2"/>' +
        '<path d="M9 17h6"/>' +
        '<circle cx="17" cy="17" r="2"/>',
      );
    case "hueco": // Construction
      return g(
        '<rect x="2" y="6" width="20" height="8" rx="1"/>' +
        '<path d="M17 14v7"/>' +
        '<path d="M7 14v7"/>' +
        '<path d="M17 3v3"/>' +
        '<path d="M7 3v3"/>' +
        '<path d="M10 14 2.3 6.3"/>' +
        '<path d="m14 6 7.7 7.7"/>' +
        '<path d="m8 6 8 8"/>',
      );
    case "arroyo": // Waves
      return g(
        '<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/>' +
        '<path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/>' +
        '<path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>',
      );
    case "semaforo_danado": // Zap
      return g(
        '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
      );
    default: // CircleAlert (otro)
      return g(
        '<circle cx="12" cy="12" r="10"/>' +
        '<line x1="12" x2="12" y1="8" y2="12"/>' +
        '<line x1="12" x2="12.01" y1="16" y2="16"/>',
      );
  }
}

/**
 * Custom marker icon as SVG data URI.
 * Coloured circle + Lucide vector icon + triangular tail pointing down.
 */
function buildMarkerIcon(tipo, opacity = 1) {
  const color = TIPO_COLOR_HEX[tipo] ?? "#64748B";
  const alphaHex = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">`,
    `<ellipse cx="22" cy="52" rx="9" ry="3.5" fill="rgba(0,0,0,0.20)"/>`,
    `<polygon points="14,36 30,36 22,52" fill="${color}${alphaHex}"/>`,
    `<circle cx="22" cy="20" r="18" fill="${color}${alphaHex}" stroke="white" stroke-width="2.5"/>`,
    buildIconGroup(tipo),
    `</svg>`,
  ].join("");
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(44, 54),
    anchor: new window.google.maps.Point(22, 54),
  };
}

/**
 * Convierte coordenadas geográficas a píxeles relativos al contenedor del mapa.
 * Se usa para posicionar el ReportePopup sobre el marcador correcto.
 */
function getPixelPos(map, lat, lng) {
  const projection = map.getProjection();
  if (!projection) return null;
  const bounds = map.getBounds();
  if (!bounds) return null;
  const ne = projection.fromLatLngToPoint(bounds.getNorthEast());
  const sw = projection.fromLatLngToPoint(bounds.getSouthWest());
  const scale = Math.pow(2, map.getZoom());
  const worldPoint = projection.fromLatLngToPoint(
    new window.google.maps.LatLng(lat, lng),
  );
  return {
    x: Math.round((worldPoint.x - sw.x) * scale),
    y: Math.round((worldPoint.y - ne.y) * scale),
  };
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
  const mapListenersRef = useRef([]);

  // Estado del popup React (reemplaza InfoWindow nativo)
  const [selectedReporte, setSelectedReporte] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const selectedLatLngRef = useRef(null);

  // Cerrar popup cuando el login se abre (evento global desde Sidebar)
  useEffect(() => {
    function handleClosePopup() {
      setSelectedReporte(null);
      setPopupPos(null);
      selectedLatLngRef.current = null;
    }
    window.addEventListener("close-reporte-popup", handleClosePopup);
    return () =>
      window.removeEventListener("close-reporte-popup", handleClosePopup);
  }, []);

  function onMapLoad(map) {
    mapRef.current = map;
    setMapReady(true);

    // Reposicionar popup cuando el mapa se mueve o hace zoom
    const boundsListener = map.addListener("bounds_changed", () => {
      if (!selectedLatLngRef.current) return;
      const { lat, lng } = selectedLatLngRef.current;
      const pos = getPixelPos(map, lat, lng);
      if (pos) setPopupPos(pos);
    });

    // Cerrar popup al hacer click en el fondo del mapa
    const clickListener = map.addListener("click", () => {
      setSelectedReporte(null);
      setPopupPos(null);
      selectedLatLngRef.current = null;
    });

    mapListenersRef.current = [boundsListener, clickListener];
  }

  // Fetch hotspots cuando cambian los filtros (mismo ciclo que cargarHotspots en mobile)
  useEffect(() => {
    let cancelled = false;
    setCargando(true);
    setErrorFetch(null);
    setHotspots([]); // limpia puntos anteriores antes de que llegue la nueva respuesta

    const qs = buildHotspotsQuery(año, mes);
    apiFetch(`/hotspots/?${qs}`)
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

      const isNew = newIds.has(r.id);
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
        selectedLatLngRef.current = { lat: r.latitud, lng: r.longitud };
        const pos = getPixelPos(mapRef.current, r.latitud, r.longitud);
        setSelectedReporte(r);
        if (pos) setPopupPos(pos);
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
      for (const l of mapListenersRef.current) {
        window.google?.maps?.event?.removeListener(l);
      }
      mapListenersRef.current = [];
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  // Error fatal: Google Maps no pudo cargarse en absoluto.
  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-800">
        <p className="text-xs text-red-500 text-center px-6">
          No se pudo cargar Google Maps. Verifica que{" "}
          <code>VITE_GOOGLE_MAPS_KEY</code> sea válida y tenga habilitadas «Maps
          JavaScript API» y «Maps JavaScript API Visualization».
          <br />
          <span className="text-slate-400">{loadError.message}</span>
        </p>
      </div>
    );
  }

  return (
    // fill-parent: DashboardLayout ya garantiza un contenedor con altura real.
    <div className="relative w-full h-full">
      {/* ── Skeleton mientras carga el script de Google Maps ── */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-gray-700 animate-pulse flex items-center justify-center rounded-2xl">
          <span className="text-xs text-slate-400">Cargando mapa...</span>
        </div>
      )}

      {/* ── GoogleMap: llena todo el contenedor ── */}
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={BARRANQUILLA_CENTER}
          zoom={DEFAULT_ZOOM}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
        />
      )}

      {/* ── Popup de reporte seleccionado (overlay React) ── */}
      {isLoaded && selectedReporte && popupPos && (
        <ReportePopup
          reporte={selectedReporte}
          pixelPos={popupPos}
          onClose={() => {
            setSelectedReporte(null);
            setPopupPos(null);
            selectedLatLngRef.current = null;
          }}
        />
      )}

      {/* ── Controles flotantes (overlay) ── */}
      {isLoaded && (
        <div className="absolute top-3 left-3 right-14 flex items-start justify-between pointer-events-none gap-2 flex-wrap">
          {/* Etiqueta izquierda */}
          <div
            className="pointer-events-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
                        rounded-xl px-3 py-1.5 shadow border border-white/40 dark:border-gray-700/60"
          >
            <p className="text-[11px] font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-widest leading-none">
              {mostrarHeatmap ? "Mapa de Calor" : "Reportes"} · Barranquilla
            </p>
            {reportes.length > 0 && (
              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 leading-none">
                {reportes.length} reporte{reportes.length !== 1 ? "s" : ""}{" "}
                activo
                {reportes.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Controles derecha */}
          <div className="pointer-events-auto flex items-center gap-2 flex-wrap justify-end">
            {/* Toggle mapa de calor */}
            <button
              onClick={() => setMostrarHeatmap((v) => !v)}
              title={
                mostrarHeatmap
                  ? "Ocultar mapa de calor"
                  : "Mostrar mapa de calor"
              }
              className={[
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold",
                "border backdrop-blur-sm shadow transition-colors cursor-pointer",
                mostrarHeatmap
                  ? "bg-red-50/90 border-red-200 text-red-600 dark:bg-red-900/60 dark:border-red-700 dark:text-red-400 hover:bg-red-100"
                  : "bg-white/90 border-slate-200 text-slate-500 dark:bg-gray-800/80 dark:border-gray-600 dark:text-gray-400 hover:bg-slate-50",
              ].join(" ")}
            >
              <Layers size={12} />
              {mostrarHeatmap ? "Calor activo" : "Calor oculto"}
            </button>

            {/* Leyenda */}
            {mostrarHeatmap && (
              <div
                className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-gray-400
                            bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
                            rounded-xl px-2.5 py-1.5 border border-white/40 dark:border-gray-700/60 shadow"
              >
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
              <span
                className="text-[10px] italic text-slate-400 bg-white/80 dark:bg-gray-900/80
                            backdrop-blur-sm rounded-lg px-2 py-1 border border-white/30 dark:border-gray-700/50"
              >
                cargando hotspots…
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Error de hotspots (no-fatal): banner en la parte inferior ── */}
      {isLoaded && errorFetch && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-center pointer-events-none">
          <p
            className="text-[11px] text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-900/60
                        backdrop-blur-sm border border-red-200 dark:border-red-700
                        rounded-xl px-3 py-1.5 shadow"
          >
            ⚠ No se pudieron cargar hotspots: {errorFetch}
          </p>
        </div>
      )}
    </div>
  );
}
