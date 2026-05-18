import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Sparkline from "./Sparkline";

const TONES = {
  accent: {
    iconBg: "bg-[var(--accent-tint)]",
    iconText: "text-[var(--accent)]",
    spark: "var(--accent)",
  },
  crit: {
    iconBg: "bg-[var(--crit-tint)]",
    iconText: "text-[var(--crit)]",
    spark: "var(--crit)",
  },
  warn: {
    iconBg: "bg-[var(--warn-tint)]",
    iconText: "text-[var(--warn)]",
    spark: "var(--warn)",
  },
  ok: {
    iconBg: "bg-[var(--ok-tint)]",
    iconText: "text-[var(--ok)]",
    spark: "var(--ok)",
  },
};

export default function KPICard({
  titulo,
  valor,
  tendencia,
  icono,
  tone = "accent",
  spark,
  unidad,
}) {
  const t = TONES[tone] ?? TONES.accent;
  const Icon = icono;
  const hasTrend = typeof tendencia === "number";
  const trendUp = hasTrend && tendencia > 0;
  const trendDown = hasTrend && tendencia < 0;
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;
  const trendCls = trendUp
    ? "text-[var(--ok)] bg-[var(--ok-tint)]"
    : trendDown
      ? "text-[var(--crit)] bg-[var(--crit-tint)]"
      : "text-[var(--text-tertiary)] bg-slate-50 dark:bg-slate-800/50";

  return (
    <article
      className="
        group relative bg-[var(--surface)] border border-[var(--border)]
        rounded-2xl shadow-[var(--shadow-soft)] card-highlight
        p-5 transition-colors hover:border-[var(--border-strong)]
        overflow-hidden
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.iconBg}`}
          >
            {Icon && <Icon size={18} strokeWidth={2.2} className={t.iconText} />}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            {titulo}
          </p>
        </div>
        {spark && <Sparkline values={spark} color={t.spark} />}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-[34px] font-bold text-[var(--text-primary)] tracking-tight tabular leading-none">
          {Number(valor).toLocaleString("es-CO")}
        </span>
        {unidad && (
          <span className="text-sm font-medium text-[var(--text-tertiary)]">
            {unidad}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {hasTrend ? (
          <span
            className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[11px] font-bold font-mono ${trendCls}`}
          >
            <TrendIcon size={11} strokeWidth={2.5} />
            {trendUp ? "+" : ""}
            {tendencia}%
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[11px] font-medium text-[var(--text-tertiary)] bg-slate-50 dark:bg-slate-800/40">
            sin comparativo
          </span>
        )}
        <span className="text-[11px] text-[var(--text-secondary)]">
          vs año anterior
        </span>
      </div>
    </article>
  );
}
