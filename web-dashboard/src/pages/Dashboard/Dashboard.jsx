import { useState } from "react";
import { useDashboardData } from "./useDashboardData";
import { useReportesLive } from "./useReportesLive";
import DashboardLayout from "./layout/DashboardLayout";
import MapaView from "./views/MapaView";
import AnaliticaView from "./views/AnaliticaView";
import ReportesView from "./views/ReportesView";

export default function Dashboard() {
  const [año, setAño] = useState(2025);
  const [gravedad, setGravedad] = useState("Todas");
  const [mes, setMes] = useState("Todos");
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches,
  );
  const [seccion, setSeccion] = useState("mapa");

  const { result, loading } = useDashboardData(año, gravedad, mes);
  const { reportes, newIds, recientes, newRecentIds } = useReportesLive();

  return (
    <DashboardLayout
      año={año} setAño={setAño}
      gravedad={gravedad} setGravedad={setGravedad}
      mes={mes} setMes={setMes}
      isDark={isDark} setIsDark={setIsDark}
      seccion={seccion} setSeccion={setSeccion}
      reportesActivos={reportes.length}
    >
      {seccion === "mapa" && (
        <MapaView año={año} mes={mes} reportes={reportes} newIds={newIds} recientes={recientes} newRecentIds={newRecentIds} />
      )}
      {seccion === "analitica" && (
        <AnaliticaView result={result} loading={loading} kpi={result?.kpi} />
      )}
      {seccion === "reportes" && <ReportesView />}
    </DashboardLayout>
  );
}
