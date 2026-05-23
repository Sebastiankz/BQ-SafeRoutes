import { useEffect, useState } from "react";

import { apiBaseUrl } from "./config";

const cache = new Map<string, string | null>();

function keyFor(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (lat == null || lng == null) return null;

  const key = keyFor(lat, lng);
  if (cache.has(key)) return cache.get(key) ?? null;

  const base = apiBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/geocode/reverse?lat=${lat}&lng=${lng}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await res.json()) as { address: string | null };
    const address = data.address ?? null;
    cache.set(key, address);
    return address;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export function useReverseGeocode(
  lat: number,
  lng: number,
): string | null {
  const [address, setAddress] = useState<string | null>(
    () => cache.get(keyFor(lat, lng)) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    reverseGeocode(lat, lng).then((result) => {
      if (!cancelled) setAddress(result);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return address;
}
