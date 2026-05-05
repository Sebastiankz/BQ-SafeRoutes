import { apiBaseUrl } from "./config";

export interface Hotspot {
  id: number;
  latitud: number;
  longitud: number;
  radio_metros: number;
  nivel_riesgo: "Bajo" | "Medio" | "Alto";
  num_incidentes: number;
  origen: "ipat" | "ciudadano" | "mixto" | "dbscan_historico" | string;
  year: number | null;
  month: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type HotspotFilter =
  | { mode: "global" }
  | { mode: "year"; year: number }
  | { mode: "month"; year: number; month: number };

function buildQuery(filter: HotspotFilter): string {
  const params = new URLSearchParams({ activo: "true" });
  if (filter.mode === "global") {
    params.set("global", "true");
  } else if (filter.mode === "year") {
    params.set("year", String(filter.year));
  } else {
    params.set("year", String(filter.year));
    params.set("month", String(filter.month));
  }
  return params.toString();
}

export async function listarHotspots(
  filter: HotspotFilter = { mode: "global" },
): Promise<Hotspot[]> {
  const base = apiBaseUrl();
  if (!base) throw new Error("Define EXPO_PUBLIC_API_URL en mobile/.env");

  const res = await fetch(`${base}/hotspots/?${buildQuery(filter)}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Error al cargar hotspots: ${res.status}`);
  }

  return res.json() as Promise<Hotspot[]>;
}
