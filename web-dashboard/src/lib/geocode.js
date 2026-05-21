// src/lib/geocode.js
//
// Reverse geocoding via backend proxy (/api/geocode/reverse).
// El backend llama a Nominatim para evitar el CORS de OpenStreetMap.
// Incluye caché en memoria para evitar llamadas duplicadas.

import { apiFetch } from "../api/client";

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
    const res = await apiFetch(
      `/api/geocode/reverse?lat=${lat}&lng=${lng}`,
    );

    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data = await res.json();
    const address = data.address ?? null;
    cache.set(key, address);
    return address;
  } catch {
    cache.set(key, null);
    return null;
  }
}
