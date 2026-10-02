import "server-only";

import { randomUUID } from "node:crypto";
import { ApiError, badRequest } from "@/server/http/errors";
import {
  MAX_VEHICLE_IMAGE_BYTES,
  MAX_VEHICLE_IMAGE_LABEL,
  imageTooSmall,
  readImageDimensions,
  type ImageDimensions,
} from "@/lib/image-dimensions";
import { sanitizeStoragePrefix } from "@/lib/storage-path";
import {
  ALLOWED_IMAGE_TYPES,
  normalizeDeclaredType,
  sniffImageType,
  type AllowedMime,
} from "@/lib/image-type";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import {
  SITE_MEDIA_BUCKET,
  VEHICLE_IMAGE_BUCKET,
  assertSupabaseConfig,
} from "@/server/auth/config";

/**
 * Subida de imágenes a Supabase Storage.
 *
 * Se usa el cliente autenticado de la persona que sube: las políticas del
 * bucket se aplican sobre su sesión, así que no hace falta service role key
 * en ninguna parte. El bucket es de lectura pública (las fotos se ven en el
 * sitio) y de escritura restringida al Superadmin.
 *
 * El archivo se guarda TAL CUAL llega: ni se recomprime, ni se redimensiona,
 * ni se le genera una miniatura que haga de original. El máster es el
 * original y las variantes las produce el optimizador de Next a la hora de
 * servir, que es quien sabe a qué ancho se va a ver cada una.
 */

/**
 * El tope de las fotografías del SITIO, que suben por aquí en una petición
 * multipart. Las de vehículo no pasan por este módulo —el navegador las
 * escribe directo en el bucket— y tienen el suyo, más alto, en
 * `lib/image-dimensions`: son originales de cámara y diez mebibytes se les
 * quedaban cortos.
 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_VEHICLE = 20;

/**
 * El lado largo mínimo que admite una fotografía de vehículo.
 *
 * No se recomprime nada en ninguna parte del camino —el objeto se guarda
 * byte a byte y Next nunca amplía por encima del original—, así que si una
 * foto se ve borrosa es porque el archivo ya era pequeño. La única manera
 * de arreglarlo es no dejar que entre.
 *
 * Mil píxeles es el suelo: el hueco principal de la ficha mide unos 860 px
 * de CSS, que en una pantalla Retina son 1.720 reales. Por debajo de mil el
 * navegador estira y se nota a simple vista. Lo recomendable son 2.000 o
 * más, y eso lo dice el formulario; aquí solo se corta lo inservible.
 */
/** Los dos buckets del proyecto. No se acepta ninguno más. */
export type StorageBucket =
  | typeof VEHICLE_IMAGE_BUCKET
  | typeof SITE_MEDIA_BUCKET;

export interface UploadedImage {
  url: string;
  storagePath: string;
  contentType: AllowedMime;
  bytes: number;
  /** `null` cuando la cabecera no se pudo leer. */
  dimensions: ImageDimensions | null;
}

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

  /**
   * Cuánto mide de verdad.
   *
   * Si la cabecera no se puede leer se deja pasar: rechazar una imagen
   * válida porque su cabecera es rara sería peor que el problema que esto
   * resuelve. Lo que se corta es lo que SÍ se pudo medir y es demasiado
   * pequeño para la ficha.
   */
  const dimensions = readImageDimensions(buffer);
  if (dimensions) {
    const tooSmall = imageTooSmall(dimensions);
    if (tooSmall) throw badRequest(tooSmall);
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
    dimensions,
  };
}

/**
 * Cómo acabó un intento de borrado.
 *
 * La diferencia entre "no estaba" y "no se pudo" es la que decide si quien
 * llama puede tirar su única referencia al objeto. Un booleano las mezclaba,
 * y mezclarlas significa o dejar huérfanos en el bucket o conservar filas
 * muertas para siempre.
 */
export type RemovalOutcome = "DELETED" | "ALREADY_ABSENT" | "FAILED";

