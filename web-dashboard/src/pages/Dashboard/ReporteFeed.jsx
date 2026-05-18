// src/pages/Dashboard/ReporteFeed.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { reverseGeocode } from "../../lib/geocode";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Camera,
  Clock,
  FileText,
  MapPin,
  Navigation2,
  Radio,
  Timer,
  X,
  Zap,
} from "lucide-react";
import StatusDot from "../../components/ui/StatusDot";

// ─── Constants ────────────────────────────────────────────────
const TIPO_LABEL = {
  accidente: "Accidente",
  hueco: "Hueco peligroso",
  arroyo: "Arroyo / Inundación",
  semaforo_danado: "Semáforo dañado",
  otro: "Otro",
};

const TIPO_ICON = {
  accidente: Navigation2,
  hueco: AlertTriangle,
  arroyo: AlertTriangle,
  semaforo_danado: Zap,
  otro: Timer,
};

const TIPO_TONE = {
  accidente: {
    text: "text-[var(--crit)]",
    bg: "bg-[var(--crit-tint)]",
    border: "border-[var(--crit)]/25",
  },
  hueco: {
    text: "text-[var(--warn)]",
    bg: "bg-[var(--warn-tint)]",
    border: "border-[var(--warn)]/25",
  },
  arroyo: {
    text: "text-[var(--accent)]",
    bg: "bg-[var(--accent-tint)]",
    border: "border-[var(--accent)]/25",
  },
  semaforo_danado: {
    text: "text-[var(--warn)]",
    bg: "bg-[var(--warn-tint)]",
    border: "border-[var(--warn)]/25",
  },
  otro: {
    text: "text-[var(--text-secondary)]",
    bg: "bg-[var(--surface-muted)]",
    border: "border-[var(--border)]",
  },
};

const SEVERIDAD_PRIORIDAD = {
  1: "Media",
  2: "Media",
  3: "Alta",
  4: "Alta",
  5: "Crítica",
};

const ESTADO_TONE = {
  pendiente: "warn",
  confirmado: "ok",
  inactivo: "muted",
};

// Color hex para el badge pill de cada estado
const ESTADO_BADGE_COLOR = {
  pendiente: "#EAB308",
  inactivo: "#475569",
  resuelto: "#3B82F6",
};

const PRIORIDAD_STYLES = {
  Crítica: "bg-[var(--crit-tint)] text-[var(--crit)] border-[var(--crit)]/30",
  Alta: "bg-[var(--warn-tint)] text-[var(--warn)] border-[var(--warn)]/30",
  Media:
    "bg-[var(--accent-tint)] text-[var(--accent)] border-[var(--accent)]/30",
};

