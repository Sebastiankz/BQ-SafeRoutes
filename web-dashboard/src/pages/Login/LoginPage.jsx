// src/pages/Login/LoginPage.jsx
// Modal de login para administradores (policía).
// Diseño: dos paneles — izquierda formulario, derecha panel visual decorativo.
import { useState, useEffect, useRef } from "react";
import { getReportes } from "../../api/reportes";
import { motion } from "framer-motion";
import {
  Shield,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";
import { useAuth, isAdminEmail } from "../../context/AuthContext";
import { apiFetch } from "../../api/client";

const ROL_OPTIONS = [
  { value: "policia", label: "Policía", Icon: Shield },
  { value: "administrador", label: "Administrador", Icon: Settings },
];

/**
 * @param {{ onClose: () => void }} props
 */
export default function LoginModal({ onClose }) {
  const { iniciarSesion } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rol, setRol] = useState("policia");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    reportes: "–",
    usuarios: "–",
    ultimoInc: "–",
  });
  const statsTimer = useRef(null);

  // ── Stats en vivo: se actualizan al montar y cada 30 s ──────────────────
  useEffect(() => {
    async function cargarStats() {
      try {
        const [todosRep, usuariosRes] = await Promise.allSettled([
          getReportes(200, 0, "todos"),
          apiFetch("/api/auth/users/count").then((r) =>
            r.ok ? r.json() : { count: 0 },
          ),
        ]);

        // Reportes activos = confirmado + pendiente (excluye inactivo)
        const reportesList =
          todosRep.status === "fulfilled" ? todosRep.value : [];
        const activos = reportesList.filter(
          (r) => r.estado === "confirmado" || r.estado === "pendiente",
        );

        // Usuarios registrados
        const usuariosData =
          usuariosRes.status === "fulfilled" ? usuariosRes.value : { count: 0 };
        const totalUsuarios = usuariosData.count ?? 0;

        // Último incidente: reporte más reciente por created_at
        let ultimoInc = "–";
        if (reportesList.length > 0) {
          const masReciente = reportesList.reduce((a, b) =>
            new Date(a.created_at) > new Date(b.created_at) ? a : b,
          );
          const diffS = Math.floor(
            (Date.now() - new Date(masReciente.created_at)) / 1000,
          );
          if (diffS < 60) ultimoInc = `${diffS}s`;
          else if (diffS < 3600) ultimoInc = `${Math.floor(diffS / 60)}m`;
          else if (diffS < 86400) ultimoInc = `${Math.floor(diffS / 3600)}h`;
          else ultimoInc = `${Math.floor(diffS / 86400)}d`;
        }

        setStats({
          reportes: String(activos.length),
          usuarios: String(totalUsuarios),
          ultimoInc,
        });
      } catch {
        // silencioso — no romper el modal si la API falla
      }
    }

    cargarStats();
    statsTimer.current = setInterval(cargarStats, 30_000);
    return () => clearInterval(statsTimer.current);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!isAdminEmail(email)) {
      setError(
        "Acceso restringido. Se requiere un correo institucional con dominio @admin.",
      );
      return;
    }
    setLoading(true);
    try {
      await iniciarSesion(email.trim(), password);
      onClose();
    } catch (err) {
      setError(err.message ?? "Credenciales incorrectas. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,10,20,0.78)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="login-modal-grid"
      >
        {/* ══ PANEL IZQUIERDO — formulario ══════════════════════════════ */}
        <div
          style={{
            padding: "28px 32px 32px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Cabecera: logo + nombre + cerrar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src="/logo.png"
                alt="Monitor Vial"
                draggable={false}
                style={{
                  width: 30,
                  height: 30,
                  objectFit: "contain",
                  userSelect: "none",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#e2e8f0",
                  letterSpacing: "-0.1px",
                }}
              >
                Monitor Vial
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4b5563",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1e293b";
                e.currentTarget.style.color = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#4b5563";
              }}
            >
              <X size={13} strokeWidth={2.3} />
            </button>
          </div>

          {/* Título y subtítulo */}
          <h1
            style={{
              fontSize: 21,
              fontWeight: 700,
              color: "#f1f5f9",
              margin: "0 0 7px",
              lineHeight: 1.2,
            }}
          >
            ¡Hola,{" "}
            <em style={{ color: "#60A5FA", fontStyle: "italic" }}>
              bienvenido!
            </em>
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              margin: "0 0 20px",
              lineHeight: 1.55,
            }}
          >
            Verifica tu rol para acceder a opciones avanzadas como reportes y
            gestión de incidentes.
          </p>

          {/* Toggle de rol */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "#1a2538",
              borderRadius: 10,
              padding: 3,
              marginBottom: 18,
              gap: 3,
            }}
          >
            {ROL_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRol(value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 600,
                  transition: "all 0.18s",
                  background: rol === value ? "#1D4ED8" : "transparent",
                  color: rol === value ? "#ffffff" : "#64748b",
                  boxShadow:
                    rol === value ? "0 2px 8px rgba(29,78,216,0.45)" : "none",
                }}
              >
                <Icon size={13} strokeWidth={2.2} />
                {label}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 13,
              flex: 1,
            }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#64748b",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Correo institucional
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={13}
                  strokeWidth={2}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#475569",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@admin.co"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 40,
                    background: "#1a2538",
                    border: "1px solid #1e3a5f",
                    borderRadius: 9,
                    paddingLeft: 36,
                    paddingRight: 14,
                    fontSize: 13,
                    color: "#e2e8f0",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3B82F6";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(59,130,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#1e3a5f";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#64748b",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={13}
                  strokeWidth={2}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#475569",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 40,
                    background: "#1a2538",
                    border: "1px solid #1e3a5f",
                    borderRadius: 9,
                    paddingLeft: 36,
                    paddingRight: 42,
                    fontSize: 13,
                    color: "#e2e8f0",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3B82F6";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(59,130,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#1e3a5f";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    padding: 2,
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={14} strokeWidth={2} />
                  ) : (
                    <Eye size={14} strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* ¿Olvidaste tu contraseña? */}
            <div style={{ textAlign: "right", marginTop: -4 }}>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#3B82F6",
                  padding: 0,
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  background: "rgba(239,68,68,0.09)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  borderRadius: 9,
                  padding: "9px 12px",
                }}
              >
                <AlertCircle
                  size={13}
                  strokeWidth={2}
                  style={{ color: "#f87171", marginTop: 1, flexShrink: 0 }}
                />
                <p
                  style={{
                    fontSize: 12.5,
                    color: "#fca5a5",
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Btn submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 42,
                background: loading
                  ? "#1e3a8a"
                  : "linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)",
                border: "none",
                borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                color: "white",
                fontSize: 13.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: loading
                  ? "none"
                  : "0 6px 22px -4px rgba(37,99,235,0.55)",
                transition: "all 0.2s",
                marginTop: 2,
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={15}
                    strokeWidth={2.5}
                    className="animate-spin"
                  />
                  Verificando…
                </>
              ) : (
                <>
                  → Continuar
                  <ArrowRight size={14} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ══ PANEL DERECHO — visual ══════════════════════════════════════ */}
        <div
          className="login-modal-right"
          style={{
            background: "#0d1420",
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            padding: "24px 24px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Badge sistema activo */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(16,185,129,0.09)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 20,
              padding: "4px 12px 4px 8px",
              fontSize: 11.5,
              fontWeight: 600,
              color: "#6ee7b7",
              width: "fit-content",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <span
                className="animate-ping"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "#10b981",
                  opacity: 0.45,
                }}
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "block",
                  position: "relative",
                }}
              />
            </span>
            Sistema activo · Barranquilla
          </div>

          {/* Mapa SVG decorativo */}
          <div
            style={{
              flex: 1,
              background: "#162032",
              borderRadius: 10,
              marginBottom: 16,
              overflow: "hidden",
              minHeight: 140,
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 280 160"
              preserveAspectRatio="xMidYMid slice"
              style={{ display: "block" }}
            >
              {/* Grid de calles */}
              <line
                x1="0"
                y1="55"
                x2="280"
                y2="55"
                stroke="#1e3a5f"
                strokeWidth="1.2"
              />
              <line
                x1="0"
                y1="90"
                x2="280"
                y2="90"
                stroke="#1e3a5f"
                strokeWidth="1.2"
              />
              <line
                x1="0"
                y1="125"
                x2="280"
                y2="125"
                stroke="#1e3a5f"
                strokeWidth="1.2"
              />
              <line
                x1="55"
                y1="0"
                x2="55"
                y2="160"
                stroke="#1e3a5f"
                strokeWidth="1.2"
              />
              <line
                x1="140"
                y1="0"
                x2="140"
                y2="160"
                stroke="#1e3a5f"
                strokeWidth="1.2"
              />
              <line
                x1="220"
                y1="0"
                x2="220"
                y2="160"
                stroke="#1e3a5f"
                strokeWidth="1.2"
              />
              {/* Zona crítica — rojo */}
              <circle cx="140" cy="90" r="30" fill="rgba(239,68,68,0.18)" />
              <circle cx="140" cy="90" r="17" fill="rgba(239,68,68,0.32)" />
              <circle cx="140" cy="90" r="7" fill="rgba(239,68,68,0.82)" />
              {/* Zona media — amarillo */}
              <circle cx="55" cy="55" r="20" fill="rgba(234,179,8,0.16)" />
              <circle cx="55" cy="55" r="10" fill="rgba(234,179,8,0.40)" />
              <circle cx="55" cy="55" r="4" fill="rgba(234,179,8,0.82)" />
              {/* Reportes normales — azul */}
              <circle cx="220" cy="55" r="11" fill="rgba(59,130,246,0.22)" />
              <circle cx="220" cy="55" r="5" fill="rgba(59,130,246,0.65)" />
              <circle cx="220" cy="125" r="11" fill="rgba(59,130,246,0.22)" />
              <circle cx="220" cy="125" r="5" fill="rgba(59,130,246,0.65)" />
              <circle cx="55" cy="125" r="9" fill="rgba(59,130,246,0.18)" />
              <circle cx="55" cy="125" r="4" fill="rgba(59,130,246,0.55)" />
            </svg>
          </div>

          {/* Título visual */}
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#f1f5f9",
              margin: "0 0 6px",
              lineHeight: 1.3,
            }}
          >
            Monitorea, actúa y{" "}
            <em style={{ color: "#60A5FA", fontStyle: "italic" }}>reporta</em>
          </h2>
          <p
            style={{
              fontSize: 11.5,
              color: "#64748b",
              lineHeight: 1.5,
              margin: "0 0 16px",
            }}
          >
            Descarga reportes, gestiona incidentes y supervisa zonas de riesgo
            en tiempo real.
          </p>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            {[
              { value: stats.reportes, label: "Reportes\nactivos" },
              { value: stats.usuarios, label: "Usuarios\nregistrados" },
              { value: stats.ultimoInc, label: "Último\nincidente" },
            ].map(({ value, label }) => (
              <div
                key={label}
                style={{
                  background: "#1a2538",
                  borderRadius: 8,
                  padding: "10px 8px",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {value}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    marginTop: 4,
                    lineHeight: 1.4,
                    whiteSpace: "pre-line",
                  }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
