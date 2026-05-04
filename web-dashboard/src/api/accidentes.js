import Papa from 'papaparse';
export async function getAccidentes() {
  const response = await fetch('/api/incidentes-historicos/');
  if (!response.ok) throw new Error(`Error al cargar datos: ${response.status}`);
  return response.json();
}