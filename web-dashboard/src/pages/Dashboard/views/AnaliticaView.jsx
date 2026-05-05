// src/pages/Dashboard/views/AnaliticaView.jsx
import { Activity, Users, BarChart2 } from "lucide-react";
import KPICard from "../KPICard";
import {
  HourlyChart,
  DailyChart,
  GravedadChart,
  TipologiaChart,
  Top5Vias,
} from "../Charts";

export default function AnaliticaView({ result, loading, kpi }) {
  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100 dark:bg-gray-950 space-y-4">
      {/* KPIs */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300 ${
          loading ? "opacity-40 pointer-events-none" : "opacity-100"
        }`}
      >
        {kpi && (
          <>
            <KPICard
              titulo="Total Histórico"
              valor={kpi.total}
              tendencia={kpi.t1}
              icono={<Activity size={20} />}
              color="bg-blue-600"
            />
            <KPICard
              titulo="Total Víctimas"
              valor={kpi.victimas}
              tendencia={kpi.t2}
              icono={<Users size={20} />}
              color="bg-red-500"
            />
            <KPICard
              titulo="Promedio Mensual"
              valor={kpi.promedio}
              tendencia={kpi.t3}
              icono={<BarChart2 size={20} />}
              color="bg-amber-500"
            />
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Cargando datos...
        </div>
      )}

      {/* Gráficas */}
      {result && !loading && (
        <>
          <HourlyChart data={result.hourlyData} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DailyChart data={result.dailyData} />
            <GravedadChart data={result.gravedadData} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TipologiaChart data={result.tipologiaData} />
            <Top5Vias data={result.top5Vias} />
          </div>
        </>
      )}
    </main>
  );
}
