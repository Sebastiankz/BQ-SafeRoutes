// src/pages/Dashboard/ReportePopup.jsx
//
// Popup React propio — reemplaza el InfoWindow nativo de Google Maps.
// Se posiciona como position:absolute dentro del contenedor del mapa.
// El anchor (left/top) corresponde al punto de anclaje del marcador (centro inferior).

import { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  AlertTriangle,
  Car,
  Construction,
  Waves,
  Zap,
  CircleAlert,
} from "lucide-react";
import { reverseGeocode } from "../../lib/geocode";

// ── Constantes (deben coincidir con las de MapaGoogleMaps.jsx) ────────────────

const TIPO_ICON = {
  accidente: Car,
  hueco: Construction,
  arroyo: Waves,
  semaforo_danado: Zap,
  otro: CircleAlert,
};

// Foreground colour that pairs with each TIPO_ICON_BG
const TIPO_ICON_COLOR = {
  accidente: "#DC2626", // red-600
  hueco: "#EA580C", // orange-600
  arroyo: "#2563EB", // blue-600
  semaforo_danado: "#B45309", // amber-700
  otro: "#475569", // slate-600
};

const TIPO_LABEL = {
  accidente: "Accidente",
  hueco: "Hueco peligroso",
  arroyo: "Arroyo / Inundación",
  semaforo_danado: "Semáforo dañado",
  otro: "Otro",
};

// Fondo claro para el ícono de categoría (spec: #FEF3C7 para semáforo, etc.)
const TIPO_ICON_BG = {
  accidente: "#FEE2E2",
  hueco: "#FFEDD5",
  arroyo: "#DBEAFE",
  semaforo_danado: "#FEF3C7",
  otro: "#F1F5F9",
};

const SEV_LABEL = {
  1: "Baja",
  2: "Media",
  3: "Alta",
  4: "Alta",
  5: "Crítica",
};

// Pill de severidad
const SEV_PILL = {
  1: "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-400",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  3: "bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-400",
  4: "bg-red-200    text-red-800    dark:bg-red-900/60    dark:text-red-300",
  5: "bg-red-300    text-red-900    dark:bg-red-900/80    dark:text-red-200",
};

const ESTADO_BADGE = {
  confirmado: {
    dot: "bg-green-500",
    cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    label: "Confirmado",
  },
  pendiente: {
    dot: "bg-yellow-400",
    cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    label: "Pendiente",
  },
  inactivo: {
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    label: "Inactivo",
  },
};

function tiempoRelativo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff} seg`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  const d = Math.floor(diff / 86400);
  return `${d} día${d > 1 ? "s" : ""}`;
}

// ── Constante exportada ───────────────────────────────────────────────────────
// Ancho fijo del popup en píxeles. MapaGoogleMaps la usa para centrar el popup.
export const POPUP_WIDTH = 228;

// Distancia vertical desde el anchor del marcador hasta la base de la cola.
// El marcador SVG tiene 54 px de alto (anchor en el fondo); la cola termina
// justo encima del círculo del pin (≈ 56 px por encima del anchor).
const ANCHOR_OFFSET_Y = 56;

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * @param {object}   reporte   — objeto de reporte del API
 * @param {{ x: number, y: number }} pixelPos — posición del anchor del marcador
 *        en píxeles relativos al contenedor del mapa
 * @param {function} onClose   — callback al cerrar (opcional, el mapa lo cierra también)
 */
export default function ReportePopup({ reporte, pixelPos, onClose }) {
  const [dir, setDir] = useState(() => reporte?.direccion?.trim() || null);

  useEffect(() => {
    if (!reporte) return;
    if (reporte.direccion?.trim()) {
      setDir(reporte.direccion.trim());
      return;
    }
    if (reporte.latitud == null || reporte.longitud == null) {
      setDir("Sin dirección");
      return;
    }
    reverseGeocode(reporte.latitud, reporte.longitud).then((addr) => {
      setDir(addr ?? "Sin dirección");
    });
  }, [reporte?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!reporte || !pixelPos) return null;
  const label = TIPO_LABEL[reporte.tipo] ?? reporte.tipo;
  const IconComp = TIPO_ICON[reporte.tipo] ?? CircleAlert;
  const iconBg = TIPO_ICON_BG[reporte.tipo] ?? "#F1F5F9";
  const iconColor = TIPO_ICON_COLOR[reporte.tipo] ?? "#475569";
  const hace = tiempoRelativo(reporte.created_at);
  const sev = SEV_LABEL[reporte.severidad] ?? "—";
  const sevCls = SEV_PILL[reporte.severidad] ?? SEV_PILL[3];
  const badge = ESTADO_BADGE[reporte.estado] ?? ESTADO_BADGE.inactivo;
  const idShort = `#${String(reporte.id).slice(0, 8)}`;

  return (
    <div
      style={{
        position: "absolute",
        left: pixelPos.x,
        top: pixelPos.y - ANCHOR_OFFSET_Y,
        transform: "translate(-50%, -100%)",
        width: POPUP_WIDTH,
        zIndex: 50,
        pointerEvents: "auto",
        // drop-shadow cubre tanto la card como la cola triangular como una pieza
        filter:
          "drop-shadow(0 4px 16px rgba(0,0,0,0.15)) drop-shadow(0 1px 3px rgba(0,0,0,0.08))",
      }}
    >
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700/70 overflow-hidden">
        {/* Header: ícono + título + badge estado */}
        <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: iconBg }}
          >
            <IconComp size={16} strokeWidth={2} color={iconColor} />
          </div>

          <p className="flex-1 min-w-0 text-[13px] font-bold text-slate-900 dark:text-white leading-tight truncate">
            {label}
          </p>

          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 dark:bg-gray-800 mx-3" />

        {/* Metadata */}
        <div className="px-3 py-2.5 space-y-1.5">
          {/* Dirección */}
          <div className="flex items-start gap-2">
            <MapPin
              size={11}
              strokeWidth={2.1}
              className="text-slate-400 dark:text-gray-500 mt-0.5 shrink-0"
            />
            <span className="text-[11.5px] text-slate-600 dark:text-gray-300 leading-snug">
              {dir}
            </span>
          </div>

          {/* Tiempo + nº reporte */}
          <div className="flex items-center gap-2">
            <Clock
              size={11}
              strokeWidth={2.1}
              className="text-slate-400 dark:text-gray-500 shrink-0"
            />
            <span className="text-[11.5px] text-slate-500 dark:text-gray-400">
              hace {hace}
            </span>
            <span className="ml-auto text-[10.5px] text-slate-400 dark:text-gray-600 font-mono">
              Reporte {idShort}
            </span>
          </div>

          {/* Severidad */}
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={11}
              strokeWidth={2.1}
              className="text-slate-400 dark:text-gray-500 shrink-0"
            />
            <span className="text-[11.5px] text-slate-500 dark:text-gray-400">
              Severidad
            </span>
            <span
              className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${sevCls}`}
            >
              {sev}
            </span>
          </div>
        </div>
      </div>

      {/* ── Cola triangular (apunta hacia abajo, centrada) ─────────────────── */}
      {/* clip-path crea el triángulo; el bg hereda el modo oscuro */}
      <div
        className="mx-auto bg-white dark:bg-gray-900"
        style={{
          width: 16,
          height: 8,
          clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          marginTop: -1, // solapa 1 px con el border inferior de la card
        }}
      />
    </div>
  );
}
