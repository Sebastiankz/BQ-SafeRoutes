// src/pages/Dashboard/views/ReportesView.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { getReportes, cambiarEstadoReporte } from "../../../api/reportes";
import { supabase } from "../../../lib/supabase";
import { reverseGeocode } from "../../../lib/geocode";
import { useAuth } from "../../../context/AuthContext";
import SeverityBadge from "../../../components/ui/SeverityBadge";
import StatusDot from "../../../components/ui/StatusDot";

// ─── Maps ─────────────────────────────────────────────────────
const SEVERIDAD_LABEL = {
  1: "Baja",
  2: "Media",
  3: "Alta",
  4: "Alta",
  5: "Crítica",
};

const TIPO_LABEL = {
  accidente: "Accidente",
  hueco: "Hueco",
  arroyo: "Arroyo",
  semaforo_danado: "Semáforo",
  otro: "Otro",
};

const ESTADO_TONE = {
  pendiente: "warn",
  confirmado: "ok",
  inactivo: "muted",
};

const ESTADO_LABEL = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  inactivo: "Inactivo",
};

const ESTADOS_FILTRO = ["todos", "pendiente", "confirmado", "inactivo"];

// ─── Helpers ──────────────────────────────────────────────────
function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function truncarId(idStr) {
  const s = String(idStr ?? "");
  if (s.length <= 8) return s;
  return s.slice(0, 6) + "…";
}

function emailInitial(email) {
  return email ? email[0].toUpperCase() : "?";
}

function COLUMNS(isAdmin) {
  return [
    { key: "id", label: "ID", sortable: true, width: "w-[92px]" },
    { key: "usuario_email", label: "Email", sortable: true },
    { key: "created_at", label: "Fecha", sortable: true, width: "w-[140px]" },
    { key: "direccion", label: "Dirección", sortable: false },
    { key: "tipo", label: "Tipo", sortable: true, width: "w-[110px]" },
    {
      key: "severidad",
      label: "Severidad",
      sortable: true,
      width: "w-[130px]",
    },
    { key: "estado", label: "Estado", sortable: true, width: "w-[120px]" },
    ...(isAdmin
      ? [{ key: "acciones", label: "", sortable: false, width: "w-[110px]" }]
      : []),
  ];
}

