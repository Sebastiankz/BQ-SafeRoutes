// src/pages/Dashboard/Charts.jsx
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartCard from "../../components/ui/ChartCard";
import ChartTooltip from "../../components/ui/ChartTooltip";

const CHART_COLORS = {
  accent: "#2563EB",
  accentHover: "#1D4ED8",
  warn: "#D97706",
  crit: "#DC2626",
  ok: "#059669",
  violet: "#7C3AED",
};

// Editorial palette for categorical data — chosen for contrast in light theme.
const PALETTE = [
  CHART_COLORS.crit,
  CHART_COLORS.warn,
  CHART_COLORS.accent,
  CHART_COLORS.ok,
  CHART_COLORS.violet,
];

// Custom legend rendered below the chart — better than Recharts default.
function DonutLegend({ data, colors }) {
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-4 pt-2">
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <li
            key={d.name}
            className="flex items-center gap-2 text-[12px] min-w-0"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="text-[var(--text-secondary)] truncate flex-1">
              {d.name}
            </span>
            <span className="font-mono font-bold text-[var(--text-primary)] tabular">
              {pct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. Hourly risk — area with vertical gradient + dotted grid
// ─────────────────────────────────────────────────────────────
export function HourlyChart({ data }) {
  return (
    <ChartCard
      eyebrow="RISK / 24H"
      title="Mapa de Riesgo por Hora"
      meta="Distribución horaria normalizada"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 6, right: 16, left: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="2 4"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="hora"
            interval={2}
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 10,
              fontFamily: "DM Sans",
              fill: "var(--text-tertiary)",
            }}
          />
          <YAxis
            hide
            domain={[0, (max) => Math.max(max, 100)]}
          />
          <Tooltip
            cursor={{
              stroke: CHART_COLORS.accent,
              strokeWidth: 1,
              strokeDasharray: "3 3",
            }}
            content={<ChartTooltip unit=" idx" />}
          />
          <Area
            type="monotone"
            dataKey="valor"
            name="Riesgo"
            stroke={CHART_COLORS.accent}
            strokeWidth={2}
            fill="url(#hourlyFill)"
            dot={false}
            activeDot={{
              r: 4,
              stroke: "var(--surface)",
              strokeWidth: 2,
              fill: CHART_COLORS.accent,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Daily bars
// ─────────────────────────────────────────────────────────────
export function DailyChart({ data }) {
  return (
    <ChartCard
      eyebrow="WEEKDAY"
      title="Siniestros por Día"
      meta="Promedio semanal · 7 días"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barFillDaily" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={1} />
              <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="2 4"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 11,
              fontFamily: "DM Sans",
              fontWeight: 600,
              fill: "var(--text-secondary)",
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 10,
              fontFamily: "JetBrains Mono",
              fill: "var(--text-tertiary)",
            }}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--accent-tint)", radius: 6 }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="valor"
            name="Siniestros"
            fill="url(#barFillDaily)"
            radius={[6, 6, 0, 0]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 3 & 4. Donut variants — shared shell
// ─────────────────────────────────────────────────────────────
function DonutChart({ eyebrow, title, meta, data, palette = PALETTE, unit = "" }) {
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);
  const tinted = data.map((d, i) => ({ ...d, fill: palette[i % palette.length] }));
  return (
    <ChartCard eyebrow={eyebrow} title={title} meta={meta}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Pie
              data={tinted}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={86}
              paddingAngle={3}
              cornerRadius={6}
              dataKey="value"
              nameKey="name"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)] font-mono">
            Total
          </span>
          <span className="font-mono font-bold text-[26px] text-[var(--text-primary)] leading-none mt-1 tabular">
            {total.toLocaleString("es-CO")}
          </span>
        </div>
      </div>
      <DonutLegend data={data} colors={palette} />
    </ChartCard>
  );
}

export function GravedadChart({ data }) {
  // Use semantic colors keyed by severity name when possible.
  const palette = data.map((d) => {
    const n = d.name?.toLowerCase() ?? "";
    if (n.includes("muert")) return CHART_COLORS.crit;
    if (n.includes("herid")) return CHART_COLORS.warn;
    if (n.includes("daño") || n.includes("dano")) return CHART_COLORS.accent;
    return CHART_COLORS.ok;
  });
  return (
    <DonutChart
      eyebrow="SEVERITY"
      title="Proporción de Gravedad"
      meta="Distribución por tipo"
      data={data}
      palette={palette}
    />
  );
}

export function TipologiaChart({ data }) {
  return (
    <DonutChart
      eyebrow="TYPOLOGY"
      title="Tipología de Siniestros"
      meta="Top categorías"
      data={data}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Top 5 dangerous roads — horizontal bars with gradient fill
// ─────────────────────────────────────────────────────────────
export function Top5Vias({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.cantidad), 1);

  return (
    <ChartCard
      eyebrow="HOTSPOTS"
      title="Top 5 Vías Peligrosas"
      meta="Ranking por número de siniestros"
    >
      <ul className="px-3 pt-1 pb-1 space-y-2">
        {data.map((row, i) => {
          const pct = (row.cantidad / max) * 100;
          return (
            <li
              key={row.via}
              className="
                group grid grid-cols-[24px_1fr_auto] items-center gap-3
                px-2 py-2 rounded-xl cursor-default
                transition-colors hover:bg-[var(--accent-tint)]
              "
            >
              <span className="font-mono text-[11px] font-bold text-[var(--text-tertiary)] tabular text-center">
                #{i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate font-display tracking-tight">
                  {row.via}
                </p>
                <div className="relative mt-1.5 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                  <div
                    className="
                      absolute inset-y-0 left-0 rounded-full
                      transition-all duration-500
                    "
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${CHART_COLORS.accent} 0%, ${CHART_COLORS.crit} 100%)`,
                    }}
                  />
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular pl-2">
                {row.cantidad.toLocaleString("es-CO")}
              </span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}
