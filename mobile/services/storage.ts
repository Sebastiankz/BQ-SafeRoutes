import { supabase } from "../lib/supabase";

const BUCKET = "reportes-fotos";

/**
 * Sube una imagen desde una URI local al bucket de Supabase Storage.
 * Devuelve la URL pública de la imagen subida.
 */
export async function subirFotoReporte(localUri: string, userId: string): Promise<string> {
  const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, blob, {
    contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
    upsert: false,
  });

  if (error) throw new Error(`Error subiendo foto: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
