import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase, tieneConfigSupabase } from "../lib/supabase";

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string | null;
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

function sesionUsuario(s: Session): UsuarioSesion {
  const u = s.user;
  const meta = (u.user_metadata ?? {}) as { full_name?: string };
  const nombre = typeof meta.full_name === "string" ? meta.full_name.trim() || null : null;
  return {
    id: u.id,
    email: u.email ?? "",
    nombre,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [hydrating, setHydrating] = useState(true);

  const aplicarSesion = useCallback((session: Session | null) => {
    if (!session?.access_token) {
      setToken(null);
      setUsuario(null);
      return;
    }
    setToken(session.access_token);
    setUsuario(sesionUsuario(session));
  }, []);

  useEffect(() => {
    let cancelado = false;

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (cancelado) return;
        if (error || !session) aplicarSesion(null);
        else aplicarSesion(session);
      })
      .catch(() => {
        if (!cancelado) aplicarSesion(null);
      })
      .finally(() => {
        if (!cancelado) setHydrating(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      aplicarSesion(session);
    });

    return () => {
      cancelado = true;
      listener.subscription.unsubscribe();
    };
  }, [aplicarSesion]);

  const iniciarSesion = useCallback(
    async (email: string, password: string) => {
      if (!tieneConfigSupabase()) throw new Error("Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      aplicarSesion(data.session ?? null);
    },
    [aplicarSesion],
  );

  const registrar = useCallback(
    async (email: string, password: string, nombre: string) => {
      if (!tieneConfigSupabase()) throw new Error("Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre.trim() },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.session) {
        throw new Error(
          "Si Supabase tiene confirmación por correo activada, revisa tu bandeja y confirma antes de iniciar sesión.",
        );
      }
      aplicarSesion(data.session);
    },
    [aplicarSesion],
  );

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    aplicarSesion(null);
  }, [aplicarSesion]);

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