// ─── Component ────────────────────────────────────────────────
export default function ReportesView() {
  const { isAdmin } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [query, setQuery] = useState("");
  const [accionLoading, setAccionLoading] = useState({});
  const [sort, setSort] = useState({ col: "created_at", dir: "desc" });
  const [geoCache, setGeoCache] = useState({});
  const geoPendingRef = useRef(new Set());

  const cargarReportes = useCallback((isInitial = false) => {
    if (isInitial) setLoading(true);
    getReportes(200, 0, "todos")
      .then(setReportes)
      .catch((e) => setError(e.message))
      .finally(() => {
        if (isInitial) setLoading(false);
      });
  }, []);

  useEffect(() => {
    cargarReportes(true);
    const channel = supabase
      .channel("reportes-view-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reportes" },
        () => cargarReportes(false),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargarReportes]);

  // Geocodificar reportes sin dirección
  useEffect(() => {
    reportes.forEach(async (r) => {
      if (r.direccion?.trim()) return;
      if (r.latitud == null || r.longitud == null) return;
      if (geoPendingRef.current.has(r.id)) return;
      geoPendingRef.current.add(r.id);
      const addr = await reverseGeocode(r.latitud, r.longitud);
      if (addr) setGeoCache((prev) => ({ ...prev, [r.id]: addr }));
    });
  }, [reportes]); // eslint-disable-line react-hooks/exhaustive-deps

  const padresConfirmados = useMemo(
    () =>
      new Set(
        reportes.filter((r) => r.estado === "confirmado").map((r) => r.id),
      ),
    [reportes],
  );

  function estadoDisplayDe(r) {
    if (
      r.estado === "pendiente" &&
      r.reporte_padre_id !== null &&
      padresConfirmados.has(r.reporte_padre_id)
    ) {
      return "confirmado";
    }
    return r.estado;
  }

  const filtrados = useMemo(() => {
    let arr = reportes;
    if (filtroEstado !== "todos") {
      arr = arr.filter((r) => estadoDisplayDe(r) === filtroEstado);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter(
        (r) =>
          String(r.id).includes(q) ||
          (r.usuario_email ?? "").toLowerCase().includes(q) ||
          (r.direccion ?? geoCache[r.id] ?? "").toLowerCase().includes(q) ||
          (TIPO_LABEL[r.tipo] ?? r.tipo ?? "").toLowerCase().includes(q),
      );
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportes, filtroEstado, query, padresConfirmados, geoCache]);

  const sorted = useMemo(() => {
    const arr = [...filtrados];
    const numericCols = ["id", "severidad", "validaciones"];
    arr.sort((a, b) => {
      let cmp;
      if (numericCols.includes(sort.col)) {
        cmp = (Number(a[sort.col]) || 0) - (Number(b[sort.col]) || 0);
      } else if (sort.col === "estado") {
        cmp = String(estadoDisplayDe(a)).localeCompare(
          String(estadoDisplayDe(b)),
          "es",
        );
      } else {
        cmp = String(a[sort.col] ?? "").localeCompare(
          String(b[sort.col] ?? ""),
          "es",
        );
      }
      return sort.dir === "desc" ? -cmp : cmp;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, sort, padresConfirmados]);

  function toggleSort(col) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { col, dir: "desc" },
    );
  }

  async function handleCambioEstado(r, nuevoEstado) {
    const idObjetivo = r.reporte_padre_id ?? r.id;
    setAccionLoading((prev) => ({ ...prev, [r.id]: true }));
    try {
      await cambiarEstadoReporte(idObjetivo, nuevoEstado);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAccionLoading((prev) => ({ ...prev, [r.id]: false }));
    }
  }

  const columns = COLUMNS(isAdmin);
  const counts = useMemo(() => {
    const c = { todos: reportes.length };
    ESTADOS_FILTRO.slice(1).forEach((e) => {
      c[e] = reportes.filter((r) => estadoDisplayDe(r) === e).length;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportes, padresConfirmados]);

  // ─── Render ────────────────────────────────────────────────
  return (
    <main className="flex-1 overflow-y-auto scroll-thin bg-[var(--bg-primary)] p-4 sm:p-5 lg:p-7">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-mono">
          Base de Datos Maestra
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap mt-1">
          <h1 className="font-display text-[26px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
            Historial de Reportes
          </h1>
          <p className="text-xs font-mono text-[var(--text-secondary)]">
            {loading
              ? "Cargando…"
              : error
                ? `Error: ${error}`
                : `${sorted.length} de ${reportes.length} registros`}
          </p>
        </div>
      </motion.header>

      {/* Toolbar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-soft)] mb-4">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-[var(--border)] flex-wrap gap-y-2">
          <div className="flex items-center gap-1 flex-wrap gap-y-2">
            {ESTADOS_FILTRO.map((e) => {
              const active = filtroEstado === e;
              const tone =
                e === "todos" ? "muted" : (ESTADO_TONE[e] ?? "muted");
              return (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={`
                    inline-flex items-center gap-2 h-8 px-3 rounded-full text-xs font-semibold
                    border transition-all cursor-pointer
                    ${
                      active
                        ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-[var(--shadow-glow)]"
                        : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    }
                  `}
                >
                  {e !== "todos" && (
                    <StatusDot
                      tone={active ? "muted" : tone}
                      pulse={false}
                      size="sm"
                    />
                  )}
                  {e[0].toUpperCase() + e.slice(1)}
                  <span
                    className={`font-mono text-[10px] tabular ${
                      active ? "text-white/80" : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {counts[e] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID, email, dirección…"
              className="
                w-full h-9 pl-9 pr-3 rounded-full
                bg-[var(--surface-muted)] border border-[var(--border)]
                text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--surface)]
                transition-colors
              "
            />
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
          </div>
        )}
        {error && !loading && (
          <p className="text-[var(--crit)] text-sm text-center py-10">
            {error}
          </p>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[900px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr>
                  {columns.map((c) => {
                    const isActive = sort.col === c.key;
                    return (
                      <th
                        key={c.key}
                        className={`
                          ${c.width ?? ""}
                          text-left bg-[var(--surface-muted)]
                          border-b border-[var(--border)]
                          px-4 py-3
                          text-[10px] font-bold uppercase tracking-[0.14em]
                          text-[var(--text-tertiary)]
                          ${c.sortable ? "cursor-pointer select-none hover:text-[var(--accent)]" : ""}
                        `}
                        onClick={
                          c.sortable ? () => toggleSort(c.key) : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {c.label}
                          {c.sortable && (
                            <span className="inline-flex flex-col leading-none">
                              {isActive ? (
                                sort.dir === "desc" ? (
                                  <ChevronDown
                                    size={11}
                                    strokeWidth={2.5}
                                    className="text-[var(--accent)]"
                                  />
                                ) : (
                                  <ChevronUp
                                    size={11}
                                    strokeWidth={2.5}
                                    className="text-[var(--accent)]"
                                  />
                                )
                              ) : (
                                <ChevronDown
                                  size={11}
                                  strokeWidth={2}
                                  className="opacity-30"
                                />
                              )}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="text-center py-12 text-sm text-[var(--text-tertiary)]"
                    >
                      Sin reportes que coincidan con los filtros.
                    </td>
                  </tr>
                )}
                {sorted.map((r) => {
                  const sevLabel =
                    SEVERIDAD_LABEL[r.severidad] ?? String(r.severidad);
                  const tipoLabel = TIPO_LABEL[r.tipo] ?? r.tipo;
                  const estadoDisplay = estadoDisplayDe(r);
                  const isBusy = !!accionLoading[r.id];
                  return (
                    <tr
                      key={r.id}
                      className="group transition-colors hover:bg-[var(--surface-muted)]"
                    >
                      <td className="px-4 py-3 border-b border-[var(--border)]/60">
                        <span className="font-mono text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer">
                          #{truncarId(r.id)}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--border)]/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="
                              w-7 h-7 rounded-full shrink-0
                              bg-[var(--accent-tint)] text-[var(--accent)]
                              flex items-center justify-center
                              font-display font-bold text-[11px]
                            "
                          >
                            {emailInitial(r.usuario_email)}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] truncate">
                            {r.usuario_email ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--border)]/60 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-[var(--text-secondary)] tabular">
                          {formatFecha(r.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--border)]/60 max-w-xs">
                        <span className="text-xs text-[var(--text-primary)] truncate block">
                          {r.direccion?.trim() ||
                            geoCache[r.id] ||
                            "Sin dirección"}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--border)]/60">
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {tipoLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--border)]/60">
                        <SeverityBadge level={sevLabel} />
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--border)]/60">
                        <StatusDot
                          tone={ESTADO_TONE[estadoDisplay] ?? "muted"}
                          label={ESTADO_LABEL[estadoDisplay] ?? estadoDisplay}
                          pulse={estadoDisplay === "pendiente"}
                        />
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 border-b border-[var(--border)]/60 text-right">
                          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity inline-flex items-center gap-1">
                            {estadoDisplay === "pendiente" && (
                              <button
                                disabled={isBusy}
                                onClick={() =>
                                  handleCambioEstado(r, "confirmado")
                                }
                                className="
                                  inline-flex items-center gap-1 px-2 h-7 rounded-md
                                  text-[11px] font-bold text-[var(--ok)]
                                  hover:bg-[var(--ok-tint)]
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors cursor-pointer
                                "
                              >
                                {isBusy ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={12} strokeWidth={2.4} />
                                )}
                                Confirmar
                              </button>
                            )}
                            {estadoDisplay === "confirmado" && (
                              <button
                                disabled={isBusy}
                                onClick={() =>
                                  handleCambioEstado(r, "inactivo")
                                }
                                className="
                                  inline-flex items-center gap-1 px-2 h-7 rounded-md
                                  text-[11px] font-bold text-[var(--crit)]
                                  hover:bg-[var(--crit-tint)]
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors cursor-pointer
                                "
                              >
                                {isBusy ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <XCircle size={12} strokeWidth={2.4} />
                                )}
                                Inactivar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
