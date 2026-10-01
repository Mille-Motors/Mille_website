import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicationBlockers } from "@/lib/publication";
import { vehicleLabel } from "@/lib/format";
import { toPriceNumber } from "@/server/vehicles/mapper";
import {
  vehicleInputSchema,
  vehiclePatchSchema,
} from "@/server/vehicles/schemas";
import { makeVehicle } from "./support/vehicle";

/**
 * Un borrador puede estar incompleto; un publicado, nunca.
 *
 * Es la única regla que sostiene todo esto. Poder subir las fotos antes de
 * escribir nada exige que la fila se pueda crear vacía, y eso solo es
 * seguro si la puerta al sitio público sigue cerrada con llave. Estas
 * pruebas fijan las dos mitades: que lo incompleto se pueda guardar y que
 * no se pueda publicar.
 */

/**
 * Lo que el formulario manda al guardar un borrador recién abierto: el
 * universo, y nada más. Ni carrocería, ni combustible, ni transmisión, ni
 * tracción, ni ciudad, ni año.
 */
const emptyDraftInput = { vehicleType: "auto" as const };

const CATEGORY_ID = "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f";

/** Una carrocería cualquiera, para las pruebas que necesitan una de verdad. */
const category = {
  id: CATEGORY_ID,
  name: "Sedán",
  pluralName: "Sedanes",
  slug: "sedan",
  vehicleType: "auto" as const,
  active: true,
  position: 1,
};

describe("guardar un borrador incompleto", () => {
  it("acepta un vehículo sin marca, modelo, precio, kilometraje ni descripción", () => {
    const parsed = vehicleInputSchema.parse(emptyDraftInput);
    assert.equal(parsed.make, "");
    assert.equal(parsed.model, "");
    assert.equal(parsed.description, "");
    assert.equal(parsed.price, null);
    assert.equal(parsed.mileage, null);
  });

  /**
   * El fallo que esto fija: el borrador creado solo para subir la foto de un
   * 330e quedaba guardado como "Gasolina + AWD + SUV en Bogotá" porque eran
   * los primeros valores de cada lista. Nadie lo había dicho.
   */
  it("NO inventa carrocería, combustible, transmisión, tracción, ciudad ni año", () => {
    const parsed = vehicleInputSchema.parse(emptyDraftInput);
    assert.equal(parsed.categoryId, null, "se inventó una carrocería");
    assert.equal(parsed.fuelType, null, "se inventó el combustible");
    assert.equal(parsed.transmission, null, "se inventó la transmisión");
    assert.equal(parsed.drivetrain, null, "se inventó la tracción");
    assert.equal(parsed.city, null, "se inventó la ciudad");
    assert.equal(parsed.year, null, "se inventó el año");
  });

  it("lo único que se afirma es el universo, que no describe la mecánica", () => {
    assert.equal(vehicleInputSchema.parse(emptyDraftInput).vehicleType, "auto");
  });

  it("un desplegable sin elegir llega como ausencia, no como cadena vacía", () => {
    // El formulario manda "" desde su opción "Seleccionar…".
    const parsed = vehicleInputSchema.parse({
      ...emptyDraftInput,
      fuelType: "",
      transmission: "",
      drivetrain: "",
      categoryId: "",
      city: "   ",
    });
    assert.equal(parsed.fuelType, null);
    assert.equal(parsed.transmission, null);
    assert.equal(parsed.drivetrain, null);
    assert.equal(parsed.categoryId, null);
    assert.equal(parsed.city, null);
  });

  it("un valor inventado sigue siendo un error: ausencia no es barra libre", () => {
    assert.throws(() =>
      vehicleInputSchema.parse({ ...emptyDraftInput, fuelType: "Plutonio" }),
    );
    assert.throws(() =>
      vehicleInputSchema.parse({ ...emptyDraftInput, drivetrain: "4x4 (AWD)" }),
    );
    assert.throws(() =>
      vehicleInputSchema.parse({ ...emptyDraftInput, categoryId: "sedan" }),
    );
  });

  it("la ausencia de precio es null, no cero", () => {
    // Es la diferencia entre "todavía no se sabe" y "vale cero pesos".
    const parsed = vehicleInputSchema.parse(emptyDraftInput);
    assert.notEqual(parsed.price, 0);
    assert.equal(parsed.price, null);
  });

  it("0 km sigue siendo un valor legítimo y distinto de no saberlo", () => {
    const sinRellenar = vehicleInputSchema.parse(emptyDraftInput);
    const cero = vehicleInputSchema.parse({ ...emptyDraftInput, mileage: 0 });
    assert.equal(sinRellenar.mileage, null);
    assert.equal(cero.mileage, 0);
  });

  it("un parche puede vaciar el precio sin ponerlo en cero", () => {
    assert.equal(vehiclePatchSchema.parse({ price: null }).price, null);
  });

  it("sigue rechazando lo que está mal escrito, no solo lo que falta", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...emptyDraftInput, price: -1 }));
    assert.throws(() => vehicleInputSchema.parse({ ...emptyDraftInput, mileage: -1 }));
    assert.throws(() => vehicleInputSchema.parse({ ...emptyDraftInput, year: 1800 }));
  });

  it("un borrador sin nombre se puede nombrar en el admin", () => {
    assert.equal(vehicleLabel({ make: "", model: "", version: "" }), "Borrador sin título");
    assert.equal(vehicleLabel({ make: "BMW", model: "X5", version: "" }), "BMW X5");
  });
});

