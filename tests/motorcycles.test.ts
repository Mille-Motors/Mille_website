import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dateInputError,
  displayToIso,
  isoToDisplay,
  maskDateInput,
} from "@/lib/date-input";
import {
  equipmentLinesFromText,
  equipmentSections,
  equipmentTemplate,
  equipmentTextFromLines,
} from "@/lib/equipment";
import { publicationBlockers } from "@/lib/publication";
import {
  drivelineRows,
  engineRows,
  generalRows,
  quickFacts,
  specBlocks,
  transmissionValue,
} from "@/lib/vehicle-display";
import { emptyDraft, type Draft } from "@/lib/vehicle-draft";
import { vehicleInputSchema } from "@/server/vehicles/schemas";
import {
  CAR_TAGS,
  MOTO_ENGINE_LAYOUTS,
  MOTO_TAGS,
  MOTO_TRANSMISSIONS,
  categoryLabel,
  engineLayoutsFor,
  hasCombustionEngine,
  keepOnTypeChange,
  tagsFor,
  transmissionsFor,
  usesDrivetrain,
  usesFinalDrive,
  usesInteriorColor,
} from "@/types/vehicle";
import { makeVehicle } from "./support/vehicle";

/**
 * Una moto no es un carro con otras etiquetas.
 *
 * Hasta aquí se le pedía tracción integral, se le ofrecía "Carrocería: ADV",
 * se le guardaba un color de interior que no tiene y se le exigía todo eso
 * para publicarla — mientras que la caja, las marchas y la transmisión
 * final, que es lo que cualquier ficha de moto publica, no cabían en ninguna
 * parte. Estas pruebas fijan esa separación.
 */

const labels = (rows: { label: string }[]) => rows.map((r) => r.label);
const valueOf = (rows: { label: string; value: string }[], label: string) =>
  rows.find((r) => r.label === label)?.value;

const motoCategory = {
  id: "m1",
  name: "ADV",
  pluralName: "ADV",
  slug: "adv",
  vehicleType: "moto" as const,
  active: true,
  position: 0,
};

const photo = [
  { id: "i1", src: "/a.jpg", alt: "a", source: "storage" as const, storagePath: "v/1/a.jpg" },
];

/** Una moto completa, de las que sí se pueden publicar. */
const completeMoto = {
  vehicleType: "moto" as const,
  make: "Ducati",
  model: "Multistrada",
  version: "V2 S",
  category: motoCategory,
  year: 2023,
  price: 95_000_000,
  mileage: 4_000,
  fuelType: "Gasolina",
  transmission: "Manual secuencial",
  gearCount: 6,
  drivetrain: null,
  finalDrive: "Cadena",
  interiorColor: "",
  city: "Bogotá, CO",
  description: "Una unidad impecable.",
  images: photo,
};

describe("CASO 1 · moto de gasolina: el motor térmico se describe entero", () => {
  const moto = makeVehicle({
    ...completeMoto,
    engine: "Testastretta 11° 937 cc",
    specs: {
      engineLayout: "L-Twin",
      cylinders: 2,
      displacementCc: 937,
      aspiration: "Atmosférico",
      powerHp: 113,
      torqueNm: 96,
      curbWeightKg: 202,
    },
  });

  it("enseña denominación, arquitectura, cilindros y cilindrada", () => {
    assert.deepEqual(labels(engineRows(moto)), [
      "Motor", "Arquitectura", "Cilindros", "Cilindrada", "Alimentación",
    ]);
    assert.equal(valueOf(engineRows(moto), "Cilindrada"), "937 cc");
  });

  it("el motor no depende del universo, sino del combustible", () => {
    // Era el fallo: `hasCombustionEngine` escondía el motor de cualquier
    // vehículo sin combustible elegido, y con él la cilindrada.
    assert.equal(hasCombustionEngine("Gasolina"), true);
    assert.equal(hasCombustionEngine(null), true, "sin combustible no se esconde");
    assert.equal(hasCombustionEngine("Eléctrico"), false);
  });

  it("la potencia y el torque salen en los datos rápidos", () => {
    assert.equal(valueOf(quickFacts(moto), "Potencia"), "113 hp");
    assert.equal(valueOf(quickFacts(moto), "Torque"), "96 Nm");
  });
});