// ─── Helpers ──────────────────────────────────────────────────
function tiempoRelativo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} h`;
  }
  const d = Math.floor(diff / 86400);
  return `${d} d`;
}

function adaptarReporte(r) {
  const tipoKey = r.tipo ?? "otro";
  return {
    id: r.id,
    tipoKey,
    tipo: TIPO_LABEL[tipoKey] ?? tipoKey,
    Icon: TIPO_ICON[tipoKey] ?? Timer,
    tone: TIPO_TONE[tipoKey] ?? TIPO_TONE.otro,
    direccion: r.direccion?.trim() || null,
    lat: r.latitud,
    lng: r.longitud,
    descripcion: r.descripcion ?? "Sin descripción",
    hace: tiempoRelativo(r.created_at),
    createdAt: r.created_at,
    estado: r.estado ?? "pendiente",
    prioridad: SEVERIDAD_PRIORIDAD[r.severidad] ?? "Media",
    foto_url: r.foto_url ?? null,
  };
}

// ─── Modal ────────────────────────────────────────────────────
function ReporteModal({ reporte, onClose }) {
  const [displayDir, setDisplayDir] = useState(reporte.direccion);

  useEffect(() => {
    if (reporte.direccion) {
      setDisplayDir(reporte.direccion);
      return;
    }
    if (reporte.lat == null || reporte.lng == null) {
      setDisplayDir("Sin dirección");
      return;
    }
    reverseGeocode(reporte.lat, reporte.lng).then((addr) => {
      setDisplayDir(addr ?? "Sin dirección");
    });
  }, [reporte.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="
            relative w-full max-w-lg
            bg-[var(--surface)] rounded-2xl overflow-hidden
            shadow-[var(--shadow-pop)] border border-[var(--border)]
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo with overlay */}
          {reporte.foto_url ? (
            <div className="relative h-[180px] overflow-hidden">
              <img
                src={reporte.foto_url}
                alt="Foto del reporte"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45" />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-black/55 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                <Camera size={11} strokeWidth={2.5} /> Foto del reporte
              </span>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/55 text-white hover:bg-black/75 backdrop-blur-sm transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={2.3} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)] font-mono">
                <Camera size={12} /> Sin foto adjunta
              </span>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={2.3} />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)] font-mono">
              Reporte · #{String(reporte.id).slice(0, 8)}
            </p>
            <h2 className="font-display text-[20px] font-bold tracking-tight text-[var(--text-primary)] leading-tight mt-1">
              {reporte.tipo}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`
                  inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full
                  text-[11px] font-bold border
                  ${PRIORIDAD_STYLES[reporte.prioridad] ?? PRIORIDAD_STYLES.Media}
                `}
              >
                <AlertTriangle size={11} strokeWidth={2.4} />
                {reporte.prioridad}
              </span>
              <span
                className="
                  inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full
                  text-[11px] font-bold border
                  bg-[var(--ok-tint)] text-[var(--ok)] border-[var(--ok)]/30
                "
              >
                <Radio size={11} strokeWidth={2.4} />
                {reporte.estado.charAt(0).toUpperCase() +
                  reporte.estado.slice(1)}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <InfoCell
              icon={MapPin}
              label="Dirección"
              value={displayDir ?? "…"}
              span="col-span-2"
            />
            <InfoCell
              icon={Clock}
              label="Reportado"
              value={`hace ${reporte.hace}`}
            />
            <InfoCell icon={Timer} label="Categoría" value={reporte.tipo} />
            {reporte.descripcion !== "Sin descripción" && (
              <InfoCell
                icon={FileText}
                label="Descripción"
                value={reporte.descripcion}
                span="col-span-2"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function InfoCell({ icon: Icon, label, value, span = "" }) {
  return (
    <div className={`flex items-start gap-2.5 ${span}`}>
      <div className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center shrink-0 mt-0.5">
        <Icon
          size={13}
          strokeWidth={2.1}
          className="text-[var(--text-tertiary)]"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)] font-mono mb-0.5">
          {label}
        </p>
        <p className="text-[13px] text-[var(--text-primary)] leading-snug">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Feed ─────────────────────────────────────────────────────
const MAX_RECIENTES = 5;

// Divider label between sections
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 border-t border-[var(--border)]" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-mono shrink-0">
        {children}
      </span>
      <div className="flex-1 border-t border-[var(--border)]" />
    </div>
  );
}

// Badge pill for inactive status
function EstadoBadge({ estado }) {
  const color = ESTADO_BADGE_COLOR[estado];
  if (!color) return null;
  const label = estado.charAt(0).toUpperCase() + estado.slice(1);
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        fontSize: 10,
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: 10,
        letterSpacing: "0.04em",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {label}
    </span>
  );
}

// Single card — shared by both sections
function ReporteCard({ r, esNuevo, esReciente = false, onClick }) {
  const Icon = r.Icon;
  const [displayDir, setDisplayDir] = useState(r.direccion);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (r.direccion) {
      setDisplayDir(r.direccion);
      return;
    }
    if (r.lat == null || r.lng == null) {
      setDisplayDir("Sin dirección");
      return;
    }
    if (pendingRef.current) return;
    pendingRef.current = true;
    reverseGeocode(r.lat, r.lng).then((addr) => {
      setDisplayDir(addr ?? "Sin dirección");
    });
  }, [r.id, r.lat, r.lng, r.direccion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.li
      key={r.id}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: esReciente ? 0.62 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <button
        onClick={onClick}
        className={`
          group w-full text-left p-3 rounded-xl
          transition-all duration-200 cursor-pointer
          border
          ${
            esNuevo
              ? "animate-slide-in-top bg-[var(--ok-tint)] border-[var(--ok)]/30 hover:border-[var(--ok)]/50"
              : "bg-transparent border-transparent hover:bg-[var(--surface-muted)] hover:border-[var(--border)]"
          }
        `}
      >
        <div className="flex items-start gap-3">
          <div
            className={`
              w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              border ${r.tone.bg} ${r.tone.border}
            `}
          >
            <Icon size={15} strokeWidth={2.2} className={r.tone.text} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-[var(--text-primary)] truncate font-display tracking-tight">
                {r.tipo}
              </p>
              {esNuevo && (
                <span className="text-[9px] font-bold px-1.5 h-4 rounded bg-[var(--ok)] text-white leading-none inline-flex items-center font-mono uppercase tracking-wider">
                  New
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5 truncate">
              <MapPin
                size={10}
                strokeWidth={2.2}
                className="shrink-0 text-[var(--text-tertiary)]"
              />
              <span className="truncate">{displayDir ?? "…"}</span>
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
              {r.descripcion}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-mono text-[10px] text-[var(--text-tertiary)] tabular">
              {r.hace}
            </span>
            {esReciente ? (
              <EstadoBadge estado={r.estado} />
            ) : (
              <StatusDot
                tone={ESTADO_TONE[r.estado] ?? "muted"}
                pulse={r.estado === "pendiente"}
                size="sm"
              />
            )}
          </div>
        </div>
      </button>
    </motion.li>
  );
}

export default function ReporteFeed({
  reportes = [],
  newIds = new Set(),
  recientes = [],
  newRecentIds = new Set(),
}) {
  const [seleccionado, setSeleccionado] = useState(null);
  const adaptados = reportes.map(adaptarReporte);
  const adaptadosRecientes = recientes.map(adaptarReporte);
  const numNuevos =
    adaptados.filter((r) => newIds.has(r.id)).length +
    adaptadosRecientes.filter((r) => newRecentIds.has(r.id)).length;

  const recientesVisibles = adaptadosRecientes.slice(0, MAX_RECIENTES);
  const hayMas = adaptadosRecientes.length > MAX_RECIENTES;

  return (
    <>
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-mono">
            Live Feed
          </p>
          {numNuevos > 0 && (
            <motion.span
              key={numNuevos}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--ok-tint)] text-[var(--ok)] text-[10px] font-bold"
            >
              <Bell size={10} strokeWidth={2.5} />
              {numNuevos} nuevo{numNuevos > 1 ? "s" : ""}
            </motion.span>
          )}
        </div>
        <h2 className="font-display text-[16px] font-bold tracking-tight text-[var(--text-primary)] leading-tight mt-1">
          Reportes Ciudadanos
        </h2>
        <div className="flex items-center gap-2 mt-1.5">
          <StatusDot tone="ok" label="Sincronizado en vivo" />
        </div>
      </div>

      {/* ── Sección "En curso" ── */}
      <SectionLabel>En curso</SectionLabel>
      <ul className="space-y-1.5">
        {adaptados.length === 0 && (
          <li className="text-xs text-[var(--text-tertiary)] text-center py-4">
            Sin reportes activos
          </li>
        )}
        <AnimatePresence initial={false}>
          {adaptados.map((r) => (
            <ReporteCard
              key={r.id}
              r={r}
              esNuevo={newIds.has(r.id)}
              esReciente={false}
              onClick={() => setSeleccionado(r)}
            />
          ))}
        </AnimatePresence>
      </ul>

      {/* ── Sección "Recientes" ── */}
      <SectionLabel>Recientes</SectionLabel>
      <ul className="space-y-1.5">
        {recientesVisibles.length === 0 && (
          <li className="text-xs text-[var(--text-tertiary)] text-center py-4">
            Sin reportes recientes
          </li>
        )}
        <AnimatePresence initial={false}>
          {recientesVisibles.map((r) => (
            <ReporteCard
              key={r.id}
              r={r}
              esNuevo={newRecentIds.has(r.id)}
              esReciente={true}
              onClick={() => setSeleccionado(r)}
            />
          ))}
        </AnimatePresence>
        {hayMas && (
          <li className="pt-1">
            <p className="text-[11px] text-[var(--text-tertiary)] text-center font-mono">
              + {adaptadosRecientes.length - MAX_RECIENTES} más — ver en{" "}
              <span className="text-[var(--accent)] font-bold cursor-pointer hover:underline">
                Reportes
              </span>
            </p>
          </li>
        )}
      </ul>

      {seleccionado && (
        <ReporteModal
          reporte={seleccionado}
          onClose={() => setSeleccionado(null)}
        />
      )}
    </>
  );
}