/**
 * Retira el objeto del bucket, sin lanzar.
 *
 * Supabase no distingue las dos primeras por sí mismo: `remove()` de una
 * ruta inexistente no da error y devuelve la lista vacía. Esa lista es justo
 * la señal que hace falta.
 */
export async function removeStoredImage(
  bucket: StorageBucket,
  storagePath: string,
): Promise<RemovalOutcome> {
  // El try envuelve también la creación del cliente. Sin él la función
  // prometía no lanzar y lanzaba igual —conseguir la sesión puede fallar—,
  // y quien la llama trata "no pude" como una respuesta, no como una
  // excepción: ese es justo el caso en el que hay que conservar la fila.
  let data: unknown[] | null;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.storage.from(bucket).remove([storagePath]);
    if (result.error) {
      console.error("[mille:storage] fallo al borrar", {
        bucket,
        storagePath,
        error: result.error,
      });
      return "FAILED";
    }
    data = result.data;
  } catch (error) {
    console.error("[mille:storage] no se pudo contactar con Storage", {
      bucket,
      storagePath,
      error,
    });
    return "FAILED";
  }
  // Sin error y sin nada retirado: la ruta ya no existía. Para quien llama
  // es tan bueno como haberla borrado — no queda objeto que rastrear.
  return data && data.length > 0 ? "DELETED" : "ALREADY_ABSENT";
}

/**
 * Lo mismo, en booleano, para quien solo necesita saber si el objeto ya no
 * está. Lo usa el borrado de una imagen ya registrada, donde la fila se va
 * de todos modos: la decisión la tomó quien administra y dejar la fila
 * porque el archivo no se pudo borrar deja el admin en un estado peor.
 */
export async function deleteStoredImage(
  bucket: StorageBucket,
  storagePath: string,
): Promise<boolean> {
  return (await removeStoredImage(bucket, storagePath)) !== "FAILED";
}


// ---------------------------------------------------------------------------
// Subida directa desde el navegador
// ---------------------------------------------------------------------------

/**
 * Por qué los bytes NO pasan por Next.
 *
 * Subir el lote entero en una sola petición multipart ponía hasta doce
 * archivos de 10 MB en un único cuerpo: 120 MB atravesando una función
 * serverless que, en la mayoría de plataformas, corta mucho antes. Y como
 * ahora se piden originales de alta resolución a propósito, el problema
 * dejaba de ser teórico.
 *
 * La alternativa limpia estaba ya en el proyecto sin usarse: las políticas
 * del bucket evalúan `is_active_superadmin()` sobre la SESIÓN, no sobre
 * quién llama, así que el navegador de la persona que ya entró puede
 * escribir directamente. Storage aplica además, por su cuenta, el límite de
 * 10 MB por archivo y la lista de tipos permitidos del bucket — dos
 * garantías que no dependen de nuestro código.
 *
 * Lo que el servidor conserva es lo que importa:
 *
 *   1. autoriza y cuenta, antes de dejar subir nada;
 *   2. GENERA la ruta — el cliente nunca propone una, así que no puede
 *      escribir fuera de su vehículo ni pisar otro objeto;
 *   3. al finalizar comprueba los bytes que de verdad llegaron, y si no son
 *      una imagen válida y suficiente, borra el objeto y rechaza.
 */
export interface ReservedUpload {
  /**
   * El identificador de la reserva, y la ÚNICA autoridad al finalizar.
   *
   * El navegador necesita la ruta para escribir en Storage, pero no puede
   * ser ella quien mande después: una ruta que llega en un JSON es un dato
   * del cliente, y tratarla como autoridad permitía que el cierre de un
   * vehículo señalara el objeto pendiente de otro. Con el id, el servidor
   * saca la ruta de su propia tabla.
   */
  reservationId: string;
  storagePath: string;
  contentType: AllowedMime;
}

/**
 * Una ruta por archivo, derivada del tipo que el navegador declara.
 *
 * El tipo declarado solo decide la extensión: lo que vale es el sniff de los
 * bytes reales, que ocurre al finalizar. Si no coincide, el objeto se borra.
 */