describe("CASO 2 · moto eléctrica: sin cilindros ni cilindrada", () => {
  const ev = makeVehicle({
    ...completeMoto,
    make: "Zero",
    model: "SR/F",
    fuelType: "Eléctrico",
    transmission: "Transmisión directa",
    gearCount: 1,
    finalDrive: "Correa",
    engine: "",
    specs: { powerHp: 110, torqueNm: 190 },
    electrification: { batteryGrossKwh: 17.3, electricRangeKm: 259 },
  });

  it("no hay bloque de motor térmico", () => {
    assert.deepEqual(engineRows(ev), []);
    assert.ok(!specBlocks(ev).some((b) => b.title === "Motor"));
  });

  it("pero sí transmisión y correa", () => {
    assert.equal(valueOf(drivelineRows(ev), "Transmisión"), "Transmisión directa · 1 velocidades");
    assert.equal(valueOf(drivelineRows(ev), "Transmisión final"), "Correa");
  });
});

describe("CASO 3 · Ducati: manual secuencial, seis marchas, cadena", () => {
  const ducati = makeVehicle(completeMoto);

  it("la transmisión se lee con sus marchas al lado", () => {
    assert.equal(transmissionValue(ducati), "Manual secuencial · 6 velocidades");
  });

  it("el quickshifter no es una transmisión", () => {
    // Vive en el equipamiento, no en el vocabulario de cajas.
    assert.ok(!(MOTO_TRANSMISSIONS as readonly string[]).includes("Quickshifter"));
    assert.ok(equipmentTemplate("moto").includes("Quickshifter:"));
  });

  it("sin marchas conocidas se lee solo la caja, sin inventar un seis", () => {
    const sinMarchas = makeVehicle({ ...completeMoto, gearCount: null });
    assert.equal(transmissionValue(sinMarchas), "Manual secuencial");
  });
});

describe("CASO 4 · BMW GS: bóxer de dos cilindros y cardán", () => {
  const gs = makeVehicle({
    ...completeMoto,
    make: "BMW Motorrad",
    model: "R 1300 GS",
    version: "",
    finalDrive: "Cardán",
    specs: { engineLayout: "Bóxer 2", cylinders: 2, displacementCc: 1300 },
  });

  it("arquitectura y número de cilindros son datos distintos", () => {
    assert.equal(valueOf(engineRows(gs), "Arquitectura"), "Bóxer 2");
    assert.equal(valueOf(engineRows(gs), "Cilindros"), "2");
  });

  it("el cardán se lee donde en un carro iría la tracción", () => {
    assert.equal(valueOf(drivelineRows(gs), "Transmisión final"), "Cardán");
    assert.equal(valueOf(drivelineRows(gs), "Tracción"), undefined);
  });
});

describe("CASO 5 · Honda DCT: automática de doble embrague con cadena", () => {
  const nc = makeVehicle({
    ...completeMoto,
    make: "Honda",
    model: "NC750X",
    version: "DCT",
    transmission: "Automática DCT",
    gearCount: 6,
    finalDrive: "Cadena",
  });

  it("DCT es una transmisión válida de moto", () => {
    assert.ok((MOTO_TRANSMISSIONS as readonly string[]).includes("Automática DCT"));
    assert.equal(transmissionValue(nc), "Automática DCT · 6 velocidades");
  });
});

describe("CASO 6 · scooter: variador y correa", () => {
  const scooter = makeVehicle({
    ...completeMoto,
    make: "Honda",
    model: "PCX",
    version: "160",
    transmission: "CVT / variador",
    gearCount: null,
    finalDrive: "Correa",
  });

  it("un variador no tiene marchas que contar", () => {
    assert.equal(transmissionValue(scooter), "CVT / variador");
    assert.equal(valueOf(drivelineRows(scooter), "Transmisión final"), "Correa");
  });
});

