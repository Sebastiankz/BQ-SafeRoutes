// src/pages/Login/LoginPage.jsx
// Modal de login para administradores (policía).
// Se renderiza como overlay encima del dashboard — no reemplaza la página.
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { useAuth, isAdminEmail } from "../../context/AuthContext";

/**
 * @param {object} props
 * @param {() => void} props.onClose
 */
export default function LoginModal({ onClose }) {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      className="
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-slate-950/65 backdrop-blur-xl
      "
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
        style={{ fontFamily: "DM Sans" }}
      >
        {/* Gradient border wrapper */}
        <div
          className="rounded-[20px] p-px"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.55) 0%, rgba(51,65,85,0.35) 45%, rgba(59,130,246,0.25) 100%)",
          }}
        >
          <div
            className="
              relative rounded-[19px] overflow-hidden
              bg-[#111827] text-slate-100
              p-8
            "
          >
            {/* Top glow */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[260px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(59,130,246,0.30) 0%, transparent 65%)",
              }}
            />

            {/* Close */}
            <button
              onClick={onClose}
              className="
                absolute top-4 right-4 w-8 h-8 rounded-lg
                flex items-center justify-center
                text-slate-500 hover:text-slate-100 hover:bg-slate-800
                transition-colors cursor-pointer
              "
              aria-label="Cerrar"
            >
              <X size={16} strokeWidth={2.2} />
            </button>

            {/* Header */}
            <div className="relative flex flex-col items-center mb-7 text-center">
              <div
                className="
                  w-16 h-16 rounded-2xl
                  bg-gradient-to-br from-[#2563EB] to-[#1D4ED8]
                  flex items-center justify-center
                  shadow-[0_12px_40px_-8px_rgb(59_130_246_/_0.6)]
                  border border-blue-400/20
                  mb-4
                "
              >
                <Shield className="w-7 h-7 text-white" strokeWidth={2.1} />
              </div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "Plus Jakarta Sans" }}
              >
                Acceso Policial
              </h1>
              <p
                className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mt-2"
                style={{ fontFamily: "JetBrains Mono" }}
              >
                Acceso exclusivo · dominio @admin requerido
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2">
                  Correo institucional
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                    strokeWidth={2.1}
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="policia@admin.co"
                    required
                    className="
                      w-full h-11 bg-[#1E293B] border border-[#334155]
                      rounded-xl pl-10 pr-4 text-sm text-slate-100
                      placeholder:text-slate-500
                      focus:outline-none focus:border-[#3B82F6]
                      focus:ring-2 focus:ring-[#3B82F6]/30 focus:bg-[#1E293B]
                      transition-all
                    "
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                    strokeWidth={2.1}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="
                      w-full h-11 bg-[#1E293B] border border-[#334155]
                      rounded-xl pl-10 pr-12 text-sm text-slate-100
                      placeholder:text-slate-500
                      focus:outline-none focus:border-[#3B82F6]
                      focus:ring-2 focus:ring-[#3B82F6]/30 focus:bg-[#1E293B]
                      transition-all
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={2.1} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={2.1} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                  <AlertCircle
                    className="w-4 h-4 text-red-400 mt-0.5 shrink-0"
                    strokeWidth={2.1}
                  />
                  <p className="text-red-200 text-[13px] leading-snug">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full h-11 rounded-xl mt-1
                  bg-gradient-to-b from-[#2563EB] to-[#1D4ED8]
                  hover:from-[#3B82F6] hover:to-[#2563EB]
                  disabled:from-blue-900 disabled:to-blue-950
                  disabled:cursor-not-allowed
                  text-white font-bold text-sm
                  shadow-[0_8px_24px_-6px_rgb(37_99_235_/_0.6)]
                  hover:shadow-[0_12px_32px_-6px_rgb(37_99_235_/_0.7)]
                  transition-all duration-200
                  flex items-center justify-center gap-2 cursor-pointer
                "
                style={{ fontFamily: "Plus Jakarta Sans" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                    Verificando…
                  </>
                ) : (
                  "Ingresar al panel"
                )}
              </button>
            </form>

            <p
              className="text-center text-[10px] text-slate-600 mt-6 uppercase tracking-[0.14em]"
              style={{ fontFamily: "JetBrains Mono" }}
            >
              SafeRoutes · Gestión de incidentes
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
