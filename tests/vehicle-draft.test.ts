import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicationBlockers } from "@/lib/publication";
import {
  draftHasContent,
  draftPublicationCandidate,
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
    ["gearCount", 6],
    ["drivetrain", "Trasera (RWD)"],
    ["finalDrive", "Cadena"],
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
    ["plateEnding", "7"],
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

/**
 * CASO 23 · el panel "Falta para publicar" no puede ir un guardado por
 * detrás.
 *
 * El fallo: se calculaba sobre la copia que el servidor devolvió la última
 * vez, así que mientras alguien rellenaba la ficha el panel seguía
 * enumerando como ausente todo lo que acababa de escribir, y solo se
 * despejaba al guardar. No era un cálculo stale por accidente: se estaba
 * preguntando por el objeto equivocado.
 */
describe("los requisitos se leen sobre lo que hay en pantalla", () => {
  const completo = (over: Partial<Draft> = {}): Draft => ({
    ...emptyDraft(),
    make: "BMW",
    model: "X5",
    categoryId: "cat-suv",
    year: 2021,
    price: 195_000_000,
    mileage: 42_000,
    fuelType: "Híbrido enchufable",
    transmission: "Automática",
    drivetrain: "Integral (AWD)",
    city: "Bogotá, CO",
    description: "Una unidad cuidada.",
    ...over,
  });

  const photo = [{ id: "i1" }];

  it("un borrador recién rellenado ya no reporta nada pendiente", () => {
    const candidate = draftPublicationCandidate(completo(), photo);
    assert.deepEqual(publicationBlockers(candidate), []);
  });

  it("lo que todavía falta se nombra, y solo eso", () => {
    const candidate = draftPublicationCandidate(
      completo({ price: null, city: "" }),
      photo,
    );
    const blockers = publicationBlockers(candidate);
    assert.deepEqual(blockers.sort(), ["Falta el precio.", "Falta la ciudad."]);
  });

  it("las fotografías salen del servidor, que es quien las tiene", () => {
    // El borrador no sabe de imágenes: se suben una a una contra la API.
    const sinFotos = draftPublicationCandidate(completo(), []);
    assert.deepEqual(publicationBlockers(sinFotos), [
      "Falta al menos una fotografía.",
    ]);
  });

  it("una moto se mide con la vara de una moto", () => {
    const moto = draftPublicationCandidate(
      completo({
        vehicleType: "moto",
        transmission: "Manual secuencial",
        drivetrain: "",
        finalDrive: "Cadena",
      }),
      photo,
    );
    assert.deepEqual(publicationBlockers(moto), []);
  });

  it("y sin transmisión final sí se la bloquea", () => {
    const moto = draftPublicationCandidate(
      completo({
        vehicleType: "moto",
        transmission: "Manual secuencial",
        drivetrain: "",
        finalDrive: "",
      }),
      photo,
    );
    assert.deepEqual(publicationBlockers(moto), ["Falta la transmisión final."]);
  });
});
