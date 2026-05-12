export async function getReportes(limit = 50, offset = 0) {
  const response = await fetch(
    `/api/reportes/?limit=${limit}&offset=${offset}`,
  );
  if (!response.ok)
    throw new Error(`Error al cargar reportes: ${response.status}`);
  return response.json();
}
