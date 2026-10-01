import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  draftHasContent,
  emptyDraft,
  type Draft,
} from "@/lib/vehicle-draft";

/**
 * `draftHasContent()` decide si "Guardar borrador" crea una fila o se queda
 * quieto. Equivocarse por abajo deja vehículos vacíos en la lista a golpe de
 * visita; equivocarse por arriba descarta trabajo de alguien sin avisar.
 *
 * El fallo que motivó estas pruebas es del segundo tipo: la comprobación
 * enumeraba los campos que contaban y se dejó fuera la transmisión y la
 * tracción, así que elegir solo la caja de cambios y pulsar guardar
 * respondía "escribe algo antes de guardar".
 */

const blank = (over: Partial<Draft> = {}): Draft => ({ ...emptyDraft(), ...over });

describe("una pantalla que nadie ha tocado", () => {
  it("no tiene contenido", () => {
    assert.equal(draftHasContent(emptyDraft()), false);
  });

  it("los valores iniciales no cuentan como decisión de nadie", () => {
    // Son los que trae la pantalla al abrirse, no algo que alguien eligiera.
    assert.equal(draftHasContent(blank({ vehicleType: "auto" })), false);
    assert.equal(draftHasContent(blank({ availability: "available" })), false);
    assert.equal(draftHasContent(blank({ featured: false })), false);
    assert.equal(draftHasContent(blank({ topSpeedLimited: false })), false);
    assert.equal(draftHasContent(blank({ funFactEnabled: false })), false);
  });

  it("escribir solo espacios tampoco es contenido", () => {
    assert.equal(draftHasContent(blank({ make: "   ", city: "  " })), false);
    assert.equal(draftHasContent(emptyDraft(), "   \n  "), false);
  });
});

describe("cualquier dato elegido por el administrador cuenta", () => {
  /**
   * Los dos que faltaban. Un vehículo nuevo en el que lo ÚNICO que se tocó
   * fue el desplegable de transmisión o el de tracción tiene contenido: hubo
   * una decisión, y perderla al guardar sería tirar trabajo.
   */
  it("solo la transmisión ya es contenido", () => {
    assert.equal(draftHasContent(blank({ transmission: "Automática" })), true);
  });

  it("solo la tracción ya es contenido", () => {
    assert.equal(draftHasContent(blank({ drivetrain: "Trasera (RWD)" })), true);
  });

  /**
   * Y el resto, campo por campo. La lista se recorre sobre el borrador en
   * blanco, así que un campo nuevo que nadie contemple aquí hace fallar la
   * prueba en vez de colarse en silencio.
   */
  const cambios: [keyof Draft, Draft[keyof Draft]][] = [
    ["vehicleType", "moto"],
    ["make", "BMW"],
    ["model", "330e"],
    ["version", "M Sport"],
    ["year", 2021],
    ["price", 180_000_000],
    ["mileage", 0],
    ["categoryId", "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f"],
    ["fuelType", "Gasolina"],
    ["transmission", "Automática"],
    ["drivetrain", "Trasera (RWD)"],
    ["engine", "3.0 L I6"],
    ["exteriorColor", "Gris"],
    ["interiorColor", "Negro"],
    ["city", "Bogotá, CO"],
    ["availability", "reserved"],
    ["featured", true],
    ["description", "Una unidad cuidada."],
    ["engineLayout", "I6"],
    ["cylinders", 6],
    ["displacementCc", 2998],
    ["aspiration", "Turbo"],
    ["powerHp", 389],
    ["torqueNm", 600],
    ["accel0100", "5.6"],
    ["topSpeedKph", 235],
    ["topSpeedLimited", true],
    ["topSpeedLimitedKph", 230],
    ["curbWeightKg", 2510],
    ["icePowerHp", 286],
    ["iceTorqueNm", 450],
    ["electricMotorCount", 1],
    ["electricPowerHp", 113],
    ["electricTorqueNm", 265],
    ["electricMotorLayout", "Trasero"],
    ["hybridSystem", "Plug-in Hybrid"],
    ["batteryGrossKwh", "24"],
    ["batteryNetKwh", "21.6"],
    ["electricRangeKm", 85],
    ["rangeStandard", "WLTP"],
    ["chargeAcKw", "3.7"],
    ["chargeDcKw", "50"],
    ["chargeConnector", "CCS Combo 2"],
    ["chargeTimeNote", "3,5 h en AC"],
    ["registrationCity", "Bogotá"],
    ["plateLastDigit", "7"],
    ["soatValid", true],
    ["soatExpiresOn", "2027-03-18"],
    ["techInspectionApplies", false],
    ["techInspectionExpiresOn", "2026-11-02"],
    ["taxStatus", "Al día"],
    ["taxesPaidThroughYear", 2026],
    ["documentationCheckedOn", "2026-01-10"],
    ["documentationNotes", "Traspaso listo."],
    ["funFactEnabled", true],
    ["funFactTitle", "Dirección trasera"],
    ["funFactBody", "Gira las ruedas traseras."],
    ["features", ["head-up-display"]],
    ["specialEquipment", [{ name: "Bowers & Wilkins", description: null }]],
    ["tags", ["Deportivo"]],
  ];

  for (const [key, value] of cambios) {
    it(`cambiar «${key}» cuenta como contenido`, () => {
      assert.equal(
        draftHasContent(blank({ [key]: value } as Partial<Draft>)),
        true,
        `tocar ${String(key)} no contó: guardar lo descartaría`,
      );
    });
  }

  it("ningún campo del borrador se queda fuera de la comprobación", () => {
    // Si alguien añade un campo al borrador y no lo añade aquí, esta prueba
    // lo dice. Es la red que faltaba cuando la comprobación enumeraba.
    const cubiertos = new Set(cambios.map(([key]) => key));
    const todos = Object.keys(emptyDraft()) as (keyof Draft)[];
    const olvidados = todos.filter((key) => !cubiertos.has(key));
    assert.deepEqual(olvidados, [], `sin probar: ${olvidados.join(", ")}`);
  });

  it("el equipamiento adicional vive fuera del borrador y también cuenta", () => {
    assert.equal(draftHasContent(emptyDraft(), "Llantas de invierno"), true);
  });
});
