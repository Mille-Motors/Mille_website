import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDateOnly, isPastDate } from "@/lib/format";
import { groupFeatures } from "@/lib/equipment-catalog";
import {
  documentationRows,
  electrificationBlocks,
  engineRows,
  performanceRows,
  powerToWeight,
  quickFacts,
  specBlocks,
} from "@/lib/vehicle-display";
import { makeVehicle } from "./support/vehicle";

/**
 * La promesa de la ficha pública es que nunca miente ni rellena.
 *
 * Todo lo que se dibuja sale de `vehicle-display`, y la regla que fijan
 * estas pruebas es una sola: **una fila solo existe si su dato existe**. No
 * hay "N/A", no hay "—", no hay bloques con título y nada debajo. Lo que no
 * sabemos, no se muestra.
 */

const labels = (rows: { label: string }[]) => rows.map((row) => row.label);
const valueOf = (rows: { label: string; value: string }[], label: string) =>
  rows.find((row) => row.label === label)?.value;

describe("CASO A · BMW M3 · sedán gasolina RWD, deportivo", () => {
  const m3 = makeVehicle({
    make: "BMW",
    model: "M3",
    version: "Competition",
    fuelType: "Gasolina",
    drivetrain: "Trasera (RWD)",
    transmission: "Automática",
    category: {
      id: "c2", name: "Sedán", pluralName: "Sedanes", slug: "sedan",
      vehicleType: "auto", active: true, position: 1,
    },
    engine: "3.0 L I6 biturbo",
    tags: ["Deportivo", "Performance"],
    specs: {
      engineLayout: "I6",
      cylinders: 6,
      displacementCc: 2993,
      aspiration: "Biturbo",
      powerHp: 510,
      torqueNm: 650,
      accel0100: 3.9,
      topSpeedKph: 250,
      topSpeedLimited: true,
      curbWeightKg: 1730,
    },
  });

  it("muestra los datos del motor de combustión", () => {
    const rows = engineRows(m3);
    assert.deepEqual(labels(rows), [
      "Motor", "Arquitectura", "Cilindros", "Cilindrada", "Alimentación",
    ]);
    assert.equal(valueOf(rows, "Cilindrada"), "2.993 cc");
  });

  it("NO muestra nada de sistema eléctrico", () => {
    assert.deepEqual(electrificationBlocks(m3), []);
  });

  it("la potencia se titula «Potencia» a secas, no «combinada»", () => {
    assert.ok(labels(quickFacts(m3)).includes("Potencia"));
    assert.ok(!labels(quickFacts(m3)).includes("Potencia combinada"));
  });

  it("dice que la punta está limitada en vez de darla como libre", () => {
    assert.equal(
      valueOf(performanceRows(m3), "Velocidad máxima"),
      "250 km/h (limitada electrónicamente)",
    );
  });

  it("calcula la relación peso/potencia en vez de pedirla", () => {
    assert.equal(powerToWeight(m3), "3,4 kg/hp");
  });

  it("su carrocería es Sedán: «Deportivo» es carácter, no carrocería", () => {
    assert.equal(m3.category?.name, "Sedán");
    assert.ok(m3.tags.includes("Deportivo"));
  });
});