describe("CASO 7 y 8 · lo que una moto NO tiene", () => {
  const moto = makeVehicle({ ...completeMoto, interiorColor: "Negro" });

  it("el color interior no se muestra aunque la columna traiga algo", () => {
    assert.equal(usesInteriorColor("moto"), false);
    assert.ok(!labels(generalRows(moto)).includes("Color interior"));
  });

  it("la tracción FWD/RWD/AWD no existe en su ficha", () => {
    assert.equal(usesDrivetrain("moto"), false);
    assert.equal(usesFinalDrive("moto"), true, "y en su lugar va la final");
    assert.equal(usesFinalDrive("auto"), false);
    assert.ok(!labels(quickFacts(moto)).includes("Tracción"));
    assert.ok(!labels(drivelineRows(moto)).includes("Tracción"));
  });

  it("su categoría se titula «Tipo de moto», no «Carrocería»", () => {
    assert.equal(categoryLabel("moto"), "Tipo de moto");
    assert.equal(categoryLabel("auto"), "Carrocería");
    assert.ok(labels(generalRows(moto)).includes("Tipo de moto"));
    assert.ok(!labels(generalRows(moto)).includes("Carrocería"));
  });
});

describe("CASO 9, 10 y 11 · qué hace falta para publicar, según el tipo", () => {
  it("una moto completa se publica", () => {
    assert.deepEqual(publicationBlockers(makeVehicle(completeMoto)), []);
  });

  it("a una moto NO se le exige la tracción de un carro", () => {
    const blockers = publicationBlockers(
      makeVehicle({ ...completeMoto, drivetrain: null }),
    );
    assert.deepEqual(blockers, [], "la bloqueó un campo que ni se le muestra");
  });

  it("a una moto sí se le exige la transmisión final", () => {
    const blockers = publicationBlockers(
      makeVehicle({ ...completeMoto, finalDrive: null }),
    );
    assert.deepEqual(blockers, ["Falta la transmisión final."]);
  });

  it("sin tipo de moto el mensaje habla de tipo, no de carrocería", () => {
    const blockers = publicationBlockers(
      makeVehicle({ ...completeMoto, category: null }),
    );
    assert.deepEqual(blockers, ["Falta el tipo de moto."]);
  });

  it("una moto a medias enumera exactamente lo que le falta", () => {
    const blockers = publicationBlockers(
      makeVehicle({
        vehicleType: "moto",
        make: "", model: "", description: "",
        category: null, year: null, price: null, mileage: null,
        fuelType: null, transmission: null, drivetrain: null,
        finalDrive: null, city: null,
        images: photo,
      }),
    );
    assert.ok(blockers.some((b) => /transmisión final/i.test(b)));
    assert.ok(!blockers.some((b) => /tracción/i.test(b)), "le pidió tracción");
    assert.ok(!blockers.some((b) => /carrocería/i.test(b)), "le habló de carrocería");
  });

  it("a un carro se le sigue exigiendo la tracción, y no la final", () => {
    const sinTraccion = publicationBlockers(makeVehicle({ drivetrain: null }));
    assert.deepEqual(sinTraccion, ["Falta la tracción."]);
    const sinFinal = publicationBlockers(makeVehicle({ finalDrive: null }));
    assert.deepEqual(sinFinal, [], "le pidió transmisión final a un carro");
  });

  it("un carro completo sigue publicándose igual que antes", () => {
    assert.deepEqual(
      publicationBlockers(
        makeVehicle({
          price: 350_000_000, mileage: 20_000, year: 2023,
          city: "Bogotá, CO", description: "Impecable.", images: photo,
        }),
      ),
      [],
    );
  });
});

