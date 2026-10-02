import "../prisma/env";

import { prisma } from "@/server/db/prisma";
import {
  AlreadyConsumed,
  cancelVehicleImageUploads,
  commitVehicleImages,
  registerVehicleImages,
  reserveVehicleImageUploads,
} from "@/server/vehicles/images";
import { MAX_IMAGES_PER_VEHICLE } from "@/server/storage/images";
import { withVehicleLock } from "@/server/vehicles/upload-reservations";
import { deleteVehicleImage } from "@/server/vehicles/images";
import { setPublication } from "@/server/vehicles/service";

/**
 * Concurrencia real contra la base de datos de verdad.
 *
 *     npx tsx --conditions=react-server scripts/e2e-image-concurrency.ts
 *
 * Lanza las operaciones con `Promise.all`, no una detrás de otra. Un test
 * secuencial que "simula dos pestañas" no habría detectado nunca el fallo
 * que esto cubre: leer el cupo y escribir las reservas en dos pasos daba un
 * resultado correcto siempre que nadie se metiera en medio.
 *
 * Crea sus propios vehículos con slug `tmp-conc-` y los borra al terminar,
 * pase lo que pase. No toca ni el inventario ni las fichas de QA.
 *
 * Lo que NO puede hacer: subir objetos al bucket. Las políticas de Storage
 * evalúan la sesión del navegador y este script no tiene ninguna. Por eso
 * la finalización se ejercita por su sección crítica —`commitVehicleImages`,
 * que es el código real, no una copia— y la inspección de los archivos se
 * prueba en el navegador.
 */

let passed = 0;
const failures: string[] = [];

function check(condition: boolean, what: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${what}`);
  } else {
    failures.push(what);
    console.log(`  ✗ ${what}`);
  }
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function makeVehicle(label: string): Promise<string> {
  const row = await prisma.vehicle.create({
    data: {
      slug: `tmp-conc-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vehicleType: "AUTO",
      make: "Temporal",
      model: label,
    },
    select: { id: true },
  });
  return row.id;
}

/** Mantiene tomado el candado de un vehículo durante `ms`. */
function holdLock(vehicleId: string, ms: number): Promise<void> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Vehicle" WHERE "id" = ${vehicleId}::uuid FOR UPDATE`;
      await sleep(ms);
    },
    { maxWait: 20_000, timeout: 20_000 },
  );
}

const jpegTypes = (count: number) => Array.from({ length: count }, () => "image/jpeg");

async function activeReservations(vehicleId: string): Promise<number> {
  return prisma.vehicleImageUpload.count({
    where: { vehicleId, expiresAt: { gte: new Date() } },
  });
}

// ---------------------------------------------------------------------------

async function case1(): Promise<void> {
  console.log("\nCASO 1 — dos reservas de 15 a la vez sobre un vehículo vacío");
  const vehicleId = await makeVehicle("c1");

  const results = await Promise.allSettled([
    reserveVehicleImageUploads(vehicleId, jpegTypes(15)),
    reserveVehicleImageUploads(vehicleId, jpegTypes(15)),
  ]);

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const active = await activeReservations(vehicleId);

  check(active <= MAX_IMAGES_PER_VEHICLE, `nunca más de 20 plazas activas (hay ${active})`);
  check(ok === 1, `exactamente una de las dos pasa (pasaron ${ok})`);
  check(active === 15, `quedan las 15 de la que pasó (hay ${active})`);

  const rejected = results.find((r) => r.status === "rejected");
  check(
    rejected !== undefined &&
      String((rejected as PromiseRejectedResult).reason?.message).includes("20 imágenes"),
    "la que no pasa falla por el límite, no por otra cosa",
  );
}

async function case2(): Promise<void> {
  console.log("\nCASO 2 — borde: 10 plazas ocupadas, dos peticiones de 6 a la vez");
  const vehicleId = await makeVehicle("c2");
  await reserveVehicleImageUploads(vehicleId, jpegTypes(10));
  check((await activeReservations(vehicleId)) === 10, "partimos de 10 plazas ocupadas");

  const results = await Promise.allSettled([
    reserveVehicleImageUploads(vehicleId, jpegTypes(6)),
    reserveVehicleImageUploads(vehicleId, jpegTypes(6)),
  ]);

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const active = await activeReservations(vehicleId);

  check(ok < 2, `las dos no pueden terminar bien (terminaron ${ok})`);
  check(active <= MAX_IMAGES_PER_VEHICLE, `la invariante aguanta (hay ${active})`);
  check(active === 16, `queda 10 + 6 = 16 (hay ${active})`);
}