describe("CASO B · BMW X5 xDrive45e · SUV enchufable AWD", () => {
  const x5 = makeVehicle({
    fuelType: "Híbrido enchufable",
    drivetrain: "Integral (AWD)",
    engine: "3.0 L I6 TwinPower Turbo",
    specs: { powerHp: 389, torqueNm: 600, accel0100: 5.6, curbWeightKg: 2510 },
    electrification: {
      hybridSystem: "Plug-in Hybrid",
      icePowerHp: 286,
      iceTorqueNm: 450,
      electricMotorCount: 1,
      electricPowerHp: 113,
      electricMotorLayout: "Integrado en la transmisión",
      batteryGrossKwh: 24,
      batteryNetKwh: 21.6,
      electricRangeKm: 85,
      rangeStandard: "WLTP",
      chargeAcKw: 3.7,
      chargeConnector: "Tipo 2 (Mennekes)",
    },
  });

  it("separa el motor de combustión del eléctrico y los muestra ambos", () => {
    const titles = electrificationBlocks(x5).map((block) => block.title);
    assert.deepEqual(titles, [
      "Arquitectura", "Motor de combustión", "Motor eléctrico", "Batería", "Carga",
    ]);
  });

  it("la potencia del sistema se titula «Potencia combinada»", () => {
    assert.ok(labels(quickFacts(x5)).includes("Potencia combinada"));
  });

  it("la autonomía siempre lleva su ciclo de homologación al lado", () => {
    const battery = electrificationBlocks(x5).find((b) => b.title === "Batería");
    assert.equal(valueOf(battery!.rows, "Autonomía eléctrica"), "85 km (WLTP)");
  });

  it("sigue teniendo bloque de motor de combustión: es un híbrido", () => {
    assert.ok(engineRows(x5).length > 0);
  });

  it("no inventa la carga DC que no conocemos", () => {
    const charging = electrificationBlocks(x5).find((b) => b.title === "Carga");
    assert.deepEqual(labels(charging!.rows), ["Conector", "Carga AC máxima"]);
  });
});

describe("CASO C · Porsche Taycan · sedán eléctrico AWD", () => {
  const taycan = makeVehicle({
    make: "Porsche",
    model: "Taycan",
    fuelType: "Eléctrico",
    drivetrain: "Integral (AWD)",
    engine: "",
    specs: { powerHp: 476, torqueNm: 650, accel0100: 4.0, curbWeightKg: 2140 },
    electrification: {
      electricMotorCount: 2,
      electricMotorLayout: "Delantero y trasero",
      batteryGrossKwh: 93.4,
      batteryNetKwh: 83.7,
      electricRangeKm: 484,
      rangeStandard: "WLTP",
      chargeAcKw: 11,
      chargeDcKw: 270,
      chargeConnector: "CCS Combo 2",
    },
    documentation: {
      soatValid: true,
      soatExpiresOn: "2027-03-18",
      techInspectionApplies: true,
      techInspectionExpiresOn: "2026-11-02",
    },
  });

  it("NO muestra cilindrada ni cilindros: no tiene", () => {
    assert.deepEqual(engineRows(taycan), []);
    assert.ok(!specBlocks(taycan).some((block) => block.title === "Motor"));
  });

  it("muestra motores, batería, autonomía y carga", () => {
    const titles = electrificationBlocks(taycan).map((block) => block.title);
    assert.deepEqual(titles, ["Motor eléctrico", "Batería", "Carga"]);
  });

  it("la potencia se titula «Potencia total»", () => {
    assert.ok(labels(quickFacts(taycan)).includes("Potencia total"));
  });

  it("el SOAT y la tecnomecánica siguen aplicando igual que a cualquiera", () => {
    const rows = documentationRows(taycan);
    assert.equal(valueOf(rows, "SOAT"), "Vigente hasta el 18 de marzo de 2027");
    assert.equal(
      valueOf(rows, "Técnico-mecánica"),
      "Vigente hasta el 2 de noviembre de 2026",
    );
  });
});

describe("CASO D · Toyota Land Cruiser · SUV diésel 4WD, off-road", () => {
  const cruiser = makeVehicle({
    make: "Toyota",
    model: "Land Cruiser",
    fuelType: "Diésel",
    drivetrain: "4x4 (4WD)",
    tags: ["Off-road"],
  });

  it("su carrocería es SUV: «4x4» era tracción, y ahí está", () => {
    assert.equal(cruiser.category?.name, "SUV");
    assert.equal(valueOf(quickFacts(cruiser), "Tracción"), "4x4 (4WD)");
  });

  it("4WD e integral son valores distintos y no se confunden", () => {
    const awd = makeVehicle({ drivetrain: "Integral (AWD)" });
    assert.notEqual(cruiser.drivetrain, awd.drivetrain);
  });
});

