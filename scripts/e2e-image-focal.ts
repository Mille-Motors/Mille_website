import "../prisma/env";

import { prisma } from "@/server/db/prisma";
import { createDraftVehicle, deleteVehicle } from "@/server/vehicles/service";
import { setVehicleImageFocal } from "@/server/vehicles/images";
import { CENTER_FOCAL } from "@/lib/focal-point";
import { VEHICLE_DEFAULT_FOCAL } from "@/lib/vehicle-frame";

/**
 * Encuadrar una fotografía no puede tocar nada más que el encuadre.
 *
 *     npx tsx --conditions=react-server scripts/e2e-image-focal.ts
 *
 * Lo que se comprueba aquí es lo que no se puede comprobar con funciones
 * puras: que la escritura en la base deja intactos el archivo, su ruta, su
 * URL, su posición en la galería, su texto alternativo y las demás
 * fotografías del vehículo. Ajustar el encuadre es la operación que más
 * fácil sería implementar "reescribiendo la fila entera", y eso es
 * exactamente lo que no debe pasar.
 *
 * Crea sus propios vehículos y los borra al terminar. No sube nada a
 * Storage: las filas se escriben directas, porque lo que se prueba es la
 * capa de datos, no la subida —que tiene sus propios scripts—.
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

async function makeVehicleWithImages(count: number) {
  const vehicle = await createDraftVehicle();
  created.push(vehicle.id);
  for (let i = 0; i < count; i += 1) {
    const storagePath = `vehicles/${vehicle.id}/foto-${i}.jpg`;
    await prisma.vehicleImage.create({
      data: {
        vehicleId: vehicle.id,
        url: `https://ejemplo.invalido/${storagePath}`,
        storagePath,
        source: "STORAGE",
        alt: `Fotografía ${i + 1}`,
        position: i,
      },
    });
  }
  return vehicle.id;
}

const imagesOf = (vehicleId: string) =>
  prisma.vehicleImage.findMany({
    where: { vehicleId },
    orderBy: { position: "asc" },
  });

async function failureOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}

// ---------------------------------------------------------------------------

async function caseDefaults(): Promise<void> {
  console.log("\nCASO 1 — una fotografía nueva nace sin encuadre");
  const vehicleId = await makeVehicleWithImages(2);
  const images = await imagesOf(vehicleId);

  check(
    images.every((row) => row.focalX === 50 && row.focalY === 50),
    "todas nacen centradas, que es el recorte automático de siempre",
  );
  check(
    CENTER_FOCAL.x === VEHICLE_DEFAULT_FOCAL.x &&
      CENTER_FOCAL.y === VEHICLE_DEFAULT_FOCAL.y,
    "y el centro es exactamente el valor por defecto del marco",
  );
}

async function caseOnlyFocalChanges(): Promise<void> {
  console.log("\nCASO 2 — guardar un encuadre no cambia nada más");
  const vehicleId = await makeVehicleWithImages(3);
  const before = await imagesOf(vehicleId);
  const target = before[1];

  await setVehicleImageFocal(vehicleId, target.id, { x: 12.5, y: 80 });
  const after = await imagesOf(vehicleId);
  const updated = after.find((row) => row.id === target.id)!;

  check(updated.focalX === 12.5 && updated.focalY === 80, "el encuadre se guardó");
  check(updated.position === target.position, "la posición no cambió");
  check(updated.storagePath === target.storagePath, "el storagePath no cambió");
  check(updated.url === target.url, "la URL no cambió");
  check(updated.alt === target.alt, "el texto alternativo no cambió");
  check(updated.source === target.source, "el origen no cambió");
  check(after.length === before.length, "no se duplicó ni se borró ninguna");
  check(
    after[0].position === 0 && after[1].position === 1 && after[2].position === 2,
    "el orden de la galería sigue siendo 0,1,2",
  );
  check(
    after[0].id === before[0].id && after[0].focalX === 50,
    "la que era portada sigue siéndolo y sigue sin encuadre",
  );
}

async function caseIndependence(): Promise<void> {
  console.log("\nCASO 3 — cada fotografía tiene su propio encuadre");
  const vehicleId = await makeVehicleWithImages(3);
  const [one, two, three] = await imagesOf(vehicleId);

  await setVehicleImageFocal(vehicleId, one.id, { x: 0, y: 50 });
  await setVehicleImageFocal(vehicleId, three.id, { x: 100, y: 50 });

  const after = await imagesOf(vehicleId);
  check(after[0].focalX === 0, "la primera, desplazada a la izquierda");
  check(after[1].focalX === 50, "la segunda sigue centrada: nadie la tocó");
  check(after[2].focalX === 100, "la tercera, desplazada a la derecha");
  check(after[1].id === two.id, "y ninguna cambió de sitio");
}

async function caseReset(): Promise<void> {
  console.log("\nCASO 4 — restablecer vuelve a la ausencia de encuadre");
  const vehicleId = await makeVehicleWithImages(1);
  const [image] = await imagesOf(vehicleId);

  await setVehicleImageFocal(vehicleId, image.id, { x: 90, y: 10 });
  await setVehicleImageFocal(vehicleId, image.id, VEHICLE_DEFAULT_FOCAL);

  const [after] = await imagesOf(vehicleId);
  check(after.focalX === 50 && after.focalY === 50, "vuelve al centro");
  check(after.storagePath === image.storagePath, "sin borrar la fotografía");
}

async function caseForeignImage(): Promise<void> {
  console.log("\nCASO 5 — una imagen de otro vehículo no se puede encuadrar");
  const mine = await makeVehicleWithImages(1);
  const other = await makeVehicleWithImages(1);
  const [theirs] = await imagesOf(other);

  const message = await failureOf(() =>
    setVehicleImageFocal(mine, theirs.id, { x: 0, y: 0 }),
  );
  check(message.includes("no existe"), `se rechaza (${message || "no falló"})`);

  const [untouched] = await imagesOf(other);
  check(
    untouched.focalX === 50 && untouched.focalY === 50,
    "y la del otro vehículo queda intacta",
  );
}

async function caseOutOfRange(): Promise<void> {
  console.log("\nCASO 6 — la base no admite un encuadre imposible");
  const vehicleId = await makeVehicleWithImages(1);
  const [image] = await imagesOf(vehicleId);

  // El servicio normaliza antes de escribir, así que un valor absurdo se
  // recorta en vez de llegar a la columna.
  await setVehicleImageFocal(vehicleId, image.id, { x: -40, y: 160 });
  const [clamped] = await imagesOf(vehicleId);
  check(clamped.focalX === 0 && clamped.focalY === 100, "el servicio lo recorta a 0–100");

  // Y si alguien escribiera saltándose el servicio, el CHECK de Postgres lo
  // para. Es la segunda mitad de la garantía, no un adorno.
  const direct = await failureOf(() =>
    prisma.vehicleImage.update({
      where: { id: image.id },
      data: { focalX: 140 },
    }),
  );
  check(direct !== "", "y la restricción de la base rechaza un 140 escrito a mano");

  const [stillValid] = await imagesOf(vehicleId);
  check(stillValid.focalX === 0, "la fila no quedó a medias");
}

async function main(): Promise<void> {
  try {
    await caseDefaults();
    await caseOnlyFocalChanges();
    await caseIndependence();
    await caseReset();
    await caseForeignImage();
    await caseOutOfRange();
  } finally {
    // Por la vía normal, que comprueba reservas pendientes antes de borrar.
    let removed = 0;
    for (const id of created) {
      try {
        await deleteVehicle(id);
        removed += 1;
      } catch {
        await prisma.vehicle.deleteMany({ where: { id } });
        removed += 1;
      }
    }
    console.log(`\nLimpieza: ${removed} vehículos temporales borrados.`);
    await prisma.$disconnect();
  }

  console.log(`\n${passed} comprobaciones bien, ${failures.length} mal.`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

void main();