async function case3(): Promise<void> {
  console.log("\nCASO 3 — el candado es por vehículo, no global");
  const [one, two] = await Promise.all([makeVehicle("c3a"), makeVehicle("c3b")]);

  // Con el candado de `one` tomado, reservar en `two` no debe esperar.
  let elapsedOther = 0;
  await Promise.all([
    holdLock(one, 3000),
    (async () => {
      const started = Date.now();
      await reserveVehicleImageUploads(two, jpegTypes(1));
      elapsedOther = Date.now() - started;
    })(),
  ]);
  check(
    elapsedOther < 1500,
    `otro vehículo no espera al candado ajeno (tardó ${elapsedOther} ms)`,
  );

  // Y sobre el MISMO vehículo sí debe esperar: si no, no habría candado.
  let elapsedSame = 0;
  await Promise.all([
    holdLock(one, 3000),
    (async () => {
      const started = Date.now();
      await reserveVehicleImageUploads(one, jpegTypes(1));
      elapsedSame = Date.now() - started;
    })(),
  ]);
  check(
    elapsedSame >= 2500,
    `el mismo vehículo sí espera su turno (tardó ${elapsedSame} ms)`,
  );

  check((await activeReservations(two)) === 1, "la reserva del otro vehículo se creó");
}

async function case4(): Promise<void> {
  console.log("\nCASO 4 — dos finalizaciones legítimas del mismo vehículo a la vez");

  // Tres rondas: una carrera que sale bien una vez puede salir mal a la
  // tercera, y una sola pasada no demuestra gran cosa.
  for (let round = 1; round <= 3; round += 1) {
    const vehicleId = await makeVehicle(`c4r${round}`);
    const [first, second] = await Promise.all([
      reserveVehicleImageUploads(vehicleId, jpegTypes(3)),
      reserveVehicleImageUploads(vehicleId, jpegTypes(3)),
    ]);

    const asImages = (batch: typeof first) =>
      batch.uploads.map((upload) => ({
        storagePath: upload.storagePath,
        url: `https://ejemplo.invalido/${upload.storagePath}`,
      }));

    const results = await Promise.allSettled([
      commitVehicleImages(
        vehicleId,
        first.uploads.map((u) => u.reservationId),
        asImages(first),
        "Temporal c4",
      ),
      commitVehicleImages(
        vehicleId,
        second.uploads.map((u) => u.reservationId),
        asImages(second),
        "Temporal c4",
      ),
    ]);

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const images = await prisma.vehicleImage.findMany({
      where: { vehicleId },
      orderBy: { position: "asc" },
      select: { position: true },
    });
    const positions = images.map((row) => row.position);
    const pending = await prisma.vehicleImageUpload.count({ where: { vehicleId } });

    check(ok === 2, `ronda ${round}: las dos tandas terminan (terminaron ${ok})`);
    check(
      positions.join(",") === "0,1,2,3,4,5",
      `ronda ${round}: posiciones únicas y consecutivas (${positions.join(",")})`,
    );
    check(pending === 0, `ronda ${round}: las seis reservas se consumieron`);

    const byPositionClash = results.some(
      (r) =>
        r.status === "rejected" &&
        String((r as PromiseRejectedResult).reason?.message).includes("position"),
    );
    check(!byPositionClash, `ronda ${round}: ninguna falla por choque de posición`);
  }
}

