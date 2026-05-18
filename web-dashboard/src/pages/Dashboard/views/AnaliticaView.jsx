// src/pages/Dashboard/views/AnaliticaView.jsx
import { motion } from "framer-motion";
import { Activity, Users, BarChart3, Loader2 } from "lucide-react";
import KPICard from "../../../components/ui/KPICard";
import {
  HourlyChart,
  DailyChart,
  GravedadChart,
  TipologiaChart,
  Top5Vias,
} from "../Charts";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function sparkFromHourly(hourly) {
  if (!hourly?.length) return [3, 5, 4, 7, 6, 8];
  const step = Math.max(1, Math.floor(hourly.length / 6));
  return hourly.filter((_, i) => i % step === 0).slice(0, 6).map((d) => d.valor);
}

export default function AnaliticaView({ result, loading, kpi }) {
  return (
    <main className="flex-1 overflow-y-auto scroll-thin p-5 lg:p-7 bg-[var(--bg-primary)]">
      {/* Section header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-mono">
            Analítica · Histórico
          </p>
          <h1 className="font-display text-[26px] font-bold text-[var(--text-primary)] tracking-tight leading-tight mt-1">
            Panorama de Riesgo Vial
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-prose">
            Indicadores agregados de siniestros viales para Barranquilla.
            Filtra por período, mes y gravedad desde la cabecera.
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-tint)] px-3 h-9 rounded-full">
            <Loader2 size={14} className="animate-spin" />
            Procesando datos
          </div>
        )}
      </motion.header>

      {/* KPI grid */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300 ${
          loading ? "opacity-40 pointer-events-none" : "opacity-100"
        }`}
      >
        {kpi && (
          <>
            <motion.div variants={item}>
              <KPICard
                titulo="Total Histórico"
                valor={kpi.total}
                tendencia={kpi.t1}
                icono={Activity}
                tone="accent"
                spark={sparkFromHourly(result?.hourlyData)}
                unidad="siniestros"
              />
            </motion.div>
            <motion.div variants={item}>
              <KPICard
                titulo="Total Víctimas"
                valor={kpi.victimas}
                tendencia={kpi.t2}
                icono={Users}
                tone="crit"
                spark={[4, 6, 5, 7, 5, 8]}
                unidad="personas"
              />
            </motion.div>
            <motion.div variants={item}>
              <KPICard
                titulo="Promedio Mensual"
                valor={kpi.promedio}
                tendencia={kpi.t3}
                icono={BarChart3}
                tone="warn"
                spark={[3, 4, 3, 5, 4, 6]}
                unidad="por mes"
              />
            </motion.div>
          </>
        )}
      </motion.section>

      {/* Charts */}
      {result && !loading && (
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-5 space-y-4"
        >
          <motion.div variants={item}>
            <HourlyChart data={result.hourlyData} />
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={item}>
              <DailyChart data={result.dailyData} />
            </motion.div>
            <motion.div variants={item}>
              <GravedadChart data={result.gravedadData} />
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={item}>
              <TipologiaChart data={result.tipologiaData} />
            </motion.div>
            <motion.div variants={item}>
              <Top5Vias data={result.top5Vias} />
            </motion.div>
          </div>
        </motion.section>
      )}
    </main>
  );
}