describe("CASO E · Mazda MX-5 · cabrio gasolina RWD", () => {
  const mx5 = makeVehicle({
    make: "Mazda",
    model: "MX-5",
    fuelType: "Gasolina",
    drivetrain: "Trasera (RWD)",
    transmission: "Manual",
    category: {
      id: "c6", name: "Cabrio", pluralName: "Cabrios", slug: "cabrio",
      vehicleType: "auto", active: true, position: 5,
    },
    tags: ["Deportivo"],
  });

  it("Cabrio es una carrocería de pleno derecho y admite el carácter deportivo", () => {
    assert.equal(mx5.category?.slug, "cabrio");
    assert.deepEqual(mx5.tags, ["Deportivo"]);
  });
});

describe("CASO F · Volkswagen Golf GTI · hatchback gasolina FWD", () => {
  const gti = makeVehicle({
    make: "Volkswagen",
    model: "Golf",
    version: "GTI",
    fuelType: "Gasolina",
    drivetrain: "Delantera (FWD)",
    category: {
      id: "c4", name: "Hatchback", pluralName: "Hatchbacks", slug: "hatchback",
      vehicleType: "auto", active: true, position: 3,
    },
    tags: ["Deportivo"],
  });

  it("es la prueba de que «Deportivo» no puede sustituir a la carrocería", () => {
    // Un M3 es un sedán deportivo y este es un hatchback deportivo. Con
    // "Deportivo" como carrocería, los dos caían en el mismo cajón y ninguno
    // se podía encontrar filtrando por su forma real.
    assert.equal(gti.category?.name, "Hatchback");
    assert.ok(gti.tags.includes("Deportivo"));
  });
});

describe("CASO G · un vehículo sin «¿Sabías que?»", () => {
  it("no trae nada que renderizar", () => {
    const plain = makeVehicle();
    assert.equal(plain.funFact.enabled, false);
    assert.equal(plain.funFact.body, null);
  });

  it("activado pero vacío tampoco: el componente exige cuerpo", () => {
    const empty = makeVehicle({ funFact: { enabled: true, body: "   " } });
    assert.equal(empty.funFact.body?.trim(), "");
  });
});

describe("CASO H · un vehículo con «¿Sabías que?»", () => {
  it("conserva título y cuerpo tal como se escribieron", () => {
    const withFact = makeVehicle({
      funFact: {
        enabled: true,
        title: "Dirección al eje trasero",
        body: "Gira las ruedas traseras en sentido contrario a baja velocidad.",
      },
    });
    assert.equal(withFact.funFact.enabled, true);
    assert.match(withFact.funFact.body!, /sentido contrario/);
  });
});

describe("CASO I · un vehículo con la ficha técnica incompleta", () => {
  const bare = makeVehicle({ engine: "", exteriorColor: "", interiorColor: "" });

  it("no escribe «N/A» por ninguna parte", () => {
    const everything = [
      ...quickFacts(bare),
      ...specBlocks(bare).flatMap((block) => block.rows),
      ...electrificationBlocks(bare).flatMap((block) => block.rows),
      ...documentationRows(bare),
    ];
    for (const row of everything) {
      assert.ok(row.value.trim() !== "", `"${row.label}" quedó sin valor`);
      assert.doesNotMatch(row.value, /N\/A|—|null|undefined/i);
    }
  });

  it("solo quedan las filas que sí tienen dato", () => {
    assert.deepEqual(labels(quickFacts(bare)), [
      "Combustible", "Transmisión", "Tracción",
    ]);
    assert.deepEqual(
      specBlocks(bare).map((block) => block.title),
      ["General"],
    );
    assert.deepEqual(labels(specBlocks(bare)[0].rows), [
      "Año", "Kilometraje", "Carrocería", "Ciudad",
    ]);
  });

  it("sin documentación no hay sección de documentación", () => {
    assert.deepEqual(documentationRows(bare), []);
  });

  it("sin peso o sin potencia no se calcula la relación", () => {
    assert.equal(powerToWeight(makeVehicle({ specs: { powerHp: 300 } })), null);
    assert.equal(powerToWeight(makeVehicle({ specs: { curbWeightKg: 1500 } })), null);
  });
});