async function case5(): Promise<void> {
  console.log("\nCASO 5 — si Storage no responde, la reserva NO se pierde");
  // Este script no tiene sesión de navegador, así que el borrado en Storage
  // falla de verdad. Es exactamente el escenario que hay que comprobar.
  const vehicleId = await makeVehicle("c5");
  const batch = await reserveVehicleImageUploads(vehicleId, jpegTypes(2));
  const ids = batch.uploads.map((u) => u.reservationId);

  const { cancelled } = await cancelVehicleImageUploads(vehicleId, ids);
  check(cancelled === 2, "la cancelación reconoce las dos reservas");

  const kept = await prisma.vehicleImageUpload.findMany({
    where: { id: { in: ids } },
    select: { id: true, expiresAt: true, storagePath: true },
  });
  check(kept.length === 2, "las filas se conservan: son la única pista del objeto");
  check(
    kept.every((row) => row.expiresAt.getTime() < Date.now()),
    "quedan marcadas caducadas, no válidas",
  );
  check((await activeReservations(vehicleId)) === 0, "no siguen ocupando cupo");

  // Conservarlas no puede devolverles el derecho a finalizar.
  let message = "";
  try {
    await registerVehicleImages(vehicleId, ids);
  } catch (error) {
    message = (error as Error).message;
  }
  check(message.includes("caducó"), `finalizar con ellas se rechaza (${message})`);
  check(
    (await prisma.vehicleImage.count({ where: { vehicleId } })) === 0,
    "y no registró ninguna imagen",
  );
}

async function case6(): Promise<void> {
  console.log("\nCASO 6 — un objeto ya enlazado no se borra al limpiar");
  const vehicleId = await makeVehicle("c6");
  const batch = await reserveVehicleImageUploads(vehicleId, jpegTypes(1));
  const [upload] = batch.uploads;

  // La foto llegó a registrarse: su objeto es de la ficha, no basura.
  await prisma.vehicleImage.create({
    data: {
      vehicleId,
      url: `https://ejemplo.invalido/${upload.storagePath}`,
      storagePath: upload.storagePath,
      source: "STORAGE",
      alt: "Temporal",
      position: 0,
    },
  });

  await cancelVehicleImageUploads(vehicleId, [upload.reservationId]);

  check(
    (await prisma.vehicleImageUpload.count({ where: { vehicleId } })) === 0,
    "la reserva se retira sin dejar residuo",
  );
  check(
    (await prisma.vehicleImage.count({ where: { vehicleId } })) === 1,
    "la imagen registrada sigue intacta",
  );
}

async function case7(): Promise<void> {
  console.log("\nCASO 7 — reserva consumida por otra petición mientras se inspeccionaba");
  const vehicleId = await makeVehicle("c7");
  const batch = await reserveVehicleImageUploads(vehicleId, jpegTypes(1));
  const [upload] = batch.uploads;
  const images = [
    { storagePath: upload.storagePath, url: `https://ejemplo.invalido/${upload.storagePath}` },
  ];

  await commitVehicleImages(vehicleId, [upload.reservationId], images, "Temporal c7");

  // La segunda llega tarde: su reserva ya no existe.
  let marked = false;
  try {
    await commitVehicleImages(vehicleId, [upload.reservationId], images, "Temporal c7");
  } catch (error) {
    marked = error instanceof AlreadyConsumed;
  }
  check(marked, "la segunda se reconoce como ya consumida");
  check(
    (await prisma.vehicleImage.count({ where: { vehicleId } })) === 1,
    "la imagen que registró la primera sigue ahí",
  );
}

/**
 * Un vehículo listo para publicar: todo lo que `publicationBlockers` exige,
 * con una sola fotografía. Es el escenario del fallo — la última foto es lo
 * que la otra pestaña puede quitarle debajo.
 */
async function makePublishableVehicle(label: string) {
  const vehicleId = await makeVehicle(label);
  const category = await prisma.category.findFirstOrThrow({
    where: { vehicleType: "AUTO", active: true },
    select: { id: true },
  });
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      make: "Temporal",
      model: label,
      year: 2024,
      price: BigInt(100_000_000),
      mileage: 1000,
      categoryId: category.id,
      fuelType: "Gasolina",
      transmission: "Automática",
      drivetrain: "Trasera (RWD)",
      city: "Bogotá, CO",
      description: "Unidad temporal de prueba.",
    },
  });
  const storagePath = `vehicles/${vehicleId}/unica.jpg`;
  const image = await prisma.vehicleImage.create({
    data: {
      vehicleId,
      url: `https://ejemplo.invalido/${storagePath}`,
      storagePath,
      source: "STORAGE",
      alt: "Temporal",
      position: 0,
    },
    select: { id: true },
  });
  return { vehicleId, imageId: image.id };
}

