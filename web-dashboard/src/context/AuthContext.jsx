import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  loginAuth,
  logoutAuth,
  refreshAuth,
  registerAuth,
} from "../api/auth";
import { configureApiAuth } from "../api/client";

const AuthContext = createContext(null);

function normalizeAuthPayload(payload) {
  return {
    token: payload?.access_token ?? null,
    usuario: payload?.usuario ?? null,
  };
}

// El email admin debe tener dominio exactamente "admin" o que empiece con "admin."
// Ej. válidos: policia@admin, policia@admin.co, admin@admin.barranquilla.gov.co
export function isAdminEmail(email) {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain === "admin" || domain.startsWith("admin.");
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  const clearSesion = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  const aplicarSesion = useCallback((payload) => {
    const normalized = normalizeAuthPayload(payload);
    setToken(normalized.token);
    setUsuario(normalized.usuario);
  }, []);

  const refreshSesionSilenciosa = useCallback(async () => {
    try {
      const refreshed = await refreshAuth();
      if (!refreshed?.access_token) {
        clearSesion();
        return null;
      }

      const hasUsuario = refreshed?.usuario?.id && refreshed?.usuario?.email;
      if (hasUsuario) {
        aplicarSesion(refreshed);
        return refreshed.access_token;
      }

      const me = await getCurrentUser(refreshed.access_token);
      aplicarSesion({ ...refreshed, usuario: me });
      return refreshed.access_token;
    } catch {
      clearSesion();
      return null;
    }
  }, [aplicarSesion, clearSesion]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await refreshSesionSilenciosa();
      if (!cancelled) setHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSesionSilenciosa]);

  useEffect(() => {
    configureApiAuth({
      accessTokenGetter: () => token,
      refreshTokenFn: refreshSesionSilenciosa,
    });
  }, [token, refreshSesionSilenciosa]);

  const iniciarSesion = useCallback(
    async (email, password) => {
      const payload = await loginAuth(email, password);
      aplicarSesion(payload);
    },
    [aplicarSesion],
  );

  const registrar = useCallback(
    async (email, password, nombre) => {
      const payload = await registerAuth(email, password, nombre);
      aplicarSesion(payload);
    },
    [aplicarSesion],
  );

  const cerrarSesion = useCallback(async () => {
    try {
      await logoutAuth(token);
    } finally {
      clearSesion();
    }
  }, [token, clearSesion]);

  const value = useMemo(
    () => ({
      token,
      usuario,
      hydrating,
      isAdmin: isAdminEmail(usuario?.email),
      iniciarSesion,
      registrar,
      cerrarSesion,
      refreshSesionSilenciosa,
    }),
    [
      token,
      usuario,
      hydrating,
      iniciarSesion,
      registrar,
      cerrarSesion,
      refreshSesionSilenciosa,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
