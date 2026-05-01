// src/pages/Dashboard/MapaLeaflet.jsx
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Exponer L globalmente para leaflet.heat (se hace una sola vez al cargar el módulo)
window.L = L;

// Fix de íconos rotos en Vite (bug conocido de Leaflet)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Puntos del heatmap [lat, lng, intensidad] ─────────────────
// Coordenadas verificadas en OpenStreetMap para Barranquilla
const PUNTOS_CALOR = [
  // ── Av. Circunvalar × Calle 110 (epicentro principal) ──
  [11.0183, -74.8066, 1.0],
  [11.0177, -74.8062, 1.0],
  [11.017, -74.8058, 1.0],
  [11.0163, -74.8054, 1.0],
  [11.0156, -74.805, 0.95],

  // ── Av. Circunvalar sector norte (Calle 98 - Calle 110) ──
  [11.014, -74.8045, 0.9],
  [11.012, -74.8038, 0.9],
  [11.01, -74.803, 0.85],
  [11.008, -74.8025, 0.85],

  // ── Av. Circunvalar sector medio (Calle 72 - Calle 98) ──
  [11.006, -74.802, 0.8],
  [11.004, -74.8015, 0.8],
  [11.002, -74.801, 0.75],
  [10.9995, -74.8005, 0.75],
  [10.997, -74.8, 0.7],

  // ── Calle 72 (corredor E-O) ──
  [10.9958, -74.82, 0.65],
  [10.9958, -74.81, 0.7],
  [10.9958, -74.8, 0.75],
  [10.9958, -74.79, 0.65],

  // ── Calle 30 / Vía 40 ──
  [10.972, -74.81, 0.5],
  [10.972, -74.8, 0.55],
  [10.972, -74.79, 0.5],
];

// ── Componente interno que accede al mapa de Leaflet ─────────
function CapaCalor() {
  const map = useMap();

  useEffect(() => {
    let heat;

    // Dynamic import: se ejecuta DESPUÉS de que window.L = L ya está asignado
    import("leaflet.heat").then(() => {
      heat = L.heatLayer(PUNTOS_CALOR, {
        radius: 22,
        blur: 15,
        maxZoom: 16,
        max: 1.0,
        // Gradiente tipo temperatura: verde → amarillo → naranja → rojo
        gradient: {
          0.0: "#22c55e",
          0.3: "#84cc16",
          0.5: "#eab308",
          0.7: "#f97316",
          1.0: "#dc2626",
        },
      }).addTo(map);
    });

    return () => {
      if (heat) map.removeLayer(heat);
    };
  }, [map]);

  return null;
}

// ── Componente principal ──────────────────────────────────────
export default function MapaLeaflet() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest">
          Mapa de Calor — Barranquilla
        </p>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{" "}
            Bajo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />{" "}
            Medio
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{" "}
            Alto
          </span>
        </div>
      </div>

      {/* MapContainer necesita altura fija — no puede ser % */}
      <MapContainer
        center={[11.006, -74.8035]}
        zoom={13}
        style={{ height: "320px", width: "100%", borderRadius: "12px" }}
        scrollWheelZoom={false}
      >
        {/* Tiles de OpenStreetMap — gratis, sin API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CapaCalor />
      </MapContainer>
    </div>
  );
}