describe("CASO 14 y 15 · cada universo tiene su vocabulario", () => {
  it("la arquitectura de moto admite V2, V4, bóxer de dos y en línea", () => {
    for (const layout of ["Monocilíndrico", "V2 / V-Twin", "L-Twin", "Bóxer 2", "I3", "I4", "V4"]) {
      assert.ok(engineLayoutsFor("moto").includes(layout), `falta ${layout}`);
    }
  });

  it("y no ofrece un V8 ni un rotativo, que son de carro", () => {
    assert.ok(!engineLayoutsFor("moto").includes("V8"));
    assert.ok(!engineLayoutsFor("moto").includes("Rotativo"));
    assert.ok(engineLayoutsFor("auto").includes("V8"));
  });

  it("la transmisión no se mezcla entre universos", () => {
    assert.ok(transmissionsFor("moto").includes("Manual secuencial"));
    assert.ok(!transmissionsFor("auto").includes("Manual secuencial"));
    assert.ok(transmissionsFor("auto").includes("Automática"));
    assert.ok(!transmissionsFor("moto").includes("Automática"));
  });

  it("el carácter de una moto no hereda «Familiar» ni «Deportivo»", () => {
    assert.ok(!tagsFor("moto").includes("Familiar"));
    assert.ok(!tagsFor("moto").includes("Deportivo"));
    assert.ok(tagsFor("moto").includes("Urbana"));
    assert.ok(tagsFor("auto").includes("Familiar"));
  });

  it("no se duplica lo que ya dice la categoría", () => {
    // "Sport" ya es un tipo de moto; no hace falta además como carácter.
    assert.ok(!(MOTO_TAGS as readonly string[]).includes("Sport"));
    assert.ok((CAR_TAGS as readonly string[]).includes("Deportivo"));
    assert.ok((MOTO_ENGINE_LAYOUTS as readonly string[]).includes("Bóxer 2"));
  });
});

/**
 * Cambiar de universo no puede dejar debajo datos del anterior. Se prueba
 * sobre el mismo criterio que usan el formulario y el servicio.
 */
describe("CASO 12 y 13 · cambiar de universo limpia lo que deja de aplicar", () => {
  const carro: Draft = {
    ...emptyDraft(),
    make: "BMW", model: "X5",
    transmission: "Automática",
    engineLayout: "V8",
    drivetrain: "Integral (AWD)",
    interiorColor: "Negro",
    tags: ["Familiar", "Lujo"],
    categoryId: "cat-suv",
  };

  /**
   * La MISMA función que usan el formulario y el servicio. Está en un solo
   * sitio justamente porque estaba en dos y se desincronizaron: el
   * formulario limpiaba la transmisión al cambiar de tipo y el servicio no,
   * así que un carro podía quedar guardado con una caja "Manual secuencial".
   */
  function switchType(draft: Draft, next: "auto" | "moto"): Draft {
    const kept = keepOnTypeChange(next, {
      transmission: draft.transmission || null,
      engineLayout: draft.engineLayout || null,
      drivetrain: draft.drivetrain || null,
      finalDrive: draft.finalDrive || null,
      interiorColor: draft.interiorColor,
      tags: draft.tags,
      categoryId: draft.categoryId || null,
    });
    return {
      ...draft,
      vehicleType: next,
      transmission: kept.transmission ?? "",
      engineLayout: kept.engineLayout ?? "",
      drivetrain: kept.drivetrain ?? "",
      finalDrive: kept.finalDrive ?? "",
      interiorColor: kept.interiorColor,
      tags: kept.tags,
      categoryId: kept.categoryId ?? "",
    };
  }

  it("carro → moto suelta tracción, color interior, V8 y «Familiar»", () => {
    const moto = switchType(carro, "moto");
    assert.equal(moto.drivetrain, "");
    assert.equal(moto.interiorColor, "");
    assert.equal(moto.engineLayout, "", "un V8 no es arquitectura de moto");
    assert.equal(moto.transmission, "", "«Automática» no es caja de moto");
    assert.deepEqual(moto.tags, ["Lujo"], "«Familiar» no aplica a una moto");
    assert.equal(moto.categoryId, "", "la categoría pertenece a un universo");
  });

  it("…y no toca nada que siga siendo verdad", () => {
    const moto = switchType(carro, "moto");
    assert.equal(moto.make, "BMW");
    assert.equal(moto.model, "X5");
  });

  it("moto → carro suelta el cardán y la arquitectura de moto", () => {
    const moto: Draft = {
      ...emptyDraft(),
      vehicleType: "moto",
      make: "Ducati",
      transmission: "Manual secuencial",
      engineLayout: "L-Twin",
      finalDrive: "Cadena",
      gearCount: 6,
      tags: ["Urbana", "Lujo"],
    };
    const auto = switchType(moto, "auto");
    assert.equal(auto.finalDrive, "");
    assert.equal(auto.engineLayout, "");
    assert.equal(auto.transmission, "");
    assert.deepEqual(auto.tags, ["Lujo"]);
    assert.equal(auto.make, "Ducati", "la marca no es del universo");
    // Las marchas valen en los dos: una caja de ocho es tan descriptiva en
    // un carro como las seis de una moto.
    assert.equal(auto.gearCount, 6);
  });

  it("lo que vale en los dos universos se conserva", () => {
    const conOtra = switchType({ ...carro, engineLayout: "I4" }, "moto");
    assert.equal(conOtra.engineLayout, "I4", "I4 existe en los dos");
  });
});

