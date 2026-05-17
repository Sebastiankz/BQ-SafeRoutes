/**
 * Editorial Recharts tooltip — white surface, thin border,
 * elevated shadow, mono numbers. Used across every chart so
 * hover state is visually consistent.
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  formatLabel,
}) {
  if (!active || !payload?.length) return null;
  const displayLabel = formatLabel ? formatLabel(label) : label;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)] px-3 py-2 min-w-[120px]">
      {displayLabel != null && (
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] font-mono">
          {displayLabel}
        </p>
      )}
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <div key={p.dataKey ?? p.name} className="flex items-baseline gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0 translate-y-[-1px]"
              style={{ background: p.color ?? p.payload?.fill ?? "var(--accent)" }}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {p.name ?? p.dataKey}
            </span>
            <span className="ml-auto font-mono text-sm font-bold text-[var(--text-primary)]">
              {Number(p.value).toLocaleString("es-CO")}
              {unit && <span className="text-[var(--text-tertiary)] ml-0.5">{unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
