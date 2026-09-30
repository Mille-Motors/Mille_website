import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inquiryInputSchema } from "@/server/inquiries/schemas";
import {
  vehicleInputSchema,
  vehiclePatchSchema,
} from "@/server/vehicles/schemas";

/**
 * La validación del servidor es lo único que separa la base de datos de lo
 * que cualquiera quiera escribir en ella. Lo que valide el formulario es
 * comodidad para quien escribe; esto es la garantía.
 */

describe("solicitudes públicas", () => {
  const valid = {
    type: "general" as const,
    name: "Ana Ruiz",
    phone: "+57 310 555 4433",
    email: "ana@correo.com",
  };

  it("acepta una solicitud bien formada", () => {
    const parsed = inquiryInputSchema.parse(valid);
    assert.equal(parsed.name, "Ana Ruiz");
    assert.equal(parsed.email, "ana@correo.com");
  });

  it("recorta los espacios de alrededor", () => {
    const parsed = inquiryInputSchema.parse({ ...valid, name: "  Ana Ruiz  " });
    assert.equal(parsed.name, "Ana Ruiz");
  });

  it("rechaza un correo inválido", () => {
    assert.throws(() => inquiryInputSchema.parse({ ...valid, email: "no-es-correo" }));
  });

  it("rechaza un nombre vacío", () => {
    assert.throws(() => inquiryInputSchema.parse({ ...valid, name: "" }));
  });

  it("rechaza un tipo que no existe", () => {
    assert.throws(() => inquiryInputSchema.parse({ ...valid, type: "otro" }));
  });

  it("acepta teléfonos como los escribe la gente", () => {
    for (const phone of ["3105554433", "310 555 4433", "+57 (310) 555-4433"]) {
      assert.equal(inquiryInputSchema.parse({ ...valid, phone }).phone, phone);
    }
  });

  it("rechaza teléfonos con muy pocos o demasiados dígitos", () => {
    for (const phone of ["12", "1234567890123456789"]) {
      assert.throws(() => inquiryInputSchema.parse({ ...valid, phone }));
    }
  });

  it("conserva el campo trampa para que el servicio pueda descartarlo", () => {
    const parsed = inquiryInputSchema.parse({ ...valid, website: "http://spam.ru" });
    assert.equal(parsed.website, "http://spam.ru");
  });
});

describe("vehículos", () => {
  const valid = {
    vehicleType: "auto" as const,
    make: "BMW",
    model: "X5",
    year: 2023,
    price: 350_000_000,
    mileage: 20_000,
    categoryId: "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f",
    fuelType: "Gasolina" as const,
    transmission: "Automática" as const,
    drivetrain: "Integral (AWD)" as const,
    city: "Bogotá, CO",
    description: "Un vehículo.",
  };

  it("acepta un vehículo bien formado", () => {
    const parsed = vehicleInputSchema.parse(valid);
    assert.equal(parsed.make, "BMW");
    assert.equal(parsed.availability, "available");
    assert.equal(parsed.featured, false);
  });

  it("rechaza un precio negativo", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, price: -1 }));
  });

  it("rechaza un kilometraje negativo", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, mileage: -1 }));
  });

  it("rechaza años fuera de rango", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, year: 1800 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, year: 3000 }));
  });

  it("rechaza una categoría que no es un uuid", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, categoryId: "suv" }));
  });

  it("rechaza enums inventados", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, fuelType: "Plutonio" }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, transmission: "Mágica" }));
  });

  it("descarta las líneas vacías del equipamiento y conserva el orden", () => {
    const parsed = vehicleInputSchema.parse({
      ...valid,
      equipment: ["Techo", "   ", "Cámara", ""],
    });
    assert.deepEqual(parsed.equipment, ["Techo", "Cámara"]);
  });

  it("solo admite slugs seguros para una URL", () => {
    assert.equal(vehicleInputSchema.parse({ ...valid, slug: "bmw-x5-2023" }).slug, "bmw-x5-2023");
    for (const slug of ["BMW X5", "bmw/x5", "bmw_x5", "-bmw", "bmw--x5"]) {
      assert.throws(() => vehicleInputSchema.parse({ ...valid, slug }));
    }
  });

  it("rechaza la tracción antigua, que mezclaba AWD con 4WD", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, drivetrain: "4x4 (AWD)" }));
  });
});

