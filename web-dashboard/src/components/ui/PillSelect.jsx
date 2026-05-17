import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Pill-shaped dropdown that replaces the native <select>.
 * Built on a custom popover (no @heroui dependency) so it
 * matches the editorial light theme without fighting library defaults.
 */
export default function PillSelect({
  label,
  value,
  options,
  onChange,
  width = "auto",
  align = "right",
}) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const wrapRef = useRef(null);
  const id = useId();

  const current = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function openPopover() {
    const idx = options.findIndex((o) => String(o.value) === String(value));
    setFocusIdx(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function handleKey(e) {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      openPopover();
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onChange(options[focusIdx].value);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative" style={{ minWidth: width }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        onKeyDown={handleKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="
          group inline-flex items-center gap-2 h-9 px-3.5
          rounded-full bg-[var(--surface-muted)]
          border border-[var(--border)]
          text-[13px] text-[var(--text-primary)]
          hover:border-[var(--border-strong)] hover:bg-[var(--accent-tint)]
          transition-colors cursor-pointer ring-focus
        "
      >
        {label && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            {label}
          </span>
        )}
        <span className="font-medium truncate max-w-[140px]">
          {current?.label ?? "—"}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          className={`text-[var(--text-tertiary)] transition-transform ${
            open ? "rotate-180 text-[var(--accent)]" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={id}
          className={`
            absolute z-50 mt-2 min-w-full w-max max-w-[260px] p-1
            rounded-2xl bg-[var(--surface)] border border-[var(--border)]
            shadow-[var(--shadow-pop)]
            ${align === "right" ? "right-0" : "left-0"}
          `}
        >
          <ul className="max-h-72 overflow-auto scroll-thin">
            {options.map((opt, i) => {
              const selected = String(opt.value) === String(value);
              const focused = i === focusIdx;
              return (
                <li key={String(opt.value)}>
                  <button
                    type="button"
                    onMouseEnter={() => setFocusIdx(i)}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between gap-3
                      px-3 py-2 text-left text-[13px] rounded-xl
                      transition-colors cursor-pointer
                      ${focused ? "bg-[var(--accent-tint)] text-[var(--text-primary)]" : "text-[var(--text-primary)]"}
                      ${selected ? "font-semibold text-[var(--accent)]" : "font-medium"}
                    `}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check size={14} className="text-[var(--accent)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
