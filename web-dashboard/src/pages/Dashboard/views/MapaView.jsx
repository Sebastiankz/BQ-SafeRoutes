// src/pages/Dashboard/views/MapaView.jsx
import MapaGoogleMaps from "../MapaGoogleMaps";
import ReporteFeed from "../ReporteFeed";

export default function MapaView({
  año,
  mes,
  reportes = [],
  newIds = new Set(),
  recientes = [],
  newRecentIds = new Set(),
}) {
  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
      {/* Map column — on mobile: explicit h-[55vh] so the absolute-positioned
          Google Maps container has a concrete pixel height to fill.
          On desktop (lg+): flex-1 so it takes all remaining space. */}
      <section className="relative h-[55vh] lg:flex-1 lg:h-auto shrink-0 lg:shrink min-w-0 bg-[var(--bg-primary)] p-3 lg:p-4">
        <div
          className="
            absolute top-3 right-3 bottom-3 left-3
            lg:top-4 lg:right-4 lg:bottom-4 lg:left-4
            rounded-2xl overflow-hidden
            border border-[var(--border)] shadow-[var(--shadow-soft)]
            bg-[var(--surface)]
          "
        >
          <MapaGoogleMaps
            año={año}
            mes={mes}
            alturaContenedor="100%"
            reportes={reportes}
            newIds={newIds}
          />
        </div>
      </section>

      <aside
        className="
          w-full lg:w-[340px] shrink-0 lg:overflow-y-auto scroll-thin
          max-h-[45vh] overflow-y-auto lg:max-h-none
          border-t lg:border-t-0 lg:border-l border-[var(--border)]
          bg-[var(--surface)] p-4
        "
      >
        <ReporteFeed
          reportes={reportes}
          newIds={newIds}
          recientes={recientes}
          newRecentIds={newRecentIds}
        />
      </aside>
    </div>
  );
}
