// src/pages/Dashboard/views/ReportesView.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { getReportes, cambiarEstadoReporte } from "../../../api/reportes";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const SEVERIDAD_COLORS = {
  Leve: "bg-slate-100  text-slate-600  border border-slate-200",
  "Solo Daños": "bg-blue-100   text-blue-700   border border-blue-200",
  "Riesgo Alto": "bg-purple-100 text-purple-700 border border-purple-200",
  Heridos: "bg-orange-100 text-orange-700 border border-orange-200",
  Muertos: "bg-red-100    text-red-700    border border-red-200",
};

const ESTADO_BADGE = {
  pendiente: "bg-orange-100 text-orange-700 border border-orange-200",
  confirmado: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  inactivo: "bg-slate-100 text-slate-500 border border-slate-200",
};

const ESTADO_ICON = {
  pendiente: "🟡",
  confirmado: "🟢",
  inactivo: "⚪",
};

const TIPO_ICON = {
  accidente: "⚠️",
  hueco: "🕳️",
  arroyo: "🌊",
  semaforo_danado: "🚦",
  otro: "📌",
};

const SEVERIDAD_LABEL = {
  1: "Leve",
  2: "Solo Daños",
  3: "Riesgo Alto",
  4: "Heridos",
  5: "Muertos",
};

const TIPO_LABEL = {
  accidente: "Accidente",
  hueco: "Hueco",
  arroyo: "Arroyo",
  semaforo_danado: "Semáforo",
  otro: "Otro",
};

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function truncarId(uuid) {
  return uuid.slice(0, 8) + "…";
}

export default function ReportesView() {
  const { isAdmin } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  // Mapa id → estado de carga de la acción por fila
  const [accionLoading, setAccionLoading] = useState({});

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
    // Carga inicial
    cargarReportes(true);

    // Realtime: refetch inmediato ante cualquier cambio en la tabla reportes
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

  // IDs de reportes padre que ya están confirmados.
  // Los hijos (reporte_padre_id !== null) heredan visualmente ese estado
  // SOLO en esta vista — en la BD y en el feed/mapa el estado real no cambia.
  const padresConfirmados = useMemo(
    () =>
      new Set(
        reportes.filter((r) => r.estado === "confirmado").map((r) => r.id),
      ),
    [reportes],
  );

  // Estado visual: si el reporte es pendiente y su padre está confirmado → mostrar como confirmado.
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

  const filtrados =
    filtroEstado === "todos"
      ? reportes
      : reportes.filter((r) => estadoDisplayDe(r) === filtroEstado);

  async function handleCambioEstado(r, nuevoEstado) {
    // Si es un hijo con padre, actuamos sobre el padre para que el cambio sea real en BD
    const idObjetivo = r.reporte_padre_id ?? r.id;
    setAccionLoading((prev) => ({ ...prev, [r.id]: true }));
    try {
      await cambiarEstadoReporte(idObjetivo, nuevoEstado);
      // El Realtime de Supabase disparará cargarReportes automáticamente
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAccionLoading((prev) => ({ ...prev, [r.id]: false }));
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 dark:bg-gray-900">
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          Base de Datos Maestras · Reportes
        </h2>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
          {loading
            ? "Cargando…"
            : error
              ? `Error: ${error}`
              : `${filtrados.length} de ${reportes.length} registros`}
        </p>
        {/* Filtros de estado */}
        {!loading && !error && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {["todos", "pendiente", "confirmado", "inactivo"].map((e) => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filtroEstado === e
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:border-blue-500"
                }`}
              >
                {e !== "todos" && <span>{ESTADO_ICON[e]}</span>}
                {e.charAt(0).toUpperCase() + e.slice(1)}
                <span className="ml-0.5 opacity-60">
                  (
                  {e === "todos"
                    ? reportes.length
                    : reportes.filter((r) => estadoDisplayDe(r) === e).length}
                  )
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-gray-700">
              {[
                "ID",
                "Usuario ID",
                "Fecha / Hora",
                "Dirección",
                "Tipo",
                "Severidad",
                "Estado",
                ...(isAdmin ? ["Acciones"] : []),
              ].map((col) => (
                <th
                  key={col}
                  className="px-5 py-3 text-left text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r, i) => {
              const sevLabel =
                SEVERIDAD_LABEL[r.severidad] ?? String(r.severidad);
              const tipoLabel = TIPO_LABEL[r.tipo] ?? r.tipo;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors ${i === filtrados.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="px-5 py-4">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                      #{r.id}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-gray-400">
                    <span title={r.usuario_id}>{truncarId(r.usuario_id)}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-gray-300 whitespace-nowrap">
                    {formatFecha(r.created_at)}
                  </td>
                  <td className="px-5 py-4 text-slate-700 dark:text-gray-200">
                    {r.direccion ?? "Sin dirección"}
                  </td>
                  <td className="px-5 py-4 text-slate-700 dark:text-gray-200">
                    <span className="flex items-center gap-1.5">
                      <span>{TIPO_ICON[r.tipo] ?? "📌"}</span>
                      {tipoLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${SEVERIDAD_COLORS[sevLabel] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {sevLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full capitalize ${ESTADO_BADGE[estadoDisplayDe(r)] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      <span>{ESTADO_ICON[estadoDisplayDe(r)] ?? "⚫"}</span>
                      {estadoDisplayDe(r)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {estadoDisplayDe(r) === "pendiente" && (
                          <button
                            onClick={() => handleCambioEstado(r, "confirmado")}
                            disabled={accionLoading[r.id]}
                            title="Confirmar reporte"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            {accionLoading[r.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Confirmar
                          </button>
                        )}
                        {estadoDisplayDe(r) === "confirmado" && (
                          <button
                            onClick={() => handleCambioEstado(r, "inactivo")}
                            disabled={accionLoading[r.id]}
                            title="Marcar como inactivo"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            {accionLoading[r.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
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
    </main>
  );
}
