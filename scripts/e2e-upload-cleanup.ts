import "../prisma/env";

import { prisma } from "@/server/db/prisma";
import {
  createDraftVehicle,
  deleteVehicle,
  discardDraftVehicle,
} from "@/server/vehicles/service";
import {
  commitVehicleImages,
  reserveVehicleImageUploads,
} from "@/server/vehicles/images";
import { withVehicleLock } from "@/server/vehicles/upload-reservations";
import type { VehicleDeletionResult } from "@/server/vehicles/service";

/**
 * El borrado de un vehículo no puede llevarse por delante la pista de un
 * objeto del bucket.
 *
 *     npx tsx --conditions=react-server scripts/e2e-upload-cleanup.ts
 *
 * `VehicleImageUpload.vehicleId` borra en cascada, y `retireOwned()`
 * conserva a propósito la fila cuando Storage no pudo retirar su objeto.
 * Juntas, las dos cosas se anulaban: descartar el borrador que la subida
 * acababa de crear tiraba la única referencia al huérfano.
 *
 * Este script no tiene sesión de navegador, así que las políticas de
 * Storage rechazan cualquier borrado y `removeStoredImage()` devuelve
 * FAILED de verdad. No hay nada simulado en el fallo: es el escenario real
 * de "Storage no responde", que es justo el difícil de montar a mano.
 *
 * Por el mismo motivo, la rama contraria —la retirada que SÍ se resuelve—
 * se provoca por la otra vía real que tiene `settleStorageObject()`: un
 * objeto ya enlazado a una `VehicleImage` no es basura y su reserva sobra
 * sin tocar el bucket. Las ramas DELETED y ALREADY_ABSENT se ven en la
 * prueba manual del navegador.
 *
 * Crea sus propios vehículos y los borra al terminar, pase lo que pase.
 */

let passed = 0;
const failures: string[] = [];
const created: string[] = [];

function check(condition: boolean, what: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${what}`);
  } else {
    failures.push(what);
    console.log(`  ✗ ${what}`);
  }
}

async function makeDraft(): Promise<string> {
  const vehicle = await createDraftVehicle();
  created.push(vehicle.id);
  return vehicle.id;
}

const exists = async (id: string) =>
  (await prisma.vehicle.count({ where: { id } })) === 1;

const reservationsOf = (vehicleId: string) =>
  prisma.vehicleImageUpload.findMany({ where: { vehicleId } });

const activeReservations = (vehicleId: string) =>
  prisma.vehicleImageUpload.count({
    where: { vehicleId, expiresAt: { gte: new Date() } },
  });

/** Deja el objeto de esa reserva enlazado, que es "limpieza resuelta". */
async function linkObject(vehicleId: string, storagePath: string, position: number) {
  await prisma.vehicleImage.create({
    data: {
      vehicleId,
      url: `https://ejemplo.invalido/${storagePath}`,
      storagePath,
      source: "STORAGE",
      alt: "Temporal",
      position,
    },
  });
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * El correo con el que se marcan las solicitudes del test.
 *
 * `Inquiry.vehicleId` es `onDelete: SetNull`, así que borrar el vehículo del
 * caso H no se lleva su solicitud: queda suelta. Está bien que la base se
 * comporte así —una conversación no se pierde porque desaparezca el coche—
 * pero significa que la limpieza del test tiene que borrarla a mano, y para
 * eso hay que poder reconocerla sin ambigüedad.
 */
const TEST_INQUIRY_EMAIL = "prueba@ejemplo.invalido";

/** Las rutas que `deleteVehicle` llegó a conocer: las que intentó retirar. */
const knownPaths = (result: VehicleDeletionResult) =>
  [...result.failedObjects].sort();

async function failureOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}

// ---------------------------------------------------------------------------

async function caseA(): Promise<void> {
  console.log("\nCASO A — limpieza resuelta: el borrador se descarta");

  // A1: sin reservas pendientes, el camino normal no se estorba.
  const plain = await makeDraft();
  await discardDraftVehicle(plain);
  check(!(await exists(plain)), "sin reservas, el borrador desaparece");

  // A2: con una reserva cuyo objeto quedó enlazado, la retirada se
  // resuelve sin tocar el bucket y el borrado puede seguir.
  const withLinked = await makeDraft();
  const batch = await reserveVehicleImageUploads(withLinked, ["image/jpeg"]);
  await linkObject(withLinked, batch.uploads[0].storagePath, 0);

  await discardDraftVehicle(withLinked);
  check(!(await exists(withLinked)), "con la reserva resuelta, también desaparece");
  check(
    (await prisma.vehicleImageUpload.count({ where: { vehicleId: withLinked } })) === 0,
    "y no queda ninguna reserva",
  );
}

