import Papa from 'papaparse';
export async function getAccidentes() {
  const response = await fetch('/accidentes.csv');
  const buffer = await response.arrayBuffer();
  const csvText = new TextDecoder('utf-8').decode(buffer);

  const { data } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (value) => value.trim(),
  });

  return data;
}