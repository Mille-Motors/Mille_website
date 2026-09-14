import "server-only";

import { randomUUID } from "node:crypto";
import { ApiError, badRequest } from "@/server/http/errors";
import { sanitizeStoragePrefix } from "@/lib/storage-path";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { SITE_MEDIA_BUCKET, VEHICLE_IMAGE_BUCKET } from "@/server/auth/config";

/**
 * Subida de imágenes a Supabase Storage.
 *
 * Se usa el cliente autenticado de la persona que sube: las políticas del
 * bucket se aplican sobre su sesión, así que no hace falta service role key
 * en ninguna parte. El bucket es de lectura pública (las fotos se ven en el
 * sitio) y de escritura restringida al Superadmin.
 */

/** Formatos que el sitio sabe mostrar. Nada más entra. */
const ALLOWED = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
} as const;

type AllowedMime = keyof typeof ALLOWED;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_VEHICLE = 20;

/**
 * Los primeros bytes del archivo, que es lo único que no se puede falsear
 * renombrándolo. El `Content-Type` que manda el navegador y la extensión son
 * pistas, no pruebas.
 */
function sniff(bytes: Uint8Array): AllowedMime | null {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, i) => bytes[i] === byte);

  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return "image/png";
  }
  // RIFF....WEBP
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // Caja ftyp con marca avif/avis
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

export interface UploadedImage {
  url: string;
  storagePath: string;
  contentType: AllowedMime;
  bytes: number;
}

/** Los dos buckets del proyecto. No se acepta ninguno más. */
export type StorageBucket =
  | typeof VEHICLE_IMAGE_BUCKET
  | typeof SITE_MEDIA_BUCKET;

/**
 * Valida y sube un archivo a un bucket conocido.
 *
 * El nombre original nunca llega al bucket: la ruta la construye el servidor
 * a partir de un prefijo controlado y un UUID, así que no hay forma de
 * escaparse del prefijo, de colisionar con otro archivo ni de colar un
 * `../` por el nombre.
 */
export async function uploadImage(
  bucket: StorageBucket,
  prefix: string,
  file: File,
): Promise<UploadedImage> {
  if (file.size === 0) throw badRequest("El archivo está vacío.");
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      "Cada imagen debe pesar menos de 10 MB.",
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = sniff(buffer.subarray(0, 16));
  if (!detected) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Solo se aceptan imágenes JPG, PNG, WebP o AVIF.",
    );
  }
  // El tipo declarado tiene que coincidir con lo que el archivo realmente es.
  if (file.type && file.type !== detected && !(detected in ALLOWED)) {
    throw new ApiError("UNSUPPORTED_MEDIA_TYPE", "El archivo no es una imagen válida.");
  }

  const extension = ALLOWED[detected][0];
  // El prefijo se sanea aquí y no donde se llama: es la última frontera antes
  // de escribir, y confiar en que quien llama ya lo hizo es cómo aparecen los
  // fallos de recorrido de rutas.
  const storagePath = `${sanitizeStoragePrefix(prefix)}/${randomUUID()}.${extension}`;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: detected,
      // Una ruta con UUID no puede existir ya; sobrescribir solo ocultaría un error.
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) {
    console.error("[mille:storage] fallo al subir", { bucket, storagePath, error });
    throw new ApiError(
      "INTERNAL_ERROR",
      "No se pudo subir la imagen. Vuelve a intentarlo.",
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return {
    url: data.publicUrl,
    storagePath,
    contentType: detected,
    bytes: file.size,
  };
}

/**
 * Borra el objeto del bucket. Devuelve si lo consiguió, sin lanzar: quien
 * llama ya decidió que la imagen se va, y dejar la fila en la base porque el
 * archivo no se pudo borrar deja el admin en un estado peor.
 */
export async function deleteStoredImage(
  bucket: StorageBucket,
  storagePath: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);

  if (error) {
    console.error("[mille:storage] fallo al borrar", { bucket, storagePath, error });
    return false;
  }
  return true;
}