export function reserveUploadPath(
  prefix: string,
  declaredType: string,
): Omit<ReservedUpload, "reservationId"> {
  const normalized = normalizeDeclaredType(declaredType);
  if (!(normalized in ALLOWED_IMAGE_TYPES)) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Solo se aceptan imágenes JPG, PNG, WebP o AVIF.",
    );
  }
  const contentType = normalized as AllowedMime;
  const extension = ALLOWED_IMAGE_TYPES[contentType][0];
  return {
    storagePath: `${sanitizeStoragePrefix(prefix)}/${randomUUID()}.${extension}`,
    contentType,
  };
}

/** La URL pública de un objeto, sin pasar por el cliente autenticado. */
export function publicObjectUrl(
  bucket: StorageBucket,
  storagePath: string,
): string {
  const { url } = assertSupabaseConfig();
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${storagePath}`;
}

export interface StoredImageFacts {
  url: string;
  contentType: AllowedMime;
  dimensions: ImageDimensions | null;
}

/**
 * Qué llegó de verdad a esa ruta.
 *
 * Se lee solo la cabecera con una petición `Range`: para saber el formato y
 * las dimensiones bastan unas decenas de KB, y descargar entero un original
 * de 10 MB por cada foto para comprobarlo sería devolver a la función
 * serverless justo el tráfico que esta arquitectura le quita.
 *
 * El bucket es de lectura pública, así que la cabecera se pide por HTTP
 * normal y no hace falta ninguna credencial extra.
 */
export async function inspectStoredImage(
  bucket: StorageBucket,
  storagePath: string,
): Promise<StoredImageFacts> {
  // La URL se compone a mano en vez de pedirla al cliente de Supabase: el
  // bucket es de lectura pública, así que esto no necesita ninguna sesión
  // — y arrastrar una obligaba a tener una petición de Next alrededor para
  // leer unos bytes que cualquiera puede leer.
  const publicUrl = publicObjectUrl(bucket, storagePath);

  const response = await fetch(publicUrl, {
    headers: { Range: "bytes=0-65535" },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 206) {
    throw badRequest("La imagen no llegó a subirse. Vuelve a intentarlo.");
  }

  // Cuánto pesa de verdad lo que se subió. Sale de la misma petición que ya
  // se estaba haciendo: `Content-Range: bytes 0-65535/TOTAL` en una
  // respuesta parcial, o `Content-Length` cuando el archivo entero cabía en
  // el rango pedido. Es la comprobación de tamaño del lado del servidor —el
  // navegador descarta antes, pero su palabra no es autoridad— y la segunda
  // es el propio bucket, que la impone sin preguntarnos.
  const total = totalBytes(response);
  if (total !== null && total > MAX_VEHICLE_IMAGE_BYTES) {
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      `Cada imagen debe pesar menos de ${MAX_VEHICLE_IMAGE_LABEL}.`,
    );
  }

  const head = new Uint8Array(await response.arrayBuffer());
  const contentType = sniffImageType(head.subarray(0, 16));
  if (!contentType) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Ese archivo no es una imagen JPG, PNG, WebP o AVIF.",
    );
  }

  const dimensions = readImageDimensions(head);
  if (dimensions) {
    const tooSmall = imageTooSmall(dimensions);
    if (tooSmall) throw badRequest(tooSmall);
  }

  return { url: publicUrl, contentType, dimensions };
}

/**
 * El tamaño total del objeto, según la respuesta.
 *
 * `Content-Range` lo trae cuando Storage devuelve un trozo; si el archivo
 * entero cabía en el rango pedido no hay respuesta parcial y lo dice
 * `Content-Length`. `null` significa que no se pudo saber, y entonces no se
 * rechaza nada: el bucket sigue teniendo la última palabra.
 */
function totalBytes(response: Response): number | null {
  const range = response.headers.get("content-range");
  const fromRange = range?.match(/\/(\d+)\s*$/)?.[1];
  if (fromRange) return Number(fromRange);

  if (response.status === 200) {
    const length = response.headers.get("content-length");
    if (length && /^\d+$/.test(length)) return Number(length);
  }
  return null;
}