/**
 * La contrapartida de que la base ya no obligue a nada: lo que antes
 * garantizaba el `NOT NULL` lo garantiza ahora esta lista, y solo ella.
 */
describe("publicar exige los doce requisitos, uno por uno", () => {
  const completo = {
    make: "BMW",
    model: "330e",
    category,
    year: 2021,
    price: 180_000_000,
    mileage: 42_000,
    fuelType: "Híbrido enchufable",
    transmission: "Automática",
    drivetrain: "Trasera (RWD)",
    city: "Bogotá, CO",
    description: "Una unidad muy cuidada.",
    images: [
      { id: "i1", src: "/a.jpg", alt: "a", source: "storage" as const, storagePath: "vehicles/1/a.jpg" },
    ],
  };

  it("completo no tiene impedimentos", () => {
    assert.deepEqual(publicationBlockers(makeVehicle(completo)), []);
  });

  /** Quitar cualquiera de ellos, de uno en uno, debe bloquear. */
  const quitando: [string, Partial<typeof completo>, RegExp][] = [
    ["la marca", { make: "" }, /marca/i],
    ["el modelo", { model: "" }, /modelo/i],
    ["la carrocería", { category: null as never }, /carrocer/i],
    ["el año", { year: null as never }, /año/i],
    ["el precio", { price: null as never }, /precio/i],
    ["el kilometraje", { mileage: null as never }, /kilometraje/i],
    ["el combustible", { fuelType: null as never }, /combustible/i],
    ["la transmisión", { transmission: null as never }, /transmisi/i],
    ["la tracción", { drivetrain: null as never }, /tracci/i],
    ["la ciudad", { city: null as never }, /ciudad/i],
    ["la descripción", { description: "" }, /descripci/i],
    ["las fotografías", { images: [] }, /fotograf/i],
  ];

  for (const [what, patch, expected] of quitando) {
    it(`sin ${what} no se publica`, () => {
      const blockers = publicationBlockers(makeVehicle({ ...completo, ...patch }));
      assert.ok(
        blockers.some((b) => expected.test(b)),
        `faltaba ${what} y nadie lo impidió: ${JSON.stringify(blockers)}`,
      );
    });
  }

  it("un año fuera de rango tampoco pasa, aunque esté puesto", () => {
    assert.ok(
      publicationBlockers(makeVehicle({ ...completo, year: 1500 })).some((b) =>
        /año/i.test(b),
      ),
    );
    assert.ok(
      publicationBlockers(makeVehicle({ ...completo, year: 3000 })).some((b) =>
        /año/i.test(b),
      ),
    );
  });

  it("una ciudad en blanco no cuenta como ciudad", () => {
    assert.ok(
      publicationBlockers(makeVehicle({ ...completo, city: "   " })).some((b) =>
        /ciudad/i.test(b),
      ),
    );
  });
});

/**
 * Configuraciones reales, para comprobar que la ausencia de valores por
 * defecto no rompe ninguna combinación legítima.
 */
