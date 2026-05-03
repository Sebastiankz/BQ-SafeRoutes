import { apiBaseUrl } from "./config";

export interface Hotspot {
  id: number;
  latitud: number;
  longitud: number;
  radio_metros: number;
  nivel_riesgo: "bajo" | "medio" | "alto";
  num_incidentes: number;
  origen: "ipat" | "ciudadano" | "mixto";
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export async function listarHotspots(): Promise<Hotspot[]> {
  const base = apiBaseUrl();
  if (!base) throw new Error("Define EXPO_PUBLIC_API_URL en mobile/.env");

  const res = await fetch(`${base}/hotspots/?activo=true`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Error al cargar hotspots: ${res.status}`);
  }

  return res.json() as Promise<Hotspot[]>;
}
