// src/pages/Dashboard/ReporteFeed.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { Chip } from "@heroui/react";
import {
  AlertTriangle,
  Bell,
  Camera,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Timer,
  X,
  Zap,
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

const ESTADO_CONFIG = {
  pendiente: {
    label: "Pendiente",
    dot: "text-orange-400",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  confirmado: {
    label: "Confirmado",
    dot: "text-emerald-500",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  inactivo: {
    label: "Inactivo",
    dot: "text-slate-400",
    badge: "bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-400",
  },
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
  const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.pendiente;
  return {
    id: r.id,
    tipo: TIPO_LABEL[r.tipo] ?? r.tipo,
    icono: TIPO_ICONO[r.tipo] ?? "timer",
    color: TIPO_COLOR[r.tipo] ?? "text-slate-500",
    direccion:
      r.direccion ?? `${r.latitud.toFixed(4)}, ${r.longitud.toFixed(4)}`,
    descripcion: r.descripcion ?? "Sin descripción",
    hace: tiempoRelativo(r.created_at),
    estado: estado.label,
    estadoDot: estado.dot,
    estadoBadge: estado.badge,
    prioridad: SEVERIDAD_PRIORIDAD[r.severidad] ?? "Media",
    foto_url: r.foto_url ?? null,
  };
}

const ICONO_MAP = {
  zap: <Zap size={14} />,
  alert: <AlertTriangle size={14} />,
  nav: <Navigation size={14} />,
  timer: <Timer size={14} />,
};

// ── Modal de detalle ─────────────────────────────────────────
function ReporteModal({ reporte, onClose }) {
  const [fotoAmpliada, setFotoAmpliada] = useState(false);

  const prioridadColor =
    reporte.prioridad === "Crítica"
      ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
      : reporte.prioridad === "Alta"
        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header coloreado */}
        <div className="relative px-6 pt-6 pb-5">
          {/* fondo decorativo sutil */}
          <div className={`absolute inset-0 opacity-[0.06] ${
            reporte.prioridad === "Crítica" ? "bg-red-500" :
            reporte.prioridad === "Alta"    ? "bg-orange-500" : "bg-blue-500"
          }`} />

          <div className="relative flex items-start gap-4">
            {/* Icono */}
            <div className={`${reporte.color} flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-gray-700 shrink-0 text-lg`}>
              {ICONO_MAP[reporte.icono]}
            </div>

            {/* Títulos */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {reporte.tipo}
              </h2>
              <p className="text-xs text-slate-400 dark:text-gray-400 mt-0.5">
                Reporte <span className="font-mono">#{reporte.id}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${prioridadColor}`}>
                  {reporte.prioridad}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${reporte.estadoBadge}`}>
                  {reporte.estado}
                </span>
              </div>
            </div>

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-gray-700" />

        {/* ── Foto (opcional) */}
        {reporte.foto_url && (
          <div className="relative overflow-hidden bg-slate-100 dark:bg-gray-700">
            {fotoAmpliada ? (
              <img
                src={reporte.foto_url}
                alt="Foto del reporte"
                className="w-full object-contain max-h-80 cursor-zoom-out"
                onClick={() => setFotoAmpliada(false)}
              />
            ) : (
              <div className="relative cursor-zoom-in group" onClick={() => setFotoAmpliada(true)}>
                <img
                  src={reporte.foto_url}
                  alt="Foto del reporte"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    <ExternalLink size={13} /> Ver foto completa
                  </span>
                </div>
                <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                  <Camera size={10} /> Foto del reporte
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          {/* Dirección */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 shrink-0">
              <MapPin size={15} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-0.5">
                Dirección
              </p>
              <p className="text-sm text-slate-700 dark:text-gray-200 leading-snug">
                {reporte.direccion}
              </p>
            </div>
          </div>

          {/* Tiempo */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-gray-700 shrink-0">
              <Clock size={15} className="text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-0.5">
                Reportado
              </p>
              <p className="text-sm text-slate-700 dark:text-gray-200">
                hace {reporte.hace}
              </p>
            </div>
          </div>

          {/* Descripción */}
          {reporte.descripcion !== "Sin descripción" && (
            <div className="rounded-xl bg-slate-50 dark:bg-gray-700/60 p-4 border border-slate-100 dark:border-gray-600">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1.5">
                Descripción
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
                {reporte.descripcion}
              </p>
            </div>
          )}

          {/* Sin foto */}
          {!reporte.foto_url && (
            <p className="flex items-center gap-1.5 text-xs text-slate-300 dark:text-gray-600">
              <Camera size={12} /> Sin foto adjunta
            </p>
          )}
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
            Reportes Actualizado
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
                      <MapPin size={10} /> {r.direccion}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${r.estadoBadge}`}
                    >
                      {r.estado}
                    </span>
                  </div>
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
