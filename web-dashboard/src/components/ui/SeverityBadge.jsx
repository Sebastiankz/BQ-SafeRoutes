/**
 * Semi-transparent pill with colored border for severity classifications.
 * level: "leve" | "danos" | "alto" | "heridos" | "muertos" | string label
 */
const MAP = {
  leve: {
    label: "Leve",
    cls: "bg-[var(--ok-tint)] text-[var(--ok)] border-[var(--ok)]/30",
  },
  "solo daños": {
    label: "Solo Daños",
    cls: "bg-slate-50 text-[var(--text-secondary)] border-[var(--border)]",
  },
  danos: {
    label: "Solo Daños",
    cls: "bg-slate-50 text-[var(--text-secondary)] border-[var(--border)]",
  },
  alto: {
    label: "Riesgo Alto",
    cls: "bg-[var(--crit-tint)] text-[var(--crit)] border-[var(--crit)]/30",
  },
  "riesgo alto": {
    label: "Riesgo Alto",
    cls: "bg-[var(--crit-tint)] text-[var(--crit)] border-[var(--crit)]/30",
  },
  heridos: {
    label: "Heridos",
    cls: "bg-[var(--warn-tint)] text-[var(--warn)] border-[var(--warn)]/30",
  },
  muertos: {
    label: "Muertos",
    cls: "bg-[var(--crit-tint)] text-[var(--crit)] border-[var(--crit)]/35 font-bold",
  },
};

export default function SeverityBadge({ level, children }) {
  const key = String(level ?? "").toLowerCase();
  const entry = MAP[key] ?? {
    label: children ?? level,
    cls: "bg-slate-50 text-[var(--text-secondary)] border-[var(--border)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-semibold border ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}
