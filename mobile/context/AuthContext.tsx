import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  cerrarSesionBackend,
  iniciarSesionBackend,
  obtenerPerfilBackend,
  refrescarSesionBackend,
  registrarBackend,
  type UsuarioSesion,
} from "../services/auth";

export type { UsuarioSesion } from "../services/auth";

const ACCESS_TOKEN_KEY = "@saferoutes/auth_access_token";
const REFRESH_TOKEN_KEY = "@saferoutes/auth_refresh_token";
const USUARIO_KEY = "@saferoutes/auth_usuario";

type SesionPersistida = {
  accessToken: string;
  refreshToken: string | null;
  usuario: UsuarioSesion;
};

type AuthState = {
  token: string | null;
  usuario: UsuarioSesion | null;
  hydrating: boolean;
};

type AuthActions = {
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrar: (email: string, password: string, nombre: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

function normalizarUsuario(raw: unknown): UsuarioSesion | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Partial<UsuarioSesion>;
  if (typeof payload.id !== "string" || typeof payload.email !== "string")
    return null;
  return {
    id: payload.id,
    email: payload.email,
    nombre: typeof payload.nombre === "string" ? payload.nombre : null,
  };
}

async function guardarSesion(sesion: SesionPersistida): Promise<void> {
  const refreshToken = sesion.refreshToken ?? "";
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, sesion.accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
    [USUARIO_KEY, JSON.stringify(sesion.usuario)],
  ]);
}

async function limpiarSesion(): Promise<void> {
  await AsyncStorage.multiRemove([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USUARIO_KEY,
  ]);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [hydrating, setHydrating] = useState(true);

  const aplicarSesion = useCallback((sesion: SesionPersistida | null) => {
    if (!sesion) {
      setToken(null);
      setRefreshToken(null);
      setUsuario(null);
      return;
    }
    setToken(sesion.accessToken);
    setRefreshToken(sesion.refreshToken);
    setUsuario(sesion.usuario);
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const items = await AsyncStorage.multiGet([
          ACCESS_TOKEN_KEY,
          REFRESH_TOKEN_KEY,
          USUARIO_KEY,
        ]);
        const fromStorage = Object.fromEntries(items);

        const accessToken = fromStorage[ACCESS_TOKEN_KEY]?.trim() || "";
        const storedRefresh = fromStorage[REFRESH_TOKEN_KEY]?.trim() || null;
        const storedUser = fromStorage[USUARIO_KEY]
          ? normalizarUsuario(JSON.parse(fromStorage[USUARIO_KEY]))
          : null;

        if (!accessToken) {
          if (!cancelado) aplicarSesion(null);
          return;
        }

        try {
          const usuarioVigente = await obtenerPerfilBackend(accessToken);
          const sesionActual: SesionPersistida = {
            accessToken,
            refreshToken: storedRefresh,
            usuario: usuarioVigente,
          };
          await guardarSesion(sesionActual);
          if (!cancelado) aplicarSesion(sesionActual);
          return;
        } catch {
          if (storedRefresh) {
            try {
              const refreshed = await refrescarSesionBackend(
                storedRefresh,
                "body",
              );
              const sesionRefrescada: SesionPersistida = {
                accessToken: refreshed.access_token,
                refreshToken: refreshed.refresh_token ?? storedRefresh,
                usuario: refreshed.usuario ??
                  storedUser ?? {
                    id: "",
                    email: "",
                    nombre: null,
                  },
              };
              if (
                !sesionRefrescada.usuario.id ||
                !sesionRefrescada.usuario.email
              ) {
                sesionRefrescada.usuario = await obtenerPerfilBackend(
                  sesionRefrescada.accessToken,
                );
              }
              await guardarSesion(sesionRefrescada);
              if (!cancelado) aplicarSesion(sesionRefrescada);
              return;
            } catch {
              // Sigue flujo de limpieza abajo.
            }
          }
        }

        await limpiarSesion();
        if (!cancelado) aplicarSesion(null);
      } catch {
        await limpiarSesion();
        if (!cancelado) aplicarSesion(null);
      } finally {
        if (!cancelado) setHydrating(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [aplicarSesion]);

  const iniciarSesion = useCallback(
    async (email: string, password: string) => {
      const data = await iniciarSesionBackend(email, password, "body");
      const sesion: SesionPersistida = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        usuario: data.usuario,
      };
      await guardarSesion(sesion);
      aplicarSesion(sesion);
    },
    [aplicarSesion],
  );

  const registrar = useCallback(
    async (email: string, password: string, nombre: string) => {
      const data = await registrarBackend(email, password, nombre, "body");
      const sesion: SesionPersistida = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        usuario: data.usuario,
      };
      await guardarSesion(sesion);
      aplicarSesion(sesion);
    },
    [aplicarSesion],
  );

  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionBackend(token, "body");
    } catch {
      // Ignoramos fallos remotos para no dejar sesión local colgada.
    }
    await limpiarSesion();
    aplicarSesion(null);
  }, [token, aplicarSesion]);

  const value = useMemo(
    () =>
      ({
        token,
        usuario,
        hydrating,
        iniciarSesion,
        registrar,
        cerrarSesion,
      }) satisfies AuthState & AuthActions,
    [token, usuario, hydrating, iniciarSesion, registrar, cerrarSesion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
