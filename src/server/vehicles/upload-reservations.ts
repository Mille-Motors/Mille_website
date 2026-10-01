import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { conflict, notFound } from "@/server/http/errors";
import { removeStoredImage } from "@/server/storage/images";
import { VEHICLE_IMAGE_BUCKET } from "@/server/auth/config";

/**
 * El candado por vehículo y la retirada segura de reservas de subida.
 *
 * Vive aparte de `images.ts` porque lo necesitan dos sitios que no pueden
 * importarse entre sí: la gestión de imágenes y el borrado de vehículos. Un
 * módulo propio evita el ciclo y deja en un solo lugar la regla que más
 * cara cuesta repetir mal — cuándo se puede tirar la fila que apunta a un
 * objeto del bucket.
 */

/** Cuánto vale una reserva. Suficiente para un lote lento, no para siempre. */
export const RESERVATION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Qué objeto y de qué tipo, según NUESTRA tabla.
 *
 * Todo lo que el servidor borra o inspecciona sale de aquí, nunca de lo que
 * llega en el cuerpo de la petición.
 */
export interface OwnedUpload {
  id: string;
  storagePath: string;
  contentType: string;
}

/**
 * Una fecha de caducidad en el pasado remoto.
 *
 * Es la forma de decir "esta reserva ya no vale, pero su objeto sigue ahí y
 * hay que volver a intentar borrarlo". Ver `retireOwned()`.
 */
const ALREADY_EXPIRED = new Date(0);

// ---------------------------------------------------------------------------
// Serialización por vehículo
// ---------------------------------------------------------------------------

/**
 * Hacer que dos peticiones sobre el MISMO vehículo se pongan en fila.
 *
 * Contar y después escribir no es atómico por mucho que las dos mitades
 * sean rápidas: dos pestañas podían leer `usado = 0`, decidir cada una que
 * sus quince caben, y dejar treinta plazas reservadas. Lo mismo con las
 * posiciones de la galería — dos finalizaciones calculaban el mismo
 * `firstPosition` y una se estrellaba contra el índice único por nada. Y lo
 * mismo con borrar el vehículo mientras alguien reserva en otra pestaña.
 *
 * El candado es la propia fila de `Vehicle`, tomada con `FOR UPDATE` dentro
 * de la transacción que hace el trabajo. Postgres se encarga del resto: la
 * segunda petición espera a que la primera confirme y entonces lee el
 * recuento ya actualizado.
 *
 * Por qué así y no un mutex en memoria: en Vercel no hay "una" instancia.
 * Hay tantas como la plataforma decida levantar, cada una con su propio
 * proceso y su propia memoria, y un candado de JavaScript no cruza esa
 * frontera. La base de datos es el único sitio que las dos ven.
 *
 * El candado es POR VEHÍCULO, no global: dos fichas distintas bloquean
 * filas distintas y no se esperan entre sí.
 *
 * Dentro NO se habla con Storage. Lo que necesite red se hace antes y se
 * revalida después, con el candado puesto.
 */
