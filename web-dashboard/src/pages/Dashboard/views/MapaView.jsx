// src/pages/Dashboard/views/MapaView.jsx
import MapaGoogleMaps from "../MapaGoogleMaps";
import ReporteFeed from "../ReporteFeed";
import { useReportesLive } from "../useReportesLive";

export default function MapaView({ año, mes }) {
  const { reportes, newIds } = useReportesLive();

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
      <section className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100 dark:bg-gray-950">
        <MapaGoogleMaps
          año={año}
          mes={mes}
          alturaContenedor="520px"
          reportes={reportes}
          newIds={newIds}
        />
      </section>
      <aside className="w-full lg:w-[30%] shrink-0 lg:overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <ReporteFeed reportes={reportes} newIds={newIds} />
      </aside>
    </div>
  );
}
