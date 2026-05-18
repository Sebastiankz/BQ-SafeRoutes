/**
 * Live status indicator: pulsing dot + label.
 * tone: "ok" | "warn" | "crit" | "muted"
 */
const TONES = {
  ok: {
    ring: "bg-[var(--ok)]/25",
    dot: "bg-[var(--ok)]",
    text: "text-[var(--ok)]",
  },
  warn: {
    ring: "bg-[var(--warn)]/25",
    dot: "bg-[var(--warn)]",
    text: "text-[var(--warn)]",
  },
  crit: {
    ring: "bg-[var(--crit)]/25",
    dot: "bg-[var(--crit)]",
    text: "text-[var(--crit)]",
  },
  muted: {
    ring: "bg-slate-300/40",
    dot: "bg-slate-400",
    text: "text-[var(--text-secondary)]",
  },
};

export default function StatusDot({
  tone = "ok",
  label,
  pulse = true,
  size = "sm",
}) {
  const t = TONES[tone] ?? TONES.ok;
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${t.ring} ${
              pulse ? "animate-ping" : ""
            } opacity-75`}
          />
        )}
        <span
          className={`relative inline-flex ${dotSize} rounded-full ${t.dot}`}
        />
      </span>
      {label && (
        <span className={`text-[11px] font-semibold tracking-wide ${t.text}`}>
          {label}
        </span>
      )}
    </span>
  );
}