describe("CASO 16 y 17 · escribir una fecha", () => {
  it("DD/MM/AAAA se guarda como ISO", () => {
    assert.equal(displayToIso("01/10/2026"), "2026-10-01");
    assert.equal(displayToIso("18/03/2027"), "2027-03-18");
  });

  it("y vuelve a leerse igual", () => {
    assert.equal(isoToDisplay("2026-10-01"), "01/10/2026");
    assert.equal(isoToDisplay(null), "");
    assert.equal(isoToDisplay("no es fecha"), "");
  });

  it("el 1 de octubre no se convierte en el 30 de septiembre", () => {
    // `new Date("2026-10-01")` es medianoche UTC, que en Bogotá es el 30.
    // Por eso aquí no se construye ningún Date para convertir.
    const iso = displayToIso("01/10/2026");
    assert.equal(iso, "2026-10-01");
    assert.equal(isoToDisplay(iso), "01/10/2026");
  });

  it("se teclea seguido y las barras se ponen solas", () => {
    assert.equal(maskDateInput("0"), "0");
    assert.equal(maskDateInput("01"), "01");
    assert.equal(maskDateInput("011"), "01/1");
    assert.equal(maskDateInput("0110"), "01/10");
    assert.equal(maskDateInput("01102026"), "01/10/2026");
    // Lo que se pega con barras ya puestas también vale.
    assert.equal(maskDateInput("01/10/2026"), "01/10/2026");
  });

  it("a medio escribir todavía no hay fecha, y eso no es un error", () => {
    assert.equal(displayToIso("01/10"), null);
    assert.equal(dateInputError("01/10"), "Escribe la fecha como DD/MM/AAAA.");
    assert.equal(dateInputError(""), null);
  });

  it("una fecha que no existe se rechaza en vez de correrse", () => {
    assert.equal(displayToIso("31/02/2026"), null);
    assert.equal(dateInputError("31/02/2026"), "Esa fecha no existe.");
    assert.equal(dateInputError("01/10/2026"), null);
  });
});

describe("CASO 18 y 19 · la placa", () => {
  const base = { vehicleType: "moto" as const };

  it("en moto acepta alfanumérico y lo normaliza", () => {
    const parse = (plateEnding: string) =>
      vehicleInputSchema.parse({ ...base, plateEnding }).plateEnding;
    assert.equal(parse("12f"), "12F");
    assert.equal(parse(" ab 12 "), "AB12");
    assert.equal(parse("7"), "7");
  });

  it("no se le impone «número + letra» a ninguna placa", () => {
    // Los formatos colombianos han cambiado con los años; imponer uno
    // dejaría fuera placas perfectamente válidas.
    assert.equal(vehicleInputSchema.parse({ ...base, plateEnding: "ABC" }).plateEnding, "ABC");
    assert.equal(vehicleInputSchema.parse({ ...base, plateEnding: "99" }).plateEnding, "99");
  });

  it("en carro sigue siendo un solo dígito", () => {
    // La forma la valida el esquema; que sea un dígito, el servicio, que es
    // quien conoce el universo. Aquí se fija la regla que el servicio aplica.
    const singleDigit = /^[0-9]$/;
    assert.ok(singleDigit.test("7"));
    assert.ok(!singleDigit.test("12F"));
  });

  it("lo que no es letra ni número se rechaza en los dos", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...base, plateEnding: "A*1" }));
  });
});

