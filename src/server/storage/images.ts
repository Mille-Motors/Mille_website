import "server-only";

import { randomUUID } from "node:crypto";
import { ApiError, badRequest } from "@/server/http/errors";
import { sanitizeStoragePrefix } from "@/lib/storage-path";
import {
  ALLOWED_IMAGE_TYPES,
  normalizeDeclaredType,
  sniffImageType,
  type AllowedMime,
} from "@/lib/image-type";
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

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_VEHICLE = 20;

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
  const detected = sniffImageType(buffer.subarray(0, 16));
  if (!detected) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Solo se aceptan imágenes JPG, PNG, WebP o AVIF.",
    );
  }
  // El tipo declarado tiene que coincidir con lo que el archivo realmente es.
  //
  // La condición anterior incluía `!(detected in ALLOWED)`, que nunca podía
  // ser cierta: `detected` sale de `sniff()`, que solo devuelve claves de
  // ALLOWED o null, y null ya lanzó arriba. Era una rama muerta que parecía
  // validar algo y no validaba nada. No había riesgo —la subida siempre usa
  // `detected`, nunca lo que declare el cliente— pero el código mentía.
  //
  // Ahora sí se comprueba lo que se pretendía: si el navegador declara un
  // tipo y contradice al contenido real, se rechaza. Un tipo vacío es normal
  // en algunos navegadores y lo decide el sniff. `image/jpg` se acepta como
  // alias de `image/jpeg` porque es una grafía que se sigue viendo.
  const declared = normalizeDeclaredType(file.type);
  if (declared && declared !== detected) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "El archivo no coincide con el tipo declarado.",
    );
  }

  const extension = ALLOWED_IMAGE_TYPES[detected][0];
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