const publicationOf = async (vehicleId: string) =>
  (
    await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      select: { publicationStatus: true },
    })
  ).publicationStatus;

async function case8(): Promise<void> {
  console.log("\nCASO 8 — borrar la última foto gana la carrera a publicar");
  const { vehicleId, imageId } = await makePublishableVehicle("c8");

  // El candado lo toma el test. `setPublication` se lanza con él ocupado, así
  // que si leyera el estado ANTES de pedirlo lo leería ahora: con su foto y
  // sin nada que le falte.
  let publishing: Promise<unknown> | null = null;
  let failure = "";
  await withVehicleLock(vehicleId, async (tx) => {
    publishing = setPublication(vehicleId, "published").catch((error: Error) => {
      failure = error.message;
    });
    await sleep(600);
    await tx.vehicleImage.delete({ where: { id: imageId } });
  });
  await publishing;

  check(
    failure.includes("No se puede publicar"),
    `la publicación se rechaza (${failure || "no falló"})`,
  );
  check(failure.includes("fotografía"), "y dice que falta la fotografía");
  check((await publicationOf(vehicleId)) === "DRAFT", "el Vehicle sigue en DRAFT");
  check(
    (await prisma.vehicleImage.count({ where: { vehicleId } })) === 0,
    "y se quedó sin fotos, como pedía la otra operación",
  );
}

async function case9(): Promise<void> {
  console.log("\nCASO 9 — publicar gana, y entonces no se puede borrar la última foto");
  const { vehicleId, imageId } = await makePublishableVehicle("c9");

  await setPublication(vehicleId, "published");
  check((await publicationOf(vehicleId)) === "PUBLISHED", "publica correctamente");

  let failure = "";
  try {
    await deleteVehicleImage(vehicleId, imageId);
  } catch (error) {
    failure = (error as Error).message;
  }

  check(failure !== "", `borrar la única foto se rechaza (${failure || "no falló"})`);
  check(
    (await prisma.vehicleImage.count({ where: { vehicleId } })) === 1,
    "la fotografía sigue ahí: la transacción revirtió",
  );
  check(
    (await publicationOf(vehicleId)) === "PUBLISHED",
    "y la ficha sigue publicada y válida",
  );
}

async function case10(): Promise<void> {
  console.log("\nCASO 10 — nunca queda PUBLISHED sin fotografías");
  const { vehicleId, imageId } = await makePublishableVehicle("c10");

  for (let round = 1; round <= 4; round += 1) {
    const results = await Promise.allSettled([
      setPublication(vehicleId, "published"),
      deleteVehicleImage(vehicleId, imageId),
    ]);

    const status = await publicationOf(vehicleId);
    const photos = await prisma.vehicleImage.count({ where: { vehicleId } });
    check(
      !(status === "PUBLISHED" && photos === 0),
      `ronda ${round}: ${status} con ${photos} fotos — el estado prohibido no ocurre`,
    );
    void results;
    if (photos === 0) break;
    // Devolver el vehículo a borrador para volver a correr la carrera.
    await setPublication(vehicleId, "draft");
  }
}

async function case11(): Promise<void> {
  console.log("\nCASO 11 — publishedAt marca la PRIMERA publicación");
  const { vehicleId } = await makePublishableVehicle("c11");

  await setPublication(vehicleId, "published");
  const first = (
    await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      select: { publishedAt: true },
    })
  ).publishedAt;
  check(first !== null, "se anota al publicar");

  await sleep(50);
  await setPublication(vehicleId, "draft");
  await setPublication(vehicleId, "published");
  const again = (
    await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      select: { publishedAt: true },
    })
  ).publishedAt;

  check(
    again?.getTime() === first?.getTime(),
    "y no se reescribe al volver a publicar",
  );
}

async function main(): Promise<void> {
  try {
    await case1();
    await case2();
    await case3();
    await case4();
    await case5();
    await case6();
    await case7();
    await case8();
    await case9();
    await case10();
    await case11();
  } finally {
    const removed = await prisma.vehicle.deleteMany({
      where: { slug: { startsWith: "tmp-conc-" } },
    });
    console.log(`\nLimpieza: ${removed.count} vehículos temporales borrados.`);
    await prisma.$disconnect();
  }

  console.log(`\n${passed} comprobaciones bien, ${failures.length} mal.`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

void main();