/**
 * Lo que separa una ficha muy completa de una que aparenta serlo: un campo
 * sin rellenar tiene que llegar a la base como NULL y no como "" ni como 0.
 * Si se guardara la cadena vacía, la página no podría distinguir "no lo
 * sabemos" de "lo sabemos y es nada", y acabaría dibujando filas en blanco.
 */
describe("campos técnicos opcionales", () => {
  const valid = {
    vehicleType: "auto" as const,
    make: "BMW",
    model: "X5",
    year: 2023,
    price: 350_000_000,
    mileage: 20_000,
    categoryId: "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f",
    fuelType: "Gasolina" as const,
    transmission: "Automática" as const,
    drivetrain: "Integral (AWD)" as const,
    city: "Bogotá, CO",
    description: "Un vehículo.",
  };

  it("lo que no se rellena queda en null, nunca en cero ni en cadena vacía", () => {
    const parsed = vehicleInputSchema.parse(valid);
    assert.equal(parsed.powerHp, null);
    assert.equal(parsed.torqueNm, null);
    assert.equal(parsed.accel0100, null);
    assert.equal(parsed.curbWeightKg, null);
    assert.equal(parsed.batteryGrossKwh, null);
    assert.equal(parsed.engineLayout, null);
    assert.equal(parsed.soatExpiresOn, null);
    assert.equal(parsed.soatValid, null);
  });

  it("una cadena vacía también es ausencia de dato", () => {
    const parsed = vehicleInputSchema.parse({
      ...valid,
      engineLayout: "",
      hybridSystem: "   ",
      powerHp: "",
      soatExpiresOn: "",
    });
    assert.equal(parsed.engineLayout, null);
    assert.equal(parsed.hybridSystem, null);
    assert.equal(parsed.powerHp, null);
    assert.equal(parsed.soatExpiresOn, null);
  });

  it("acepta los números que sí se rellenan, incluidos los decimales", () => {
    const parsed = vehicleInputSchema.parse({
      ...valid,
      powerHp: 510,
      torqueNm: 650,
      accel0100: 3.9,
      curbWeightKg: 1725,
      batteryGrossKwh: 83.9,
    });
    assert.equal(parsed.powerHp, 510);
    assert.equal(parsed.accel0100, 3.9);
    assert.equal(parsed.batteryGrossKwh, 83.9);
  });

  it("rechaza magnitudes negativas o absurdas", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, powerHp: -1 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, torqueNm: -5 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, curbWeightKg: 0 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, accel0100: 0 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, electricRangeKm: -10 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, batteryGrossKwh: -1 }));
  });

  it("el último dígito de la placa solo puede ser 0–9", () => {
    assert.equal(vehicleInputSchema.parse({ ...valid, plateLastDigit: 0 }).plateLastDigit, 0);
    assert.equal(vehicleInputSchema.parse({ ...valid, plateLastDigit: 9 }).plateLastDigit, 9);
    assert.throws(() => vehicleInputSchema.parse({ ...valid, plateLastDigit: 10 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, plateLastDigit: -1 }));
  });

  it("solo acepta fechas de calendario que existan de verdad", () => {
    assert.equal(
      vehicleInputSchema.parse({ ...valid, soatExpiresOn: "2027-03-18" }).soatExpiresOn,
      "2027-03-18",
    );
    // El 31 de febrero no se convierte en el 3 de marzo: se rechaza.
    assert.throws(() => vehicleInputSchema.parse({ ...valid, soatExpiresOn: "2027-02-31" }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, soatExpiresOn: "18/03/2027" }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, soatExpiresOn: "2027-13-01" }));
  });

  it("no deja que la capacidad útil supere a la bruta", () => {
    assert.throws(() =>
      vehicleInputSchema.parse({ ...valid, batteryGrossKwh: 20, batteryNetKwh: 24 }),
    );
    assert.ok(
      vehicleInputSchema.parse({ ...valid, batteryGrossKwh: 24, batteryNetKwh: 21.6 }),
    );
  });

  it("no deja que el limitador supere la punta declarada", () => {
    assert.throws(() =>
      vehicleInputSchema.parse({ ...valid, topSpeedKph: 250, topSpeedLimitedKph: 290 }),
    );
  });

  it("activar «¿Sabías que?» sin escribirlo es un error, no un bloque vacío", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, funFactEnabled: true }));
    assert.ok(
      vehicleInputSchema.parse({
        ...valid,
        funFactEnabled: true,
        funFactBody: "La dirección al eje trasero gira en sentido contrario.",
      }),
    );
  });

  it("solo admite etiquetas del vocabulario, y sin repetir", () => {
    const parsed = vehicleInputSchema.parse({
      ...valid,
      tags: ["Deportivo", "Performance", "Deportivo"],
    });
    assert.deepEqual(parsed.tags, ["Deportivo", "Performance"]);
    assert.throws(() => vehicleInputSchema.parse({ ...valid, tags: ["Rapidísimo"] }));
  });

  it("descarta claves de equipamiento que no están en el catálogo", () => {
    const parsed = vehicleInputSchema.parse({
      ...valid,
      features: ["head-up-display", "no-existe", "camera-360", "head-up-display"],
    });
    assert.deepEqual(parsed.features, ["head-up-display", "camera-360"]);
  });

  it("un extra destacado necesita nombre; la descripción es opcional", () => {
    const parsed = vehicleInputSchema.parse({
      ...valid,
      specialEquipment: [{ name: "Bowers & Wilkins Diamond" }],
    });
    assert.deepEqual(parsed.specialEquipment, [
      { name: "Bowers & Wilkins Diamond", description: null },
    ]);
    assert.throws(() =>
      vehicleInputSchema.parse({ ...valid, specialEquipment: [{ name: "  " }] }),
    );
  });
});

