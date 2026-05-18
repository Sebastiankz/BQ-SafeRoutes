// src/lib/geocode.js
//
// Reverse geocoding via Nominatim (OpenStreetMap) — sin API key, gratis.
// Incluye caché en memoria para evitar llamadas duplicadas.

const cache = new Map(); // "lat,lng" → address string

/**
 * Convierte coordenadas a dirección legible.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>} dirección o null si falla
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;

  const key = `${parseFloat(lat).toFixed(5)},${parseFloat(lng).toFixed(5)}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`;

    const res = await fetch(url, {
      headers: { "User-Agent": "BQ-SafeRoutes/1.0" },
    });

    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data = await res.json();
    const a = data.address ?? {};

    // Construir dirección corta: calle [número], barrio, ciudad
    const parts = [
      a.road ?? a.pedestrian ?? a.path ?? a.highway,
      a.house_number,
      a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district,
      a.city ?? a.town ?? a.village ?? a.county,
    ].filter(Boolean);

    const address = parts.length
      ? parts.join(", ")
      : (data.display_name ?? null);
    cache.set(key, address);
    return address;
  } catch {
    cache.set(key, null);
    return null;
  }
}
