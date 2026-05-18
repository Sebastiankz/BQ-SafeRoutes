import { apiFetch } from "./client";

export async function getReportes(limit = 50, offset = 0, estado = "todos") {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  // Siempre enviar el parámetro; el backend entiende "todos" como sin filtro.
  // Sin este param, el backend usa su default "confirmado" y filtra los pendientes.
  params.set("estado", estado);
  const response = await apiFetch(`/api/reportes/?${params}`);
  if (!response.ok)
    throw new Error(`Error al cargar reportes: ${response.status}`);
  return response.json();
}

/**
 * Cambia el estado de un reporte (solo admins).
 * Transiciones válidas en el backend: pendiente → confirmado, confirmado → inactivo.
 * Requiere que configureApiAuth haya inyectado el token del admin.
 */
export async function cambiarEstadoReporte(id, estado) {
  const response = await apiFetch(`/api/reportes/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.detail ?? `Error ${response.status}`);
  }
  return response.json();
}