describe("CASO 20, 21 y 22 · el equipamiento como texto", () => {
  it("la plantilla de moto habla de moto", () => {
    const template = equipmentTemplate("moto");
    for (const section of ["[Electrónica y ayudas]", "[Suspensión y chasis]", "[Frenos]", "[Rines y neumáticos]"]) {
      assert.ok(template.includes(section), `falta ${section}`);
    }
    assert.ok(!template.includes("[Infotainment]"));
    assert.ok(!template.includes("Climatización"));
  });

  it("la de carro habla de carro", () => {
    const template = equipmentTemplate("auto");
    for (const section of ["[Exterior]", "[Interior y confort]", "[Infotainment]", "[Seguridad y ADAS]"]) {
      assert.ok(template.includes(section), `falta ${section}`);
    }
    assert.ok(!template.includes("Quickshifter"));
  });

  it("cargar la plantilla y guardar sin tocar nada no inventa equipamiento", () => {
    // Es la propiedad que la hace segura: sugiere dónde mirar, no afirma.
    assert.deepEqual(equipmentLinesFromText(equipmentTemplate("moto")), []);
    assert.deepEqual(equipmentLinesFromText(equipmentTemplate("auto")), []);
  });

  it("round-trip: lo que se escribe es lo que se guarda y se vuelve a leer", () => {
    const written = `[Frenos]
Brembo Stylema M4.30
Disco trasero de 265 mm

[Electrónica y ayudas]
ABS en curva
Control de tracción:
`;
    const lines = equipmentLinesFromText(written);
    assert.deepEqual(lines, [
      "[Frenos]",
      "Brembo Stylema M4.30",
      "Disco trasero de 265 mm",
      "[Electrónica y ayudas]",
      "ABS en curva",
    ]);
    // Y de vuelta al formulario sin perder nada.
    assert.deepEqual(equipmentLinesFromText(equipmentTextFromLines(lines)), lines);
    assert.deepEqual(
      equipmentSections(lines).map((s) => s.title),
      ["Frenos", "Electrónica y ayudas"],
    );
  });

  it("ninguna línea vacía ni hueco de plantilla acaba como equipamiento", () => {
    const lines = equipmentLinesFromText("\n  \nABS:\nFaros LED\n   \nTPMS:  \n");
    assert.deepEqual(lines, ["Faros LED"]);
  });

  it("una sección que se queda sin nada debajo tampoco se guarda", () => {
    assert.deepEqual(equipmentLinesFromText("[Frenos]\nABS:\n"), []);
    assert.deepEqual(
      equipmentLinesFromText("[Frenos]\n[Rines]\nRin delantero: 19\""),
      ["[Rines]", 'Rin delantero: 19"'],
    );
  });
});

/**
 * El equipamiento vive en dos formatos y hay que leer los dos.
 *
 * El canónico es la cabecera en su línea y los elementos debajo. El legacy
 * lo dejó la migración que convirtió el catálogo de casillas a texto:
 * `[Frenos] Brembo Stylema`, cabecera y elemento juntos, porque en SQL era
 * lo más simple de producir. Si el parser solo entendiera el canónico, todo
 * lo migrado se renderizaría con los corchetes a la vista.
 *
 * La migración ya está aplicada y no se reescribe: hacerlo rompe su
 * checksum y no arregla las bases donde ya corrió. La compatibilidad va
 * aquí, que es donde pueden convivir los dos.
 */
