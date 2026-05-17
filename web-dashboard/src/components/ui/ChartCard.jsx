/**
 * Wrapper for every chart panel. Holds the editorial chrome
 * (eyebrow label, title, optional meta line, divider) and a
 * predictable content area so charts stay structurally aligned.
 */
export default function ChartCard({
  eyebrow,
  title,
  meta,
  action,
  children,
  className = "",
}) {
  return (
    <section
      className={`
        relative bg-[var(--surface)] border border-[var(--border)]
        rounded-2xl shadow-[var(--shadow-soft)] card-highlight
        overflow-hidden
        ${className}
      `}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] font-mono">
              {eyebrow}
            </p>
          )}
          <h3 className="text-[15px] font-bold text-[var(--text-primary)] mt-0.5 font-display tracking-tight">
            {title}
          </h3>
          {meta && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{meta}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-2 pt-3 pb-4">{children}</div>
    </section>
  );
}
