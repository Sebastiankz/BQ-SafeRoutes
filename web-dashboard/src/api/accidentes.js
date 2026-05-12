import { apiFetch } from "./client";
export async function getAccidentes() {
  const response = await apiFetch("/api/incidentes-historicos/");
  if (!response.ok)
    throw new Error(`Error al cargar datos: ${response.status}`);
  return response.json();
}
