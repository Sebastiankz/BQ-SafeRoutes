import { apiBaseUrl } from "./config";

type UploadResponse = {
  foto_url: string;
};

function contentTypeFromUri(localUri: string): string {
  const lower = localUri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function fileNameFromUri(localUri: string): string {
  const parts = localUri.split("/");
  const last = parts[parts.length - 1]?.trim();
  if (last) return last;
  return `foto-${Date.now()}.jpg`;
}

/**
 * Sube una imagen al backend para que este la persista en Storage.
 * Devuelve la URL pública de la imagen.
 */
export async function subirFotoReporte(
  localUri: string,
  accessToken: string,
): Promise<string> {
  const base = apiBaseUrl();
  if (!base) {
    throw new Error(
      "Define EXPO_PUBLIC_API_URL en mobile/.env (URL de tu API FastAPI)",
    );
  }

  const form = new FormData();
  form.append("file", {
    uri: localUri,
    name: fileNameFromUri(localUri),
    type: contentTypeFromUri(localUri),
  } as any);

  const res = await fetch(`${base}/storage/reportes/foto`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const payload = (await res.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") message = payload.detail;
      else if (payload.detail !== undefined)
        message = JSON.stringify(payload.detail);
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const body = (await res.json()) as UploadResponse;
  if (!body?.foto_url) {
    throw new Error("La API no devolvió foto_url tras subir la imagen.");
  }
  return body.foto_url;
}
