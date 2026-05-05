// src/pages/Dashboard/views/ReportesView.jsx

const MOCK_REPORTES = [
  { id: "RV-9081", usuario_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", created_at: "2024-04-29T14:32:00Z", direccion: "Calle 84 con 51B",        tipo: "Siniestro", severidad: "Heridos"     },
  { id: "RV-9082", usuario_id: "a1b2c3d4-0000-4000-8000-111111111111", created_at: "2024-04-29T09:15:00Z", direccion: "Vía 40 (Puerta de Oro)",  tipo: "Obstáculo", severidad: "Solo Daños"  },
  { id: "RV-9083", usuario_id: "b2c3d4e5-0001-4001-8001-222222222222", created_at: "2024-04-28T18:47:00Z", direccion: "Carrera 46 con 72",        tipo: "Semáforo",  severidad: "Leve"        },
  { id: "RV-9084", usuario_id: "c3d4e5f6-0002-4002-8002-333333333333", created_at: "2024-04-28T11:05:00Z", direccion: "Av. Circunvalar KL-05",    tipo: "Siniestro", severidad: "Muertos"     },
  { id: "RV-9085", usuario_id: "d4e5f6a7-0003-4003-8003-444444444444", created_at: "2024-04-27T16:22:00Z", direccion: "Calle 30 con Cra 8",       tipo: "Hueco",     severidad: "Riesgo Alto" },
  { id: "RV-9086", usuario_id: "e5f6a7b8-0004-4004-8004-555555555555", created_at: "2024-04-27T08:58:00Z", direccion: "Carrera 53 con 82",        tipo: "Siniestro", severidad: "Solo Daños"  },
  { id: "RV-9087", usuario_id: "f6a7b8c9-0005-4005-8005-666666666666", created_at: "2024-04-26T20:10:00Z", direccion: "Calle 17 con Cra 4B",      tipo: "Obstáculo", severidad: "Leve"        },
  { id: "RV-9088", usuario_id: "a7b8c9d0-0006-4006-8006-777777777777", created_at: "2024-04-26T13:34:00Z", direccion: "Av. Murillo con Cra 38",   tipo: "Siniestro", severidad: "Heridos"     },
  { id: "RV-9089", usuario_id: "b8c9d0e1-0007-4007-8007-888888888888", created_at: "2024-04-25T07:45:00Z", direccion: "Cra 46 con Calle 76",      tipo: "Hueco",     severidad: "Solo Daños"  },
  { id: "RV-9090", usuario_id: "c9d0e1f2-0008-4008-8008-999999999999", created_at: "2024-04-25T17:02:00Z", direccion: "Calle 72 con Cra 50",      tipo: "Siniestro", severidad: "Muertos"     },
];

const SEVERIDAD_COLORS = {
  "Heridos":     "bg-orange-100 text-orange-700 border border-orange-200",
  "Solo Daños":  "bg-blue-100   text-blue-700   border border-blue-200",
  "Muertos":     "bg-red-100    text-red-700    border border-red-200",
  "Leve":        "bg-slate-100  text-slate-600  border border-slate-200",
  "Riesgo Alto": "bg-purple-100 text-purple-700 border border-purple-200",
};

const TIPO_ICON = {
  "Siniestro": "⚠️",
  "Obstáculo": "ℹ️",
  "Semáforo":  "🚦",
  "Hueco":     "🕳️",
};

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function truncarId(uuid) {
  return uuid.slice(0, 8) + "…";
}

export default function ReportesView() {
  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 dark:bg-gray-900">
      {/* Título */}
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          Base de Datos Maestras · Reportes RV
        </h2>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
          Datos de muestra — {MOCK_REPORTES.length} registros
        </p>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-gray-700">
              {["ID Reporte", "Usuario ID", "Fecha / Hora", "Dirección", "Tipo", "Severidad"].map((col) => (
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
            {MOCK_REPORTES.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-slate-50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors ${
                  i === MOCK_REPORTES.length - 1 ? "border-b-0" : ""
                }`}
              >
                {/* ID Reporte */}
                <td className="px-5 py-4">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    {r.id}
                  </span>
                </td>

                {/* Usuario ID */}
                <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-gray-400">
                  <span title={r.usuario_id}>{truncarId(r.usuario_id)}</span>
                </td>

                {/* Fecha / Hora */}
                <td className="px-5 py-4 text-slate-600 dark:text-gray-300 whitespace-nowrap">
                  {formatFecha(r.created_at)}
                </td>

                {/* Dirección */}
                <td className="px-5 py-4 text-slate-700 dark:text-gray-200">
                  {r.direccion}
                </td>

                {/* Tipo */}
                <td className="px-5 py-4 text-slate-700 dark:text-gray-200">
                  <span className="flex items-center gap-1.5">
                    <span>{TIPO_ICON[r.tipo] ?? "📌"}</span>
                    {r.tipo}
                  </span>
                </td>

                {/* Severidad */}
                <td className="px-5 py-4">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
                      SEVERIDAD_COLORS[r.severidad] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.severidad}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}