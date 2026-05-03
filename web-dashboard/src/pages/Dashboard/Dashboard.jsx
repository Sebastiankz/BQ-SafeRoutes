import { useState } from "react";
import { Activity, Users, BarChart2 } from "lucide-react";
import Header from "./Header";
import KPICard from "./KPICard";
import { useDashboardData } from "./useDashboardData";
import {
  HourlyChart,
  DailyChart,
  GravedadChart,
  TipologiaChart,
  Top5Vias,
} from "./Charts";
import ReporteFeed from "./ReporteFeed";
import MapaLeaflet from "./MapaLeaflet";

export default function Dashboard() {
  const [año, setAño] = useState(2025);
  const [gravedad, setGravedad] = useState("Todas");
  const [mes, setMes] = useState("Todos");
  const [isDark, setIsDark] = useState(false);
  const { result, loading } = useDashboardData(año, gravedad, mes);

  // Mientras no hay data, no renderizamos gráficas
  const kpi = result?.kpi;

  return (
    <div
      className={`min-h-screen lg:h-screen flex flex-col font-sans ${isDark ? "dark bg-gray-950" : "bg-slate-100"}`}
    >
      <Header
        año={año}
        setAño={setAño}
        gravedad={gravedad}
        setGravedad={setGravedad}
        mes={mes}
        setMes={setMes}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden">
        <main className="w-full lg:w-[70%] overflow-y-auto p-4 lg:p-6 bg-slate-100 dark:bg-gray-950 space-y-4">
          {/* KPIs */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"}`}
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

          {/* Gráficas — solo se muestran cuando hay data */}
          {result && !loading && (
            <>
              {/* Mapa de Calor */}
              <MapaLeaflet />

              {/* Fila 1: Área (ancho completo) */}
              <HourlyChart data={result.hourlyData} />

              {/* Fila 2: Barras + Gravedad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DailyChart data={result.dailyData} />
                <GravedadChart data={result.gravedadData} />
              </div>

              {/* Fila 3: Tipología + Top 5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TipologiaChart data={result.tipologiaData} />
                <Top5Vias data={result.top5Vias} />
              </div>
            </>
          )}
        </main>

        <aside className="w-full lg:w-[30%] lg:overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <ReporteFeed />
        </aside>
      </div>
    </div>
  );
}
