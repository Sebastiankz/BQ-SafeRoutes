// src/pages/Dashboard/layout/Sidebar.jsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin,
  BarChart3,
  Database,
  Shield,
  LogOut,
  ChevronRight,
  ChevronsRight,
  X,
  Pin,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import LoginModal from "../../Login/LoginPage";

const NAV_ITEMS = [
  { id: "mapa", label: "Centro de Control", Icon: MapPin, showBadge: true },
  { id: "analitica", label: "Analítica", Icon: BarChart3 },
  { id: "reportes", label: "Historial", Icon: Database },
];

const RAIL_W = 64;
const PANEL_W = 240;
const HOVER_DELAY = 120;
const STORAGE_KEY = "monitorvial:sidebar-pinned";

// ─── Nav item ─────────────────────────────────────────────────
function NavItem({ active, item, onClick, badge, expanded }) {
  const { id, label, Icon, showBadge } = item;
  return (
    <button
      key={id}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={expanded ? undefined : label}
      className={`
        group relative w-full flex items-center h-11 rounded-xl
        text-sm font-semibold cursor-pointer
        transition-[background-color,color] duration-200
        ${expanded ? "justify-start gap-3 px-3" : "justify-center px-0"}
        ${
          active
            ? "bg-[var(--accent-soft)] text-[var(--accent-hover)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--accent-tint)] hover:text-[var(--text-primary)]"
        }
      `}
    >
      {/* Active left rail — only meaningful when expanded; when collapsed
          the filled icon chip itself signals the active state. */}
      {expanded && (
        <span
          className={`
            absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full transition-colors
            ${active ? "bg-[var(--accent)]" : "bg-transparent group-hover:bg-[var(--accent)]/40"}
          `}
        />
      )}
      <span
        className={`
          relative flex items-center justify-center w-8 h-8 rounded-lg shrink-0
          transition-colors
          ${
            active
              ? "bg-[var(--accent)] text-white shadow-[var(--shadow-glow)]"
              : "text-[var(--text-tertiary)] group-hover:text-[var(--accent)]"
          }
        `}
      >
        <Icon size={16} strokeWidth={2.2} />
        {showBadge && badge > 0 && !expanded && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--crit)] ring-2 ring-[var(--surface)] text-[9px] font-bold font-mono text-white flex items-center justify-center leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>

      {expanded && (
        <>
          <span className="flex-1 text-left tracking-tight whitespace-nowrap overflow-hidden">
            {label}
          </span>
          {showBadge && badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--crit)] text-white text-[10px] font-bold font-mono shadow-[0_2px_6px_-1px_rgb(220_38_38_/_0.5)]">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

// ─── Admin area ───────────────────────────────────────────────
function AdminArea({ isAdmin, usuario, cerrarSesion, onOpenLogin, expanded }) {
  if (isAdmin) {
    const handle = usuario?.email?.split("@")[0] ?? "—";
    const initial = handle[0]?.toUpperCase() ?? "?";

    if (!expanded) {
      // Collapsed: just the avatar, centered. Click logs out via tooltip hint.
      return (
        <div className="p-3 border-t border-[var(--border)] flex justify-center">
          <button
            onClick={cerrarSesion}
            title={`${handle} · Cerrar sesión`}
            aria-label={`${handle}, cerrar sesión`}
            className="
              relative w-9 h-9 rounded-full bg-[var(--accent)] text-white
              flex items-center justify-center
              font-display font-bold text-sm
              shadow-[var(--shadow-glow)] cursor-pointer
              transition-transform hover:scale-105
            "
          >
            {initial}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--ok)] ring-2 ring-[var(--surface)]" />
          </button>
        </div>
      );
    }

    return (
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
          <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0 font-display font-bold text-sm shadow-[var(--shadow-glow)]">
            {initial}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-[13px] font-bold text-[var(--text-primary)] truncate font-display tracking-tight whitespace-nowrap">
              {handle}
            </p>
            <span className="inline-flex items-center h-4 px-1.5 mt-0.5 rounded-full bg-[var(--accent-tint)] text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
              Administrador
            </span>
          </div>
          <button
            onClick={cerrarSesion}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--crit)] hover:bg-[var(--crit-tint)] transition-colors cursor-pointer"
          >
            <LogOut size={14} strokeWidth={2.1} />
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!expanded) {
    return (
      <div className="p-3 border-t border-[var(--border)] flex justify-center">
        <button
          onClick={onOpenLogin}
          title="Acceso policial"
          aria-label="Acceso policial"
          className="
            w-9 h-9 rounded-xl flex items-center justify-center
            bg-[var(--surface-muted)] border border-[var(--border)]
            text-[var(--text-tertiary)]
            hover:bg-[var(--accent-tint)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]
            transition-colors cursor-pointer
          "
        >
          <Shield size={15} strokeWidth={2.2} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-[var(--border)]">
      <button
        onClick={onOpenLogin}
        className="
          group w-full flex items-center gap-2
          px-3 h-11 rounded-xl text-[13px] font-semibold
          text-[var(--text-secondary)]
          bg-[var(--surface-muted)] border border-[var(--border)]
          hover:bg-[var(--accent-tint)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]
          transition-colors cursor-pointer
        "
      >
        <Shield
          size={14}
          strokeWidth={2.2}
          className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors shrink-0"
        />
        <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
          Acceso policial
        </span>
        <ChevronRight
          size={14}
          strokeWidth={2.5}
          className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
        />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function Sidebar({
  seccion,
  setSeccion,
  reportesActivos = 0,
  mobileNavOpen = false,
  onMobileNavClose,
}) {
  const { usuario, isAdmin, cerrarSesion } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [pinned, setPinned] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [hover, setHover] = useState(false);
  const enterTimer = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, pinned ? "1" : "0");
  }, [pinned]);

  const expanded = pinned || hover;

  function openLogin() {
    window.dispatchEvent(new Event("close-reporte-popup"));
    setShowLogin(true);
  }

  function handleEnter() {
    if (pinned) return;
    clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => setHover(true), HOVER_DELAY);
  }
  function handleLeave() {
    clearTimeout(enterTimer.current);
    setHover(false);
  }
  function handleFocusIn() {
    if (pinned) return;
    setHover(true);
  }

  return (
    <>
      {/* Desktop sidebar — only renders the rail slot in flex;
          the visible panel is absolutely positioned within so it
          can float over the content area when not pinned. */}
      <aside
        className="hidden lg:block relative shrink-0 transition-[width] duration-300 ease-out"
        style={{ width: pinned ? PANEL_W : RAIL_W }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleFocusIn}
        aria-label="Navegación principal"
      >
        <nav
          className={`
            absolute top-0 left-0 bottom-0 z-30
            flex flex-col
            bg-[var(--surface)] border-r border-[var(--border)]
            overflow-hidden
            transition-[width,box-shadow] duration-300
          `}
          style={{
            width: expanded ? PANEL_W : RAIL_W,
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow:
              expanded && !pinned
                ? "0 24px 60px -20px rgb(15 23 42 / 0.18), 12px 0 32px -16px rgb(15 23 42 / 0.10)"
                : "none",
          }}
        >
          {/* Header row: eyebrow + pin when expanded;
              centered "expand hint" glyph when collapsed. */}
          <div
            className={`
              h-12 shrink-0 flex items-center
              ${expanded ? "px-3 justify-between" : "justify-center"}
            `}
          >
            {expanded ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-mono whitespace-nowrap overflow-hidden">
                  Navegación
                </span>
                <button
                  onClick={() => setPinned((p) => !p)}
                  title={pinned ? "Liberar barra" : "Fijar barra abierta"}
                  aria-label={pinned ? "Liberar barra" : "Fijar barra abierta"}
                  aria-pressed={pinned}
                  className={`
                    w-7 h-7 rounded-md flex items-center justify-center shrink-0
                    transition-colors duration-200 cursor-pointer
                    ${
                      pinned
                        ? "bg-[var(--accent-tint)] text-[var(--accent)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-tint)]"
                    }
                  `}
                >
                  <Pin
                    size={13}
                    strokeWidth={2.4}
                    className={`transition-transform duration-200 ${pinned ? "rotate-0" : "rotate-45"}`}
                  />
                </button>
              </>
            ) : (
              <span
                className="
                  w-7 h-7 rounded-md flex items-center justify-center
                  text-[var(--text-tertiary)]
                "
                aria-hidden
              >
                <ChevronsRight size={14} strokeWidth={2.4} />
              </span>
            )}
          </div>

          <div className="flex-1 px-3 space-y-1 overflow-hidden">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={seccion === item.id}
                onClick={() => setSeccion(item.id)}
                badge={reportesActivos}
                expanded={expanded}
              />
            ))}
          </div>

          <AdminArea
            isAdmin={isAdmin}
            usuario={usuario}
            cerrarSesion={cerrarSesion}
            onOpenLogin={openLogin}
            expanded={expanded}
          />
        </nav>
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────────
          Triggered by the hamburger button in Header.
          AnimatePresence renders the overlay + drawer only when open,
          then animates them out on close for a smooth exit.
      ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mob-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              aria-hidden
              onClick={onMobileNavClose}
            />

            {/* Drawer panel */}
            <motion.nav
              key="mob-drawer"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="
                lg:hidden fixed left-0 top-0 bottom-0 z-50
                w-[280px] flex flex-col
                bg-[var(--surface)] border-r border-[var(--border)]
                shadow-[var(--shadow-pop)]
              "
              aria-label="Menú de navegación"
            >
              {/* Drawer header */}
              <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="Monitor Vial"
                    draggable={false}
                    className="w-7 h-7 object-contain shrink-0 invert dark:invert-0 select-none"
                  />
                  <span className="font-display font-bold text-[14px] text-[var(--text-primary)] tracking-tight">
                    Monitor Vial
                  </span>
                </div>
                <button
                  onClick={onMobileNavClose}
                  aria-label="Cerrar menú"
                  className="
                    w-8 h-8 rounded-lg flex items-center justify-center
                    text-[var(--text-tertiary)]
                    hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]
                    transition-colors cursor-pointer
                  "
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              </div>

              {/* Nav items */}
              <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scroll-thin">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-mono px-2 mb-2">
                  Navegación
                </p>
                {NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={seccion === item.id}
                    onClick={() => {
                      setSeccion(item.id);
                      onMobileNavClose?.();
                    }}
                    badge={reportesActivos}
                    expanded={true}
                  />
                ))}
              </div>

              {/* Admin area */}
              <AdminArea
                isAdmin={isAdmin}
                usuario={usuario}
                cerrarSesion={() => {
                  cerrarSesion();
                  onMobileNavClose?.();
                }}
                onOpenLogin={() => {
                  openLogin();
                  onMobileNavClose?.();
                }}
                expanded={true}
              />
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
