// src/pages/Dashboard/ReporteFeed.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MapPin,
  Clock,
  AlertTriangle,
  Zap,
  Navigation,
  Timer,
  Bell,
} from "lucide-react";

const TIPO_LABEL = {
  accidente: "Accidente",
  hueco: "Hueco peligroso",
  arroyo: "Arroyo / Inundación",
  semaforo_danado: "Semáforo dañado",
  otro: "Otro",
};

const TIPO_ICONO = {
  accidente: "nav",
  hueco: "alert",
  arroyo: "alert",
  semaforo_danado: "zap",
  otro: "timer",
};

const TIPO_COLOR = {
  accidente: "text-red-500",
  hueco: "text-orange-500",
  arroyo: "text-blue-500",
  semaforo_danado: "text-yellow-500",
  otro: "text-slate-500",
};

const SEVERIDAD_PRIORIDAD = {
  1: "Media",
  2: "Media",
  3: "Alta",
  4: "Alta",
  5: "Crítica",
};

function tiempoRelativo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff} seg`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hora${Math.floor(diff / 3600) > 1 ? "s" : ""}`;
  return `${Math.floor(diff / 86400)} día${Math.floor(diff / 86400) > 1 ? "s" : ""}`;
}

function adaptarReporte(r) {
  return {
    id: r.id,
    tipo: TIPO_LABEL[r.tipo] ?? r.tipo,
    icono: TIPO_ICONO[r.tipo] ?? "timer",
    color: TIPO_COLOR[r.tipo] ?? "text-slate-500",
    direccion:
      r.direccion ?? `${r.latitud.toFixed(4)}, ${r.longitud.toFixed(4)}`,
    descripcion: r.descripcion ?? "Sin descripción",
    hace: tiempoRelativo(r.created_at),
    estado: r.estado === "pendiente" ? "Activo" : "Atendido",
    prioridad: SEVERIDAD_PRIORIDAD[r.severidad] ?? "Media",
  };
}

const ICONO_MAP = {
  zap: <Zap size={14} />,
  alert: <AlertTriangle size={14} />,
  nav: <Navigation size={14} />,
  timer: <Timer size={14} />,
};

const PRIORIDAD_COLOR = {
  Crítica: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  Alta: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Media: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

// ── Modal de detalle ─────────────────────────────────────────
function ReporteModal({ reporte, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Tarjeta del modal — stopPropagation evita cerrar al hacer clic adentro */}
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`${reporte.color} p-2 bg-slate-100 dark:bg-gray-700 rounded-lg`}
            >
              {ICONO_MAP[reporte.icono]}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white">
                {reporte.tipo}
              </h2>
              <p className="text-xs text-slate-400 dark:text-gray-400">
                Reporte #{reporte.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <MapPin size={14} className="text-blue-500 shrink-0" />
            <span>{reporte.direccion}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span>Reportado hace {reporte.hace}</span>
          </div>
          <p className="text-slate-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700 rounded-lg p-3">
            {reporte.descripcion}
          </p>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Prioridad:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORIDAD_COLOR[reporte.prioridad]}`}
              >
                {reporte.prioridad}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Estado:</span>
              <span
                className={`text-xs font-bold ${reporte.estado === "Atendido" ? "text-emerald-500" : "text-orange-500"}`}
              >
                ● {reporte.estado}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Feed principal ────────────────────────────────────────────
// Props:
//   reportes — array crudo del API (sin adaptar)
//   newIds   — Set<number> de IDs que llegaron en el último poll
export default function ReporteFeed({ reportes = [], newIds = new Set() }) {
  const [seleccionado, setSeleccionado] = useState(null);

  const adaptados = reportes.map(adaptarReporte);
  const numNuevos = adaptados.filter((r) => newIds.has(r.id)).length;

  return (
    <>
      {/* Header del aside */}
      <div className="mb-4 pb-3 border-b border-slate-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">
            Reportes Ciudadanos
          </h2>
          {/* Badge de nuevos reportes */}
          {numNuevos > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold animate-bounce">
              <Bell size={10} />
              {numNuevos} nuevo{numNuevos > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-400 dark:text-gray-400 uppercase tracking-widest">
            En vivo · actualiza c/30 s
          </span>
        </div>
      </div>

      {/* Lista con scroll */}
      <div className="space-y-1">
        {adaptados.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-4">
            Sin reportes recientes
          </p>
        )}
        {adaptados.map((r) => {
          const esNuevo = newIds.has(r.id);
          return (
            <button
              key={r.id}
              onClick={() => setSeleccionado(r)}
              className={[
                "w-full text-left p-3 rounded-xl transition-colors cursor-pointer group",
                esNuevo
                  ? "animate-slide-in-top bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 ring-1 ring-emerald-300 dark:ring-emerald-700"
                  : "hover:bg-slate-50 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`${r.color} mt-0.5 shrink-0`}>
                  {ICONO_MAP[r.icono]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-gray-200 truncate">
                      {r.tipo}
                    </p>
                    {esNuevo && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-500 text-white leading-none">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {r.direccion}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 line-clamp-1">
                    {r.descripcion}
                  </p>
                </div>
                <span className="text-[10px] text-slate-300 dark:text-gray-600 shrink-0 whitespace-nowrap">
                  {r.hace}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal — solo se renderiza si hay un reporte seleccionado */}
      {seleccionado && (
        <ReporteModal
          reporte={seleccionado}
          onClose={() => setSeleccionado(null)}
        />
      )}
    </>
  );
}