async function caseB(): Promise<string> {
  console.log("\nCASO B — Storage falla: el borrador NO se descarta");
  const vehicleId = await makeDraft();
  const batch = await reserveVehicleImageUploads(vehicleId, ["image/jpeg"]);
  const { storagePath } = batch.uploads[0];

  const message = await failureOf(() => discardDraftVehicle(vehicleId));

  check(
    message.includes("No se pudo terminar de limpiar una subida pendiente"),
    `el descarte falla con un error controlado (${message || "no falló"})`,
  );
  check(await exists(vehicleId), "el Vehicle sigue existiendo");

  const kept = await reservationsOf(vehicleId);
  check(kept.length === 1, "la VehicleImageUpload sigue existiendo");
  check(kept[0]?.storagePath === storagePath, "conserva su storagePath");
  check(
    kept[0]?.expiresAt.getTime() < Date.now(),
    "queda caducada, no válida para finalizar",
  );
  check((await activeReservations(vehicleId)) === 0, "no ocupa cupo");

  return vehicleId;
}

async function caseC(vehicleId: string): Promise<void> {
  console.log("\nCASO C — reintento: cuando la limpieza se resuelve, sí se descarta");
  const [reservation] = await reservationsOf(vehicleId);
  await linkObject(vehicleId, reservation.storagePath, 0);

  await discardDraftVehicle(vehicleId);

  check(!(await exists(vehicleId)), "ahora el Vehicle desaparece");
  check(
    (await prisma.vehicleImageUpload.count({ where: { id: reservation.id } })) === 0,
    "y la reserva desaparece con él",
  );
}

async function caseD(): Promise<void> {
  console.log("\nCASO D — el borrado general tiene la misma protección");
  const vehicleId = await makeDraft();
  await reserveVehicleImageUploads(vehicleId, ["image/jpeg"]);

  const message = await failureOf(() => deleteVehicle(vehicleId));

  check(
    message.includes("No se pudo terminar de limpiar una subida pendiente"),
    `deleteVehicle se niega (${message || "no falló"})`,
  );
  check(await exists(vehicleId), "el Vehicle sigue existiendo");
  check((await reservationsOf(vehicleId)).length === 1, "la reserva sigue existiendo");

  // Y cuando se resuelve, deja de negarse.
  const [reservation] = await reservationsOf(vehicleId);
  await linkObject(vehicleId, reservation.storagePath, 0);
  await deleteVehicle(vehicleId);
  check(!(await exists(vehicleId)), "resuelta la limpieza, el borrado procede");
}

async function caseE(): Promise<void> {
  console.log("\nCASO E — reservar y borrar a la vez");

  for (let round = 1; round <= 4; round += 1) {
    const vehicleId = await makeDraft();
    // En las dos últimas rondas el borrado sale con ventaja, para que la
    // carrera caiga también del otro lado y se vea la rama contraria.
    const headStart = round > 2 ? 200 : 0;

    const [reserved, deleted] = await Promise.allSettled([
      (async () => {
        if (headStart) await new Promise((done) => setTimeout(done, headStart));
        return reserveVehicleImageUploads(vehicleId, ["image/jpeg"]);
      })(),
      deleteVehicle(vehicleId),
    ]);

    const alive = await exists(vehicleId);
    const leftover = await prisma.vehicleImageUpload.count({ where: { vehicleId } });

    // Lo prohibido: el vehículo borrado habiendo llegado a existir una
    // reserva. La cascada se la habría llevado y el objeto quedaría sin
    // recibo.
    const lostReference = !alive && reserved.status === "fulfilled";
    check(!lostReference, `ronda ${round}: nunca se borra el Vehicle con reserva viva`);

    if (!alive) {
      check(
        reserved.status === "rejected",
        `ronda ${round}: ganó el borrado y la reserva se rechazó`,
      );
    } else {
      check(
        deleted.status === "rejected" && leftover > 0,
        `ronda ${round}: ganó la reserva y el borrado se abstuvo`,
      );
    }
  }
}

