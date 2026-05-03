import { apiBaseUrl } from "./config";

export type TipoReporte =
  | "accidente"
  | "hueco"
  | "arroyo"
  | "semaforo_danado"
  | "otro";

export interface Reporte {
  id: number;
  usuario_id: string;
  tipo: string;
  descripcion: string | null;
  foto_url: string | null;
  latitud: number;
  longitud: number;
  severidad: number;
  validaciones: number;
  created_at: string;
}

export interface CrearReportePayload {
  tipo: TipoReporte;
  descripcion?: string | null;
  foto_url?: string | null;
  latitud: number;
  longitud: number;
  severidad: number;
}

function unwrapDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((x) => (typeof x === "object" && x !== null && "msg" in x ? String((x as { msg: string }).msg) : JSON.stringify(x)))
      .join("; ");
  }
  return JSON.stringify(detail);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBaseUrl();
  if (!base) {
    throw new Error("Define EXPO_PUBLIC_API_URL en mobile/.env (URL de tu API FastAPI)");
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
      const body = await res.json();
      if (body?.detail !== undefined) message = unwrapDetail(body.detail);
      else message = JSON.stringify(body);
    } catch {
      /* ignorar parse */
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function listarReportes(limit = 100, offset = 0): Promise<Reporte[]> {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return fetchJson<Reporte[]>(`/reportes/?${qs.toString()}`, { method: "GET" });
}

export async function crearReporte(payload: CrearReportePayload, accessToken: string): Promise<Reporte> {
  return fetchJson<Reporte>("/reportes/", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function listarMisReportes(
  accessToken: string,
  limit = 100,
  offset = 0,
): Promise<Reporte[]> {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return fetchJson<Reporte[]>(`/reportes/mios?${qs.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