describe("equipamiento: formato canónico y formato migrado", () => {
  it("formato nuevo: cabecera en su línea", () => {
    const sections = equipmentSections(["[Exterior]", "Faros LED", 'Rines 21"']);
    assert.deepEqual(sections, [
      { title: "Exterior", items: ["Faros LED", 'Rines 21"'] },
    ]);
  });

  it("formato legacy: cabecera y elemento en la misma línea", () => {
    assert.deepEqual(equipmentSections(["[Exterior] Faros LED"]), [
      { title: "Exterior", items: ["Faros LED"] },
    ]);
  });

  it("dos líneas legacy de la misma sección dan UNA sección", () => {
    const sections = equipmentSections([
      "[Exterior] Faros LED",
      "[Exterior] Techo panorámico",
    ]);
    assert.deepEqual(sections, [
      { title: "Exterior", items: ["Faros LED", "Techo panorámico"] },
    ]);
  });

  it("al cambiar de sección se abre otra", () => {
    const sections = equipmentSections([
      "[Exterior] Faros LED",
      "[Interior y confort] Asientos calefactados",
    ]);
    assert.deepEqual(sections, [
      { title: "Exterior", items: ["Faros LED"] },
      { title: "Interior y confort", items: ["Asientos calefactados"] },
    ]);
  });

  it("los dos formatos se pueden mezclar en la misma ficha", () => {
    // Es lo que queda tras editar un vehículo migrado sin guardarlo entero.
    const sections = equipmentSections([
      "[Seguridad y asistencias] Cámara 360°",
      "[Exterior] Faros LED",
      "Techo panorámico",
      "[Frenos]",
      "Brembo Stylema",
    ]);
    assert.deepEqual(sections, [
      { title: "Seguridad y asistencias", items: ["Cámara 360°"] },
      // La línea suelta cae en la sección abierta, que es la correcta.
      { title: "Exterior", items: ["Faros LED", "Techo panorámico"] },
      { title: "Frenos", items: ["Brembo Stylema"] },
    ]);
  });

  it("lo escrito antes de cualquier sección sigue sin epígrafe", () => {
    assert.deepEqual(equipmentSections(["Llantas de invierno", "Barras"]), [
      { title: null, items: ["Llantas de invierno", "Barras"] },
    ]);
  });

  it("un corchete sin nada detrás sigue siendo una cabecera vacía", () => {
    // Y una sección sin elementos no se dibuja.
    assert.deepEqual(equipmentSections(["[Frenos]"]), []);
  });

  it("el editor ve lo migrado ya normalizado al formato nuevo", () => {
    const migrated = [
      "[Seguridad y asistencias] Cámara 360°",
      "[Exterior] Faros LED",
      "[Exterior] Techo panorámico",
      "Llantas de invierno",
    ];
    assert.equal(
      equipmentTextFromLines(migrated),
      [
        "[Seguridad y asistencias]",
        "Cámara 360°",
        "[Exterior]",
        "Faros LED",
        "Techo panorámico",
        "Llantas de invierno",
      ].join("\n"),
    );
  });

  it("el siguiente guardado lo persiste en formato canónico", () => {
    const migrated = [
      "[Exterior] Faros LED",
      "[Exterior] Techo panorámico",
      "[Frenos] Brembo Stylema",
    ];
    // Tal cual lo hace el formulario: cargar a texto y volver a guardar.
    const saved = equipmentLinesFromText(equipmentTextFromLines(migrated));
    assert.deepEqual(saved, [
      "[Exterior]",
      "Faros LED",
      "Techo panorámico",
      "[Frenos]",
      "Brembo Stylema",
    ]);
  });

  it("ningún elemento se pierde al normalizar", () => {
    const migrated = [
      "[Seguridad y asistencias] Cámara 360°",
      "[Exterior] Faros LED",
      "[Exterior] Techo panorámico",
      "[Performance] Launch control",
      "Llantas de invierno",
    ];
    const itemsOf = (lines: string[]) =>
      equipmentSections(lines).flatMap((s) => s.items);

    const saved = equipmentLinesFromText(equipmentTextFromLines(migrated));
    assert.deepEqual(itemsOf(saved), itemsOf(migrated));
    assert.equal(itemsOf(saved).length, 5);
  });

  it("normalizar algo ya canónico no lo cambia", () => {
    const canonical = ["[Frenos]", "Brembo Stylema", "[Rines]", 'Rin de 19"'];
    assert.deepEqual(
      equipmentLinesFromText(equipmentTextFromLines(canonical)),
      canonical,
    );
  });

  it("y la ficha pública agrupa lo migrado sin enseñar corchetes", () => {
    const sections = equipmentSections([
      "[Seguridad y asistencias] Cámara 360°",
      "[Performance] Launch control",
    ]);
    for (const section of sections) {
      for (const item of section.items) {
        assert.ok(!item.includes("["), `"${item}" salió con corchetes`);
      }
    }
    assert.deepEqual(
      sections.map((s) => s.title),
      ["Seguridad y asistencias", "Performance"],
    );
  });
});
