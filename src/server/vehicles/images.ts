import "server-only";

import { prisma } from "@/server/db/prisma";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { vehicleTitle } from "@/lib/format";
import { normalizeFocal, roundFocal, type FocalPoint } from "@/lib/focal-point";
import {
  MAX_IMAGES_PER_VEHICLE,
  deleteStoredImage,
  inspectStoredImage,
  reserveUploadPath,
  type ReservedUpload,
} from "@/server/storage/images";
import {
  RESERVATION_TTL_MS,
  retireOwned,
  sweepExpiredReservations,
  usedSlots,
  withVehicleLock,
  type OwnedUpload,
} from "@/server/vehicles/upload-reservations";
import { VEHICLE_IMAGE_BUCKET } from "@/server/auth/config";
import { toVehicleDto, vehicleInclude, type VehicleRecord } from "@/server/vehicles/mapper";
import { assertPublishedInvariant } from "@/server/vehicles/service";
import type { Vehicle } from "@/types/vehicle";

/**
 * Las imágenes de un vehículo: subir, ordenar y borrar.
 *
 * `position` es el orden de la galería y la 0 es la portada. La columna
 * tiene un índice único (vehicleId, position), así que reordenar se hace en
 * una transacción y en dos pasos: primero se apartan a posiciones negativas
 * y luego se asignan las definitivas. Sin eso, mover la tercera a la primera
 * chocaría contra la fila que todavía ocupa ese hueco.
 */

async function reloadVehicle(vehicleId: string): Promise<Vehicle> {
  const record = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: vehicleInclude,
  });
  if (!record) throw notFound("Ese vehículo no existe.");
  return toVehicleDto(record as VehicleRecord);
}

/**
 * Reservar las rutas para que el navegador suba directo.
 *
 * El servidor autoriza, cuenta y GENERA las rutas; el cliente nunca propone
 * una. Cada ruta se anota en `VehicleImageUpload`, que es el recibo que la
 * finalización exige después: sin él, comprobar el prefijo limitaba el daño
 * pero no demostraba que la ruta hubiera salido de aquí.
 *
 * Contar y crear ocurren bajo el candado del vehículo, así que el límite de
 * veinte lo es de verdad y no solo en ausencia de concurrencia.
 */
