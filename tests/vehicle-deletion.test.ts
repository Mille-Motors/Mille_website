import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planVehicleDeletion } from "@/lib/vehicle-deletion";

/**
 * Borrar un vehículo tiene que llevarse sus archivos del bucket. Durante el
 * QA de producción quedó un objeto huérfano de 1,3 MB porque el borrado en
 * cascada se llevaba las filas de VehicleImage y con ellas la única pista de
 * qué archivo había que borrar. Estas pruebas fijan la decisión.
 */
const storage = (path: string) => ({ source: "STORAGE" as const, storagePath: path });
const legacy = (path: string | null = null) => ({ source: "LEGACY" as const, storagePath: path });

describe("borrado definitivo", () => {
  it("programa el borrado de las imágenes subidas a Storage", () => {
    const plan = planVehicleDeletion(0, [storage("vehicles/a/1.jpg")]);
    assert.equal(plan.archived, false);
    assert.deepEqual(plan.storagePaths, ["vehicles/a/1.jpg"]);
  });

  it("recoge todas cuando hay varias, en orden", () => {
    const plan = planVehicleDeletion(0, [
      storage("vehicles/a/1.jpg"),
      storage("vehicles/a/2.webp"),
      storage("vehicles/a/3.png"),
    ]);
    assert.deepEqual(plan.storagePaths, [
      "vehicles/a/1.jpg",
      "vehicles/a/2.webp",
      "vehicles/a/3.png",
    ]);
  });

  it("nunca intenta borrar una imagen heredada de /public", () => {
    const plan = planVehicleDeletion(0, [legacy(), legacy()]);
    assert.deepEqual(plan.storagePaths, []);
  });

  it("de una mezcla, solo se lleva las de Storage", () => {
    const plan = planVehicleDeletion(0, [
      legacy(),
      storage("vehicles/a/2.jpg"),
      legacy(),
      storage("vehicles/a/4.jpg"),
    ]);
    assert.deepEqual(plan.storagePaths, ["vehicles/a/2.jpg", "vehicles/a/4.jpg"]);
  });

  it("un vehículo sin imágenes no programa nada", () => {
    const plan = planVehicleDeletion(0, []);
    assert.equal(plan.archived, false);
    assert.deepEqual(plan.storagePaths, []);
  });

  it("ignora una fila marcada STORAGE sin ruta, en vez de romper", () => {
    const plan = planVehicleDeletion(0, [
      { source: "STORAGE", storagePath: null },
      storage("vehicles/a/2.jpg"),
    ]);
    assert.deepEqual(plan.storagePaths, ["vehicles/a/2.jpg"]);
  });
});

describe("archivado por tener solicitudes", () => {
  it("archiva en vez de borrar", () => {
    const plan = planVehicleDeletion(1, [storage("vehicles/a/1.jpg")]);
    assert.equal(plan.archived, true);
  });

  it("no borra ninguna imagen: siguen siendo del vehículo archivado", () => {
    const plan = planVehicleDeletion(3, [
      storage("vehicles/a/1.jpg"),
      storage("vehicles/a/2.jpg"),
      legacy(),
    ]);
    assert.equal(plan.archived, true);
    assert.deepEqual(plan.storagePaths, []);
  });

  it("una sola solicitud ya basta para archivar", () => {
    assert.equal(planVehicleDeletion(1, []).archived, true);
    assert.equal(planVehicleDeletion(0, []).archived, false);
  });
});
