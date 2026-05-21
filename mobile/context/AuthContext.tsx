import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

// Expo Go no incluye el módulo nativo de Google Sign-In:
// detectamos el runtime para ocultar el botón y evitar crashes.
const googleSignInAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// require condicional: importarlo estáticamente revienta en Expo Go porque
// el TurboModule RNGoogleSignin no existe en su binario.
type GoogleSignInSdk = typeof import("@react-native-google-signin/google-signin");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleSdk: GoogleSignInSdk | null = googleSignInAvailable
  ? require("@react-native-google-signin/google-signin")
  : null;

import {
  cerrarSesionBackend,
  iniciarSesionBackend,
  iniciarSesionConGoogleBackend,
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
  googleSignInAvailable: boolean;
};

type AuthActions = {
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrar: (email: string, password: string, nombre: string) => Promise<void>;
  iniciarSesionConGoogle: () => Promise<void>;
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

  useEffect(() => {
    if (!googleSdk) return;
    googleSdk.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }, []);


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

  const iniciarSesionConGoogle = useCallback(async () => {
    if (!googleSdk) {
      throw new Error(
        "Google Sign-In no está disponible en Expo Go. Usa el dev build o el simulador.",
      );
    }
    const { GoogleSignin, isErrorWithCode, statusCodes } = googleSdk;
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    let idToken: string | null = null;
    try {
      const response = await GoogleSignin.signIn();
      if (response.type === "success") {
        idToken = response.data.idToken;
      } else if (response.type === "cancelled") {
        throw new Error("Inicio de sesión con Google cancelado");
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error("Inicio de sesión con Google cancelado");
      }
      throw err;
    }

    if (!idToken) {
      throw new Error("No se obtuvo un id_token de Google");
    }

    const { accessToken } = await GoogleSignin.getTokens();

    const data = await iniciarSesionConGoogleBackend(idToken, accessToken, "body");
    const sesion: SesionPersistida = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      usuario: data.usuario,
    };
    await guardarSesion(sesion);
    aplicarSesion(sesion);
  }, [aplicarSesion]);


  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionBackend(token, "body");
    } catch {
      // Ignoramos fallos remotos para no dejar sesión local colgada.
    }
    if (googleSdk) {
      try {
        await googleSdk.GoogleSignin.signOut();
      } catch {
        // Si el usuario no se había logueado con Google, esto puede fallar — ignoramos.
      }
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
        googleSignInAvailable,
        iniciarSesion,
        registrar,
        iniciarSesionConGoogle,
        cerrarSesion,
      }) satisfies AuthState & AuthActions,
    [token, usuario, hydrating, iniciarSesion, registrar, iniciarSesionConGoogle, cerrarSesion],
  );


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