describe("configuraciones completas de verdad", () => {
  const base = {
    category,
    year: 2021,
    price: 150_000_000,
    mileage: 30_000,
    city: "Bogotá, CO",
    description: "Unidad revisada.",
    images: [
      { id: "i1", src: "/a.jpg", alt: "a", source: "storage" as const, storagePath: "vehicles/1/a.jpg" },
    ],
  };

  it("gasolina, delantera y manual se publica sin problema", () => {
    const gti = makeVehicle({
      ...base,
      make: "Volkswagen",
      model: "Golf",
      version: "GTI",
      fuelType: "Gasolina",
      transmission: "Manual",
      drivetrain: "Delantera (FWD)",
    });
    assert.deepEqual(publicationBlockers(gti), []);
    // Y el esquema acepta esa combinación tal cual.
    const parsed = vehicleInputSchema.parse({
      vehicleType: "auto",
      categoryId: CATEGORY_ID,
      fuelType: "Gasolina",
      transmission: "Manual",
      drivetrain: "Delantera (FWD)",
    });
    assert.equal(parsed.transmission, "Manual");
    assert.equal(parsed.drivetrain, "Delantera (FWD)");
  });

  it("enchufable, integral y automática también", () => {
    const x5 = makeVehicle({
      ...base,
      make: "BMW",
      model: "X5",
      version: "xDrive45e",
      fuelType: "Híbrido enchufable",
      transmission: "Automática",
      drivetrain: "Integral (AWD)",
    });
    assert.deepEqual(publicationBlockers(x5), []);
    const parsed = vehicleInputSchema.parse({
      vehicleType: "auto",
      categoryId: CATEGORY_ID,
      fuelType: "Híbrido enchufable",
      transmission: "Automática",
      drivetrain: "Integral (AWD)",
    });
    assert.equal(parsed.fuelType, "Híbrido enchufable");
    assert.equal(parsed.drivetrain, "Integral (AWD)");
  });
});

/**
 * CASO 4 de la revisión: un borrador con fotos pero sin ficha no puede
 * llegar al público. Es lo que permite que subir fotos primero sea seguro.
 */
describe("publicar sigue exigiéndolo todo", () => {
  const conFoto = {
    images: [
      { id: "i1", src: "/a.jpg", alt: "a", source: "storage" as const, storagePath: "vehicles/1/a.jpg" },
    ],
  };

  it("un borrador recién creado por una foto no se puede publicar", () => {
    // Tal como lo deja `createDraftVehicle`: solo el universo y la foto.
    const draft = makeVehicle({
      make: "",
      model: "",
      description: "",
      category: null,
      year: null,
      price: null,
      mileage: null,
      fuelType: null,
      transmission: null,
      drivetrain: null,
      city: null,
      ...conFoto,
    });
    const blockers = publicationBlockers(draft);
    // Diez MENSAJES para doce requisitos, y las dos diferencias son
    // correctas: marca y modelo comparten uno, y la fotografía ya está.
    assert.equal(blockers.length, 10, JSON.stringify(blockers));
    assert.ok(!blockers.some((b) => /fotograf/i.test(b)));
  });

  it("un precio ausente bloquea igual que un precio en cero", () => {
    const sinPrecio = makeVehicle({ price: null, ...conFoto });
    const cero = makeVehicle({ price: 0, ...conFoto });
    assert.ok(publicationBlockers(sinPrecio).some((b) => /precio/i.test(b)));
    assert.ok(publicationBlockers(cero).some((b) => /precio/i.test(b)));
  });

  it("un kilometraje ausente bloquea, pero 0 km publica sin problema", () => {
    const sinKm = makeVehicle({ mileage: null, ...conFoto });
    const ceroKm = makeVehicle({ mileage: 0, ...conFoto });
    assert.ok(publicationBlockers(sinKm).some((b) => /kilometraje/i.test(b)));
    assert.deepEqual(publicationBlockers(ceroKm), []);
  });

  it("una ficha completa sin fotos tampoco se publica", () => {
    const sinFotos = makeVehicle({ images: [] });
    assert.ok(publicationBlockers(sinFotos).some((b) => /fotograf/i.test(b)));
  });

  it("completar el borrador lo vuelve publicable", () => {
    const listo = makeVehicle({
      make: "BMW",
      model: "X5",
      description: "Una unidad muy cuidada.",
      price: 350_000_000,
      mileage: 20_000,
      ...conFoto,
    });
    assert.deepEqual(publicationBlockers(listo), []);
  });
});

/**
 * El precio va de BigInt en la base a number en el dominio, y ese salto es
 * donde se perdía la ausencia: `Number(null)` es 0, así que un borrador sin
 * precio llegaba a la pantalla valiendo cero pesos. No daba error en
 * ninguna parte; simplemente mentía.
 */
describe("el precio al cruzar de la base al dominio", () => {
  it("sin precio sigue siendo sin precio, no cero", () => {
    assert.equal(toPriceNumber(null), null);
  });

  it("un precio real llega entero", () => {
    assert.equal(toPriceNumber(BigInt(350_000_000)), 350_000_000);
  });

  it("el cero de verdad se conserva y se distingue de la ausencia", () => {
    assert.equal(toPriceNumber(BigInt(0)), 0);
    assert.notEqual(toPriceNumber(BigInt(0)), toPriceNumber(null));
  });
});
