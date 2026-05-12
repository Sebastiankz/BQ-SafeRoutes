// src/pages/Dashboard/views/ReportesView.jsx
import { useEffect, useState } from "react";
import { getReportes } from "../../../api/reportes";

const SEVERIDAD_COLORS = {
  Leve: "bg-slate-100  text-slate-600  border border-slate-200",
  "Solo Daños": "bg-blue-100   text-blue-700   border border-blue-200",
  "Riesgo Alto": "bg-purple-100 text-purple-700 border border-purple-200",
  Heridos: "bg-orange-100 text-orange-700 border border-orange-200",
  Muertos: "bg-red-100    text-red-700    border border-red-200",
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
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReportes()
      .then(setReportes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
              : `${reportes.length} registros`}
        </p>
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
            {reportes.map((r, i) => {
              const sevLabel =
                SEVERIDAD_LABEL[r.severidad] ?? String(r.severidad);
              const tipoLabel = TIPO_LABEL[r.tipo] ?? r.tipo;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors ${i === reportes.length - 1 ? "border-b-0" : ""}`}
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
                  <td className="px-5 py-4 text-slate-600 dark:text-gray-300 capitalize">
                    {r.estado}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