export async function withVehicleLock<T>(
  vehicleId: string,
  body: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // Parametrizado por la plantilla etiquetada de Prisma: el id viaja
      // como $1, nunca interpolado en el texto de la sentencia.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Vehicle" WHERE "id" = ${vehicleId}::uuid FOR UPDATE
      `;
      if (locked.length === 0) throw notFound("Ese vehículo no existe.");
      return body(tx);
    },
    // Margen para esperar turno cuando otra tanda del mismo vehículo va por
    // delante. La sección crítica no hace E/S de red, así que lo que se
    // espera es a Postgres, no a Storage.
    { maxWait: 15_000, timeout: 15_000 },
  );
}

/**
 * Cuántos huecos hay ocupados, contando lo que ya está y lo que está en
 * vuelo. Se llama SIEMPRE con el candado del vehículo tomado.
 *
 * Las reservas vivas cuentan: sin eso, dos pestañas podían pedir entre las
 * dos más plazas de las que hay. Las caducadas no, porque ya no sirven para
 * registrar nada — y eso incluye a las que se marcaron caducadas porque su
 * limpieza en Storage falló.
 */
export async function usedSlots(
  tx: Prisma.TransactionClient,
  vehicleId: string,
): Promise<number> {
  const [images, active] = await Promise.all([
    tx.vehicleImage.count({ where: { vehicleId } }),
    tx.vehicleImageUpload.count({
      where: { vehicleId, expiresAt: { gte: new Date() } },
    }),
  ]);
  return images + active;
}

// ---------------------------------------------------------------------------
// Retirada de reservas
// ---------------------------------------------------------------------------

/**
 * Deja el objeto del bucket resuelto, de una forma u otra, y dice si la
 * reserva que lo apunta ya sobra.
 *
 * Sobra cuando el objeto se borró, cuando nunca llegó a subirse, o cuando
 * acabó enlazado a una `VehicleImage` y por tanto es una foto de la ficha y
 * no basura. No sobra cuando Storage falló: entonces la fila es la única
 * referencia que tenemos al huérfano y hay que conservarla.
 */
async function settleStorageObject(storagePath: string): Promise<boolean> {
  const linked = await prisma.vehicleImage.findFirst({
    where: { storagePath },
    select: { id: true },
  });
  if (linked) return true;

  const outcome = await removeStoredImage(VEHICLE_IMAGE_BUCKET, storagePath);
  return outcome !== "FAILED";
}

/**
 * Retirar un lote de reservas NUESTRAS: el objeto del bucket y la fila.
 *
 * Recibe filas de `VehicleImageUpload`, nunca rutas sueltas: así no hay
 * ningún camino por el que una ruta escrita por el cliente llegue a un
 * borrado. Y nunca toca un objeto que sí tiene `VehicleImage`, porque
 * entonces es una fotografía de la ficha y no basura de esta tanda.
 *
 * Lo que decide el desenlace de cada una es si quedó algo que rastrear:
 *
 *   borrado · nunca existió · ya enlazado  → la fila sobra, se va
 *   Storage falló                          → la fila SE QUEDA
 *
 * Ese último caso es el motivo de que esto no sea un `deleteMany`. La fila
 * es la única referencia que tenemos al objeto; tirarla deja un huérfano en
 * el bucket que nadie podrá encontrar nunca. En vez de eso se marca
 * caducada, que de un solo golpe la deja sin valor —la finalización rechaza
 * las caducadas— y fuera del cupo, y la pone en la cola del barrido
 * perezoso, que volverá a intentarlo en la siguiente reserva.
 *
 * Caducar en vez de añadir un `cancelledAt` es deliberado: las tres
 * propiedades que hacían falta ya estaban en el significado de "caducada",
 * y una columna nueva habría obligado a repetir ese estado en cada consulta
 * que hoy pregunta por `expiresAt`, con un sitio más donde olvidarlo.
 *
 * No propaga nada. Suele correr camino de un error que ya se iba a lanzar,
 * y si fallara sustituiría el motivo real por el suyo: quien administra
 * leería "no se pudo contactar con Storage" cuando lo que pasaba era que la
 * foto era demasiado pequeña.
 */
export async function retireOwned(owned: OwnedUpload[]): Promise<void> {
  for (const reservation of owned) {
    // Conservar es lo que pasa por defecto: cualquier forma de no saber que
    // el objeto está resuelto —error de Storage, excepción inesperada—
    // tiene la misma respuesta correcta, que es no tirar la referencia.
    let settled = false;
    try {
      settled = await settleStorageObject(reservation.storagePath);
    } catch (error) {
      console.error("[mille:images] no se pudo retirar el objeto", {
        bucket: VEHICLE_IMAGE_BUCKET,
        storagePath: reservation.storagePath,
        error,
      });
    }

    try {
      if (settled) {
        await prisma.vehicleImageUpload.deleteMany({
          where: { id: reservation.id },
        });
        continue;
      }
      await prisma.vehicleImageUpload.updateMany({
        where: { id: reservation.id },
        data: { expiresAt: ALREADY_EXPIRED },
      });
      console.warn("[mille:images] reserva conservada para reintentar limpieza", {
        reservationId: reservation.id,
        storagePath: reservation.storagePath,
      });
    } catch (error) {
      console.error("[mille:images] no se pudo cerrar la reserva", {
        reservationId: reservation.id,
        error,
      });
    }
  }
}

/**
 * Barrer las reservas caducadas, sin perder el rastro de su objeto.
 *
 * Antes se borraba la fila y punto. Si alguien reservó, subió y cerró la
 * pestaña sin finalizar, eso tiraba el ÚNICO registro que teníamos de ese
 * objeto: quedaba en el bucket para siempre y sin forma de encontrarlo.
 *
 * Corre fuera de cualquier candado: toca filas ya caducadas, que ninguna
 * petición en vuelo puede estar usando.
 */
export async function sweepExpiredReservations(): Promise<void> {
  const expired = await prisma.vehicleImageUpload.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true, storagePath: true, contentType: true },
    take: 50,
  });
  await retireOwned(expired);
}

// ---------------------------------------------------------------------------
// Antes de borrar un vehículo
// ---------------------------------------------------------------------------

/**
 * Retirar TODAS las reservas pendientes de un vehículo. Devuelve cuántas
 * quedaron sin resolver.
 *
 * Existe por una interacción fea entre dos cosas que por separado estaban
 * bien. `retireOwned()` conserva a propósito la fila cuando Storage no pudo
 * borrar su objeto, porque es la única pista que queda. Y
 * `VehicleImageUpload.vehicleId` tiene `ON DELETE CASCADE`. Juntas: borrar
 * el borrador que la subida acababa de crear se llevaba por delante esa
 * pista, y el objeto quedaba en el bucket para siempre sin recibo.
 *
 * Así que antes de borrar un vehículo hay que intentar la limpieza y
 * comprobar el resultado. Esto hace lo primero; quien borra hace lo segundo
 * bajo el candado, porque entre una cosa y la otra puede aparecer una
 * reserva nueva.
 *
 * Habla con Storage, así que se llama FUERA del candado.
 */
export async function cleanupVehicleUploadReservations(
  vehicleId: string,
): Promise<number> {
  const pending = await prisma.vehicleImageUpload.findMany({
    where: { vehicleId },
    select: { id: true, storagePath: true, contentType: true },
  });
  if (pending.length === 0) return 0;

  await retireOwned(pending);
  return prisma.vehicleImageUpload.count({ where: { vehicleId } });
}

/**
 * El error cuando la limpieza no terminó y por tanto no se puede borrar.
 *
 * Es un conflicto, no un fallo: el vehículo sigue intacto, la reserva sigue
 * intacta, y volver a intentarlo más tarde es exactamente lo que hay que
 * hacer.
 */
export const pendingCleanupConflict = () =>
  conflict(
    "No se pudo terminar de limpiar una subida pendiente. Inténtalo de nuevo.",
  );
