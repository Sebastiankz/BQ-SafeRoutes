import { apiBaseUrl } from "./config";

export type SessionMode = "body" | "cookie";

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
  usuario: UsuarioSesion;
};

type AuthErrorBody = {
  detail?: unknown;
};

function unwrapDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((x) =>
        typeof x === "object" && x !== null && "msg" in x
          ? String((x as { msg: string }).msg)
          : JSON.stringify(x),
      )
      .join("; ");
  }
  return JSON.stringify(detail);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBaseUrl();
  if (!base) {
    throw new Error(
      "Define EXPO_PUBLIC_API_URL en mobile/.env (URL de tu API FastAPI)",
    );
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as AuthErrorBody;
      if (body?.detail !== undefined) message = unwrapDetail(body.detail);
      else message = JSON.stringify(body);
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function iniciarSesionBackend(
  email: string,
  password: string,
  sessionMode: SessionMode = "body",
): Promise<AuthResponse> {
  return fetchJson<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, session_mode: sessionMode }),
  });
}

export async function registrarBackend(
  email: string,
  password: string,
  nombre: string,
  sessionMode: SessionMode = "body",
): Promise<AuthResponse> {
  return fetchJson<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      nombre,
      session_mode: sessionMode,
    }),
  });
}

export async function refrescarSesionBackend(
  refreshToken: string,
  sessionMode: SessionMode = "body",
): Promise<AuthResponse> {
  return fetchJson<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({
      refresh_token: refreshToken,
      session_mode: sessionMode,
    }),
  });
}

export async function obtenerPerfilBackend(
  accessToken: string,
): Promise<UsuarioSesion> {
  return fetchJson<UsuarioSesion>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function cerrarSesionBackend(
  accessToken: string | null,
  sessionMode: SessionMode = "body",
): Promise<void> {
  await fetchJson<{ ok: boolean }>("/auth/logout", {
    method: "POST",
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    body: JSON.stringify({ session_mode: sessionMode }),
  });
}