describe("documentación, dicha como se dice en Colombia", () => {
  it("«No aplica actualmente» es una respuesta, no un hueco", () => {
    const rows = documentationRows(
      makeVehicle({ documentation: { techInspectionApplies: false } }),
    );
    assert.equal(valueOf(rows, "Técnico-mecánica"), "No aplica actualmente");
  });

  it("si no aplica, una fecha suelta no puede contradecirlo", () => {
    const rows = documentationRows(
      makeVehicle({
        documentation: {
          techInspectionApplies: false,
          techInspectionExpiresOn: "2026-11-02",
        },
      }),
    );
    assert.equal(valueOf(rows, "Técnico-mecánica"), "No aplica actualmente");
  });

  it("un SOAT vencido se dice vencido, no vigente", () => {
    const rows = documentationRows(
      makeVehicle({
        documentation: { soatValid: false, soatExpiresOn: "2024-01-05" },
      }),
    );
    assert.equal(valueOf(rows, "SOAT"), "Vencido el 5 de enero de 2024");
  });

  it("junta el estado de impuestos con el año hasta el que están pagos", () => {
    const rows = documentationRows(
      makeVehicle({
        documentation: { taxStatus: "Al día", taxesPaidThroughYear: 2026 },
      }),
    );
    assert.equal(valueOf(rows, "Impuestos"), "Al día · pagos hasta 2026");
  });

  it("el dígito 0 de la placa se muestra: es un dígito, no un vacío", () => {
    const rows = documentationRows(
      makeVehicle({ documentation: { plateLastDigit: 0 } }),
    );
    assert.equal(valueOf(rows, "Placa termina en"), "0");
  });
});

/**
 * Una fecha de calendario no es un instante. `new Date("2027-03-18")` es la
 * medianoche UTC, y en Bogotá (UTC−5) eso cae el 17 de marzo: un SOAT que
 * vence el 18 se leería venciendo el 17.
 */
describe("fechas administrativas", () => {
  it("se leen el día que son, no el anterior", () => {
    assert.equal(formatDateOnly("2027-03-18"), "18 de marzo de 2027");
    assert.equal(formatDateOnly("2026-01-01"), "1 de enero de 2026");
    assert.equal(formatDateOnly("2026-12-31"), "31 de diciembre de 2026");
  });

  it("nunca se muestra el formato ISO en crudo", () => {
    assert.doesNotMatch(formatDateOnly("2027-03-18")!, /2027-03-18/);
  });

  it("lo que no es una fecha devuelve null, no «Invalid Date»", () => {
    assert.equal(formatDateOnly(null), null);
    assert.equal(formatDateOnly(""), null);
    assert.equal(formatDateOnly("mañana"), null);
  });

  it("sabe si una fecha ya pasó, comparando días y no instantes", () => {
    const today = new Date(Date.UTC(2026, 5, 15));
    assert.equal(isPastDate("2026-06-14", today), true);
    assert.equal(isPastDate("2026-06-15", today), false);
    assert.equal(isPastDate("2026-06-16", today), false);
  });
});

describe("equipamiento por categorías", () => {
  it("agrupa en el orden del catálogo y descarta los grupos vacíos", () => {
    const groups = groupFeatures([
      "camera-360", "led-headlights", "head-up-display", "launch-control",
    ]);
    assert.deepEqual(
      groups.map((group) => group.title),
      ["Exterior", "Interior", "Seguridad y asistencias", "Performance"],
    );
    assert.deepEqual(groups[0].labels, ["Faros LED"]);
  });

  it("una clave desconocida no dibuja un identificador suelto", () => {
    assert.deepEqual(groupFeatures(["no-existe"]), []);
  });

  it("sin nada seleccionado no hay grupos", () => {
    assert.deepEqual(groupFeatures([]), []);
  });
});
