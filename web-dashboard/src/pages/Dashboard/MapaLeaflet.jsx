// src/pages/Dashboard/MapaLeaflet.jsx
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

window.L = L;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Radio y blur por zoom ─────────────────────────────────────
function getHeatOptions(zoom) {
  if (zoom >= 16) return { radius: 25, blur: 22 };
  if (zoom >= 15) return { radius: 22, blur: 20 };
  if (zoom >= 14) return { radius: 18, blur: 16 };
  if (zoom >= 13) return { radius: 14, blur: 12 };
  if (zoom >= 12) return { radius: 10, blur: 9 };
  if (zoom >= 11) return { radius: 8, blur: 7 };
  return { radius: 6, blur: 5 };
}

// ── Capa de calor ─────────────────────────────────────────────
function CapaCalor({ puntos, heatMax }) {
  const map = useMap();

  useEffect(() => {
    if (!puntos || puntos.length === 0) return;

    let heat;

    import("leaflet.heat").then(() => {
      const { radius, blur } = getHeatOptions(map.getZoom());

      heat = L.heatLayer(puntos, {
        radius,
        blur,
        maxZoom: 17,
        max: heatMax,
        // minOpacity alto para que los puntos sean visibles aunque no
        // se solapen — sin esto los puntos de baja densidad son invisibles
        minOpacity: 0.4,
        gradient: {
          0.0: "#313695",
          0.2: "#4575b4",
          0.4: "#74add1",
          0.55: "#fee090",
          0.7: "#f46d43",
          0.85: "#d73027",
          1.0: "#a50026",
        },
      }).addTo(map);

      const updateHeat = () => {
        const opts = getHeatOptions(map.getZoom());
        heat.setOptions(opts);
        heat.redraw();
      };

      map.on("zoomend", updateHeat);
      heat._zoomHandler = updateHeat;
    });

    return () => {
      if (heat) {
        if (heat._zoomHandler) map.off("zoomend", heat._zoomHandler);
        map.removeLayer(heat);
      }
    };
  }, [map, puntos, heatMax]);

  return null;
}

// ── Componente principal ──────────────────────────────────────
export default function MapaLeaflet({ año, mes }) {
  const [puntos, setPuntos] = useState([]);
  const [heatMax, setHeatMax] = useState(0.6);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams();
    if (año && año !== "Todos") params.set("ano", año);
    if (mes && mes !== "Todos") params.set("mes", mes);
    const qs = params.toString();
    const url = `/api/incidentes-historicos/heatmap${qs ? `?${qs}` : ""}`;

    fetch(url)
      .then((r) => r.json())
      .then(({ points, heat_max }) => {
        setPuntos(points);
        setHeatMax(heat_max);
      })
      .finally(() => setCargando(false));
  }, [año, mes]);

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
          {cargando && (
            <span className="text-slate-300 dark:text-gray-600 italic">
              cargando...
            </span>
          )}
        </div>
      </div>

      <MapContainer
        center={[11.006, -74.8035]}
        zoom={13}
        style={{ height: "320px", width: "100%", borderRadius: "12px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CapaCalor puntos={puntos} heatMax={heatMax} />
      </MapContainer>
    </div>
  );
}