export async function reserveVehicleImageUploads(
  vehicleId: string,
  declaredTypes: string[],
): Promise<{ bucket: string; uploads: ReservedUpload[] }> {
  // Antes de contar: liberar lo que caducó devuelve sus plazas. Fuera del
  // candado porque habla con Storage y no queremos esa espera dentro.
  await sweepExpiredReservations();

  // Las rutas se generan antes de entrar: son UUID, no dependen de nada que
  // haya que leer bajo el candado, y un tipo no admitido debe rechazarse sin
  // haber hecho esperar a nadie.
  const paths = declaredTypes.map((declared) =>
    reserveUploadPath(`vehicles/${vehicleId}`, declared),
  );

  const rows = await withVehicleLock(vehicleId, async (tx) => {
    const used = await usedSlots(tx, vehicleId);
    if (used + paths.length > MAX_IMAGES_PER_VEHICLE) {
      throw conflict(
        `Un vehículo admite hasta ${MAX_IMAGES_PER_VEHICLE} imágenes; ` +
          `entre las que tiene y las que se están subiendo ya hay ${used}.`,
      );
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
    const created: OwnedUpload[] = [];
    for (const path of paths) {
      created.push(
        await tx.vehicleImageUpload.create({
          data: {
            vehicleId,
            storagePath: path.storagePath,
            contentType: path.contentType,
            expiresAt,
          },
          select: { id: true, storagePath: true, contentType: true },
        }),
      );
    }
    return created;
  });

  return {
    bucket: VEHICLE_IMAGE_BUCKET,
    uploads: rows.map((row, index) => ({
      reservationId: row.id,
      storagePath: row.storagePath,
      contentType: paths[index].contentType,
    })),
  };
}

/**
 * Las reservas de ESTE vehículo, y solo esas.
 *
 * Es el único sitio por el que una ruta entra en la lógica del servidor. Si
 * un id no existe o es de otro vehículo, aquí no aparece — y como todo lo
 * que se borra después sale de esta lista, el objeto pendiente de otro
 * vehículo no puede resultar afectado ni por accidente ni a propósito.
 */
async function ownedReservations(
  vehicleId: string,
  reservationIds: string[],
): Promise<OwnedUpload[]> {
  return prisma.vehicleImageUpload.findMany({
    where: { id: { in: reservationIds }, vehicleId },
    select: { id: true, storagePath: true, contentType: true },
  });
}

/**
 * Cancelar un lote: retirar sus objetos y liberar sus plazas.
 *
 * Lo llama el navegador cuando una subida directa falla a mitad, que es
 * cuando el servidor no se entera por su cuenta de que esas reservas ya no
 * van a usarse. Solo toca las de este vehículo: un id ajeno simplemente no
 * aparece en la consulta.
 */
export async function cancelVehicleImageUploads(
  vehicleId: string,
  reservationIds: string[],
): Promise<{ cancelled: number }> {
  const owned = await ownedReservations(vehicleId, reservationIds);
  await retireOwned(owned);
  return { cancelled: owned.length };
}

/**
 * Registrar lo que el navegador ya subió. Todo o nada.
 *
 * Se finaliza por IDENTIFICADOR de reserva, no por ruta. El navegador
 * necesita la ruta para escribir en Storage, pero mandarla de vuelta como
 * autoridad permitía que el cierre de un vehículo señalara el objeto
 * pendiente de otro: la ruta no estaba reservada aquí, la petición fallaba
 * —correctamente— y la limpieza borraba igualmente un objeto ajeno. Con el
 * id, la ruta la pone la base de datos.
 *
 * Antes se validaba y creaba foto a foto, así que un lote de cinco con la
 * tercera mala dejaba dos registradas y devolvía un error. Ahora se
 * comprueba TODO y solo después se escribe, en una única transacción.
 *
 * Lo que se comprueba, en este orden:
 *
 *   1. que no vengan identificadores repetidos;
 *   2. que TODOS correspondan a reservas vivas de ESTE vehículo;
 *   3. que quepan, contando lo que el vehículo ya tiene;
 *   4. que cada objeto esté en el bucket, sea una imagen admitida y del
 *      MISMO tipo que se reservó —un PNG no puede acabar servido como JPEG—;
 *   5. que tenga resolución suficiente.
 *
 * Si algo falla, no se crea ninguna fila y se retiran los objetos de ESTA
 * tanda. Las imágenes que ya existían no se tocan nunca.
 *
 * El trabajo se parte en dos a propósito. La inspección de los objetos son
 * N peticiones HTTP a Storage y no puede ocurrir con el candado del vehículo
 * tomado: bloquearía a cualquier otra tanda durante segundos. Lo que sí va
 * bajo candado es la parte corta —volver a comprobar, calcular posiciones y
 * escribir—, que es la única donde dos peticiones se pisan.
 */
export async function registerVehicleImages(
  vehicleId: string,
  reservationIds: string[],
): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, make: true, model: true, version: true },
  });
  if (!vehicle) throw notFound("Ese vehículo no existe.");

  if (new Set(reservationIds).size !== reservationIds.length) {
    throw badRequest("Hay subidas repetidas en la misma petición.");
  }

  const owned = await ownedReservations(vehicleId, reservationIds);
  if (owned.length !== reservationIds.length) {
    // Falta alguna: no existe, es de otro vehículo o ya se consumió. No se
    // limpia NADA — lo que no es nuestro no se toca ni para borrarlo.
    throw badRequest("Esa subida no estaba reservada. Vuelve a intentarlo.");
  }

  // A partir de aquí todo lo que se limpia sale de `owned`, es decir de
  // nuestra propia tabla y de este vehículo.
  const fail = async (error: Error): Promise<never> => {
    await retireOwned(owned);
    throw error;
  };

  const ids = owned.map((row) => row.id);

  const expired = await prisma.vehicleImageUpload.findFirst({
    where: { id: { in: ids }, expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (expired) {
    return fail(badRequest("La reserva de subida caducó. Vuelve a intentarlo."));
  }

  // Inspección completa ANTES de escribir nada. Son N peticiones a Storage
  // y por eso van FUERA del candado.
  const inspected: { storagePath: string; url: string }[] = [];
  for (const reservation of owned) {
    let facts;
    try {
      facts = await inspectStoredImage(
        VEHICLE_IMAGE_BUCKET,
        reservation.storagePath,
      );
    } catch (error) {
      return fail(error as Error);
    }

    if (facts.contentType !== reservation.contentType) {
      return fail(
        badRequest(
          `El archivo subido no es ${reservation.contentType}. Vuelve a subirlo sin cambiarle la extensión.`,
        ),
      );
    }
    inspected.push({ storagePath: reservation.storagePath, url: facts.url });
  }

  try {
    await commitVehicleImages(vehicleId, ids, inspected, vehicleTitle(vehicle));
  } catch (error) {
    if (error instanceof AlreadyConsumed) {
      // Sin limpieza: borrar aquí tiraría del bucket una foto que la otra
      // petición acaba de registrar correctamente.
      throw conflict("Esas fotos ya se registraron. Recarga la página.");
    }
    return fail(error as Error);
  }

  return reloadVehicle(vehicleId);
}

/**
 * La sección crítica de la finalización: corta, sin E/S de red, y
 * serializada por vehículo.
 *
 * Dentro del candado se vuelve a comprobar TODO lo que pudo cambiar
 * mientras se inspeccionaban los archivos, se calculan las posiciones y se
 * escribe. Fuera queda la inspección, que son N peticiones HTTP y
 * bloquearía a cualquier otra tanda durante segundos.
 *
 * Está separada y exportada porque es la pieza que las pruebas de
 * concurrencia tienen que ejercitar de verdad: montar la mitad de arriba
 * desde un script exigiría subir objetos al bucket, y eso necesita una
 * sesión de navegador. Probar el reparto de posiciones con una copia del
 * código no probaría nada.
 */
export async function commitVehicleImages(
  vehicleId: string,
  reservationIds: string[],
  images: { storagePath: string; url: string }[],
  title: string,
): Promise<void> {
  await withVehicleLock(vehicleId, async (tx) => {
    const still = await tx.vehicleImageUpload.count({
      where: {
        id: { in: reservationIds },
        vehicleId,
        expiresAt: { gte: new Date() },
      },
    });
    if (still !== reservationIds.length) {
      // Otra petición las consumió —o caducaron— mientras mirábamos los
      // objetos. Los objetos ya no son nuestros: o son imágenes suyas, o
      // su limpieza le toca a ella. Se sale sin tocar nada.
      throw new AlreadyConsumed();
    }

    const count = await tx.vehicleImage.count({ where: { vehicleId } });
    if (count + images.length > MAX_IMAGES_PER_VEHICLE) {
      throw conflict(
        `Un vehículo admite hasta ${MAX_IMAGES_PER_VEHICLE} imágenes; ya tiene ${count}.`,
      );
    }

    // La posición se calcula AQUÍ, con el candado puesto. Calcularla fuera
    // hacía que dos tandas legítimas del mismo vehículo eligieran el mismo
    // número y una se estrellara contra el índice único sin que hubiera
    // nada malo en ella.
    const last = await tx.vehicleImage.findFirst({
      where: { vehicleId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const firstPosition = last ? last.position + 1 : 0;

    for (const [index, image] of images.entries()) {
      await tx.vehicleImage.create({
        data: {
          vehicleId,
          url: image.url,
          storagePath: image.storagePath,
          source: "STORAGE",
          alt: `${title}, fotografía ${firstPosition + index + 1}`,
          position: firstPosition + index,
        },
      });
    }
    // Consumir las reservas dentro de la misma transacción: si la escritura
    // revierte, siguen valiendo para reintentar.
    await tx.vehicleImageUpload.deleteMany({
      where: { id: { in: reservationIds } },
    });
  });
}

/**
 * Las reservas desaparecieron bajo nuestros pies.
 *
 * Es el único desenlace tras el cual NO se limpia nada: si otra petición
 * consumió estas reservas mientras inspeccionábamos sus objetos, esos
 * objetos ya son sus imágenes.
 */
export class AlreadyConsumed extends Error {}

/**
 * Elegir qué parte de una fotografía se ve dentro del marco horizontal.
 *
 * No toca el archivo, ni la URL, ni la ruta de Storage, ni la posición en la
 * galería, ni el texto alternativo: solo dos números. Encuadrar no es volver
 * a subir, y por eso tiene su propio endpoint y no pasa por el de subida.
 *
 * `reloadVehicle` devuelve la ficha entera porque es lo que el administrador
 * tiene en pantalla; el cambio real son las dos columnas.
 */
export async function setVehicleImageFocal(
  vehicleId: string,
  imageId: string,
  focal: FocalPoint,
): Promise<Vehicle> {
  // Por identificador Y vehículo. Un imageId de otra ficha simplemente no
  // aparece, igual que con las reservas de subida: lo que no es de este
  // vehículo no se puede modificar desde su pantalla.
  const image = await prisma.vehicleImage.findFirst({
    where: { id: imageId, vehicleId },
    select: { id: true },
  });
  if (!image) throw notFound("Esa imagen no existe.");

  const safe = roundFocal(normalizeFocal(focal));
  await prisma.vehicleImage.update({
    where: { id: image.id },
    data: { focalX: safe.x, focalY: safe.y },
  });

  return reloadVehicle(vehicleId);
}

/**
 * Quitar una fotografía de un vehículo.
 *
 * Todo el trabajo de base va en una transacción que termina comprobando la
 * invariante de publicado: si esta era la última foto de un vehículo que
 * está publicado, la comprobación lanza, la transacción revierte y la imagen
 * no se pierde. Antes se borraba igual y la ficha pública quedaba enseñando
 * la imagen de marca como si fuera el coche.
 *
 * El objeto del bucket se borra DESPUÉS de que la transacción confirme.
 * Hacerlo antes significaría perder el archivo aunque la base revierta.
 *
 * Va bajo el candado del vehículo por lo mismo que la finalización: esto
 * renumera la galería a 0..n-1, y una tanda que estuviera añadiendo en la
 * posición n al mismo tiempo chocaría con el índice único.
 */
export async function deleteVehicleImage(
  vehicleId: string,
  imageId: string,
): Promise<Vehicle> {
  const image = await prisma.vehicleImage.findFirst({
    where: { id: imageId, vehicleId },
  });
  if (!image) throw notFound("Esa imagen no existe.");

  const vehicle = await withVehicleLock(vehicleId, async (tx) => {
    await tx.vehicleImage.delete({ where: { id: imageId } });

    // Cerrar el hueco para que las posiciones sigan siendo 0..n-1. El paso
    // por negativos evita chocar con el índice único (vehicleId, position).
    const rest = await tx.vehicleImage.findMany({
      where: { vehicleId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (const [index, row] of rest.entries()) {
      await tx.vehicleImage.update({
        where: { id: row.id },
        data: { position: -(index + 1) },
      });
    }
    for (const [index, row] of rest.entries()) {
      await tx.vehicleImage.update({
        where: { id: row.id },
        data: { position: index },
      });
    }

    return assertPublishedInvariant(tx, vehicleId);
  });

  // Solo aquí, con la base ya confirmada. Las imágenes LEGACY viven en
  // /public y no se tocan desde ningún bucket.
  if (image.source === "STORAGE" && image.storagePath) {
    await deleteStoredImage(VEHICLE_IMAGE_BUCKET, image.storagePath);
  }

  return vehicle;
}

export async function reorderVehicleImages(
  vehicleId: string,
  order: { id: string; position: number; alt?: string }[],
): Promise<Vehicle> {
  const existing = await prisma.vehicleImage.findMany({
    where: { vehicleId },
    select: { id: true },
  });
  const known = new Set(existing.map((row) => row.id));
  for (const entry of order) {
    if (!known.has(entry.id)) {
      throw notFound("Una de las imágenes no pertenece a este vehículo.");
    }
  }

  const normalised = [...order]
    .sort((a, b) => a.position - b.position)
    .map((entry, index) => ({ ...entry, position: index }));

  // Bajo el candado del vehículo: reordenar reasigna todas las posiciones, y
  // una finalización simultánea que estuviera añadiendo al final las vería a
  // medio mover.
  await withVehicleLock(vehicleId, async (tx) => {
    // Paso de aparcamiento: posiciones negativas que nadie más ocupa, para
    // no chocar contra el índice único mientras se recolocan.
    for (const [index, entry] of normalised.entries()) {
      await tx.vehicleImage.update({
        where: { id: entry.id },
        data: { position: -(index + 1) },
      });
    }
    for (const entry of normalised) {
      await tx.vehicleImage.update({
        where: { id: entry.id },
        data: {
          position: entry.position,
          ...(entry.alt !== undefined ? { alt: entry.alt } : {}),
        },
      });
    }
  });

  return reloadVehicle(vehicleId);
}