/**
 * Crear y editar tienen que aceptar exactamente los mismos campos. Un campo
 * que solo el alta admitiera se escribiría una vez y se perdería en la
 * primera edición, sin que nada avisara.
 */
describe("simetría entre crear y editar", () => {
  it("el parche admite todos los campos del alta", () => {
    const full = {
      powerHp: 510,
      torqueNm: 650,
      accel0100: 3.9,
      topSpeedKph: 250,
      topSpeedLimited: true,
      topSpeedLimitedKph: 250,
      curbWeightKg: 1725,
      engineLayout: "I6" as const,
      cylinders: 6,
      displacementCc: 2993,
      aspiration: "Biturbo" as const,
      icePowerHp: 286,
      iceTorqueNm: 450,
      electricMotorCount: 1,
      electricPowerHp: 113,
      electricTorqueNm: 265,
      electricMotorLayout: "Integrado en la transmisión" as const,
      hybridSystem: "Plug-in Hybrid",
      batteryGrossKwh: 24,
      batteryNetKwh: 21.6,
      electricRangeKm: 85,
      rangeStandard: "WLTP" as const,
      chargeAcKw: 3.7,
      chargeDcKw: 50,
      chargeConnector: "CCS Combo 2" as const,
      chargeTimeNote: "3,5 h en AC",
      registrationCity: "Bogotá",
      plateLastDigit: 7,
      soatValid: true,
      soatExpiresOn: "2027-03-18",
      techInspectionApplies: true,
      techInspectionExpiresOn: "2026-11-02",
      taxStatus: "Al día" as const,
      taxesPaidThroughYear: 2026,
      documentationCheckedOn: "2026-01-10",
      documentationNotes: "Traspaso listo.",
      funFactEnabled: true,
      funFactTitle: "Dirección trasera",
      funFactBody: "Gira las ruedas traseras en sentido contrario.",
      features: ["head-up-display"],
      equipment: ["Extra"],
      specialEquipment: [{ name: "M Driver's Package" }],
      tags: ["Deportivo" as const],
    };

    const patched = vehiclePatchSchema.parse(full);
    for (const key of Object.keys(full)) {
      assert.ok(
        key in patched,
        `El parche perdió "${key}": editar no guardaría lo que crear sí guarda.`,
      );
    }
    assert.equal(patched.batteryNetKwh, 21.6);
    assert.equal(patched.soatExpiresOn, "2027-03-18");
  });

  it("un parche vacío no inventa nada", () => {
    assert.deepEqual(vehiclePatchSchema.parse({}), {});
  });
});
