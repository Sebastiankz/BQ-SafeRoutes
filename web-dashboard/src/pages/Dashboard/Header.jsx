import { Menu, Moon, Sun } from "lucide-react";
import PillSelect from "../../components/ui/PillSelect";
import StatusDot from "../../components/ui/StatusDot";

const AÑOS = [
  { value: "Todos", label: "Todos los años" },
  { value: 2022, label: "2022" },
  { value: 2023, label: "2023" },
  { value: 2024, label: "2024" },
  { value: 2025, label: "2025" },
];

const GRAVEDADES = [
  { value: "Todas", label: "Todas" },
  { value: "Solo Daños", label: "Solo Daños" },
  { value: "Heridos", label: "Heridos" },
  { value: "Muertos", label: "Muertos" },
];

const MESES = [
  { value: "Todos", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export default function Header({
  año,
  setAño,
  gravedad,
  setGravedad,
  mes,
  setMes,
  isDark,
  setIsDark,
  mostrarGravedad = true,
  onMenuToggle,
}) {
  return (
    <header
      className="
        shrink-0 bg-[var(--surface)]
        border-b border-[var(--border)]
      "
    >
      {/* ── Fila principal (siempre visible) ── */}
      <div className="h-[52px] px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Hamburger — solo en móvil */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Abrir menú de navegación"
          className="
            lg:hidden w-9 h-9 rounded-xl shrink-0
            flex items-center justify-center
            text-[var(--text-secondary)]
            hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]
            transition-colors cursor-pointer
          "
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 lg:flex-none">
          <img
            src="/logo.png"
            alt="Monitor Vial"
            draggable={false}
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 invert dark:invert-0 select-none"
          />
          <div className="min-w-0 leading-tight">
            <h1 className="text-[13px] sm:text-[15px] font-bold text-[var(--text-primary)] font-display tracking-tight truncate">
              Monitor Vial
              <span className="text-[var(--text-tertiary)] font-medium hidden xs:inline">
                {" "}
                · Barranquilla
              </span>
            </h1>
            <p className="hidden sm:block text-[10px] font-medium text-[var(--text-tertiary)] font-mono uppercase tracking-[0.12em]">
              Plataforma de Prevención · 2025
            </p>
          </div>
        </div>

        {/* Filtros — visibles en desktop, ocultos en móvil (se muestran en la fila inferior) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="hidden md:flex items-center mr-2">
            <StatusDot tone="ok" label="Sistema activo" />
          </div>

          {mostrarGravedad && (
            <PillSelect
              label="Gravedad"
              value={gravedad}
              options={GRAVEDADES}
              onChange={(v) => setGravedad(String(v))}
            />
          )}
          <PillSelect
            label="Período"
            value={año}
            options={AÑOS}
            onChange={(v) => setAño(v === "Todos" ? "Todos" : Number(v))}
          />
          <PillSelect
            label="Mes"
            value={mes}
            options={MESES}
            onChange={(v) => setMes(String(v))}
          />
        </div>

        {/* Dark toggle — siempre visible */}
        <button
          type="button"
          onClick={() => setIsDark(!isDark)}
          title={isDark ? "Modo claro" : "Modo oscuro"}
          aria-label="Cambiar tema"
          className="
            w-9 h-9 rounded-full shrink-0
            bg-[var(--surface-muted)] border border-[var(--border)]
            text-[var(--text-secondary)]
            hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-tint)]
            flex items-center justify-center cursor-pointer
            transition-all duration-200 ring-focus
          "
        >
          <span className="relative w-4 h-4">
            <Sun
              size={16}
              strokeWidth={2.1}
              className={`absolute inset-0 transition-all duration-300 ${
                isDark ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
              }`}
            />
            <Moon
              size={16}
              strokeWidth={2.1}
              className={`absolute inset-0 transition-all duration-300 ${
                isDark ? "opacity-0 rotate-90" : "opacity-100 rotate-0"
              }`}
            />
          </span>
        </button>
      </div>

      {/* ── Fila de filtros — solo en móvil/tablet (<lg) ── */}
      <div className="lg:hidden flex items-center flex-wrap gap-2 px-3 sm:px-5 pb-2.5 border-t border-[var(--border)]">
        {mostrarGravedad && (
          <PillSelect
            label="Gravedad"
            value={gravedad}
            options={GRAVEDADES}
            onChange={(v) => setGravedad(String(v))}
          />
        )}
        <PillSelect
          label="Período"
          value={año}
          options={AÑOS}
          onChange={(v) => setAño(v === "Todos" ? "Todos" : Number(v))}
        />
        <PillSelect
          label="Mes"
          value={mes}
          options={MESES}
          onChange={(v) => setMes(String(v))}
        />
        <div className="flex items-center ml-auto">
          <StatusDot tone="ok" label="Sistema activo" />
        </div>
      </div>
    </header>
  );
}