async function caseF(): Promise<void> {
  console.log("\nCASO F — finalizar fotos y borrar el vehículo a la vez");

  // RAMA A: la finalización llega primero. El borrado, que arranca después,
  // tiene que enterarse de las dos fotos recién creadas.
  {
    const vehicleId = await makeDraft();
    const batch = await reserveVehicleImageUploads(vehicleId, [
      "image/jpeg",
      "image/jpeg",
    ]);
    const paths = batch.uploads.map((u) => u.storagePath);
    const images = paths.map((storagePath) => ({
      storagePath,
      url: `https://ejemplo.invalido/${storagePath}`,
    }));

    const [committed, deleted] = await Promise.allSettled([
      commitVehicleImages(
        vehicleId,
        batch.uploads.map((u) => u.reservationId),
        images,
        "Temporal F",
      ),
      (async () => {
        await sleep(250);
        return deleteVehicle(vehicleId);
      })(),
    ]);

    check(committed.status === "fulfilled", "A · la finalización termina");
    check(deleted.status === "fulfilled", "A · el borrado termina");
    check(!(await exists(vehicleId)), "A · el Vehicle desaparece");
    check(
      (await prisma.vehicleImage.count({ where: { storagePath: { in: paths } } })) === 0,
      "A · no queda ninguna VehicleImage",
    );

    if (deleted.status === "fulfilled") {
      const known = knownPaths(deleted.value as VehicleDeletionResult);
      check(
        known.join("|") === [...paths].sort().join("|"),
        `A · el borrado conoce las rutas de las fotos concurrentes (${known.length} de 2)`,
      );
    }
  }

  // RAMA B: el borrado llega primero. La finalización tiene que fallar sin
  // crear nada para un vehículo que ya no existe.
  {
    const vehicleId = await makeDraft();
    const batch = await reserveVehicleImageUploads(vehicleId, ["image/jpeg"]);
    const [upload] = batch.uploads;
    const images = [
      {
        storagePath: upload.storagePath,
        url: `https://ejemplo.invalido/${upload.storagePath}`,
      },
    ];

    // Su reserva ya se gastó en un intento anterior: así el borrado no la
    // encuentra pendiente y puede decidir, que es la situación en la que una
    // finalización llega de verdad tarde.
    await commitVehicleImages(vehicleId, [upload.reservationId], images, "Temporal F");
    await prisma.vehicleImage.deleteMany({ where: { vehicleId } });

    const [committed, deleted] = await Promise.allSettled([
      (async () => {
        await sleep(250);
        return commitVehicleImages(
          vehicleId,
          [upload.reservationId],
          images,
          "Temporal F",
        );
      })(),
      deleteVehicle(vehicleId),
    ]);

    check(deleted.status === "fulfilled", "B · el borrado termina");
    check(!(await exists(vehicleId)), "B · el Vehicle desaparece");
    check(committed.status === "rejected", "B · la finalización falla");
    check(
      (await prisma.vehicleImage.count({ where: { storagePath: upload.storagePath } })) === 0,
      "B · no recrea ninguna imagen para un Vehicle inexistente",
    );
  }
}

async function caseG(): Promise<void> {
  console.log("\nCASO G — una foto que aparece mientras el borrado espera turno");
  const vehicleId = await makeDraft();
  const storagePath = `vehicles/${vehicleId}/aparecida.jpg`;

  // El candado se toma desde el test. El borrado se lanza con el candado ya
  // ocupado, así que si leyera el estado ANTES de pedirlo, lo leería ahora
  // —cuando todavía no hay ninguna foto—.
  let deletion: Promise<VehicleDeletionResult> | null = null;
  await withVehicleLock(vehicleId, async (tx) => {
    deletion = deleteVehicle(vehicleId);
    await sleep(600);
    await tx.vehicleImage.create({
      data: {
        vehicleId,
        url: `https://ejemplo.invalido/${storagePath}`,
        storagePath,
        source: "STORAGE",
        alt: "Temporal",
        position: 0,
      },
    });
  });

  const result = await deletion!;

  check(!(await exists(vehicleId)), "el Vehicle desaparece");
  check(
    knownPaths(result).includes(storagePath),
    "el borrado conoce la ruta de la foto que apareció después de su arranque",
  );
  check(
    result.removedObjects + result.failedObjects.length === 1,
    "y la cuenta cuadra: una sola ruta, no cero",
  );
}

async function caseH(): Promise<void> {
  console.log("\nCASO H — una solicitud que aparece mientras el borrado espera turno");
  const vehicleId = await makeDraft();

  let deletion: Promise<VehicleDeletionResult> | null = null;
  await withVehicleLock(vehicleId, async (tx) => {
    deletion = deleteVehicle(vehicleId);
    await sleep(600);
    await tx.inquiry.create({
      data: {
        type: "VEHICLE_INFO",
        vehicleId,
        name: "Prueba",
        phone: "3000000000",
        email: TEST_INQUIRY_EMAIL,
      },
    });
  });

  const result = await deletion!;

  check(result.archived, "el resultado dice archivado, no borrado");
  check(await exists(vehicleId), "el Vehicle se conserva");
  const row = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { publicationStatus: true },
  });
  check(row?.publicationStatus === "ARCHIVED", "y queda en ARCHIVED");
  check(
    (await prisma.inquiry.count({ where: { vehicleId } })) === 1,
    "la solicitud sigue apuntando al vehículo",
  );
}

async function main(): Promise<void> {
  try {
    await caseA();
    const pending = await caseB();
    await caseC(pending);
    await caseD();
    await caseE();
    await caseF();
    await caseG();
    await caseH();
  } finally {
    // Aquí sí se fuerza: estos vehículos son del test y su "basura" en
    // Storage no existe, porque ningún objeto llegó a subirse nunca.
    const removed = await prisma.vehicle.deleteMany({ where: { id: { in: created } } });
    // Y las solicitudes que el caso H dejó sueltas al borrarse su vehículo.
    const inquiries = await prisma.inquiry.deleteMany({
      where: { email: TEST_INQUIRY_EMAIL },
    });
    console.log(
      `\nLimpieza: ${removed.count} vehículos y ${inquiries.count} solicitudes temporales borradas.`,
    );
    await prisma.$disconnect();
  }

  console.log(`\n${passed} comprobaciones bien, ${failures.length} mal.`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

void main();
