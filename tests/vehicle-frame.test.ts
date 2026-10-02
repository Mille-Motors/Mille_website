import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CENTER_FOCAL,
  coverCropRect,
  focalFromCropRect,
  normalizeFocal,
  objectPosition,
  roundFocal,
  sameFocal,
  type Size,
} from "@/lib/focal-point";
import {
  VEHICLE_DEFAULT_FOCAL,
  VEHICLE_FRAMES,
  VEHICLE_FRAME_RATIO,
} from "@/lib/vehicle-frame";
import { focalSchema } from "@/server/media/focal";

/**
 * El encuadre de una fotografía de vehículo.
 *
 * No se guarda un rectángulo de recorte, se guarda un punto focal, y no es
 * una representación distinta: con un marco de proporción FIJA las dos son
 * la misma cosa. `coverCropRect` convierte el punto en el rectángulo
 * normalizado 0..1 sobre el original, y `focalFromCropRect` vuelve. Lo que
 * se gana es que el render público no necesita ningún envoltorio con
 * transformaciones: es `object-fit: cover` más `object-position`, que es lo
 * que el navegador ya sabe hacer con cualquier resolución que Next sirva.
 *
 * Estas pruebas fijan esa equivalencia y los límites que la hacen segura.
 */

const F = VEHICLE_FRAME_RATIO;

/** Un carro apaisado de verdad: 3000 × 1500, proporción 2. */
const horizontal: Size = { width: 3000, height: 1500 };
/** Una moto vertical de teléfono: 1200 × 1600, proporción 0,75. */
const vertical: Size = { width: 1200, height: 1600 };
/** Una que ya viene en el marco: no hay nada que encuadrar. */
const exact: Size = { width: 2000, height: 1500 };

describe("el marco horizontal es único", () => {
  it("es 4:3, la proporción que ya usaban tarjeta, rejilla y teléfono", () => {
    assert.equal(VEHICLE_FRAME_RATIO, 4 / 3);
  });

  it("no ofrece un segundo marco, así que el editor no enseña selector", () => {
    assert.equal(VEHICLE_FRAMES.mobile, null);
    assert.equal(VEHICLE_FRAMES.desktop.ratio, VEHICLE_FRAME_RATIO);
  });

  it("una fotografía sin encuadre es la centrada de siempre", () => {
    assert.deepEqual(VEHICLE_DEFAULT_FOCAL, CENTER_FOCAL);
    assert.equal(objectPosition(VEHICLE_DEFAULT_FOCAL), "50% 50%");
  });
});

describe("sin encuadre guardado, el recorte es el automático de hoy", () => {
  it("una fotografía que ya está en 4:3 se ve entera", () => {
    assert.deepEqual(coverCropRect(exact, F, CENTER_FOCAL), {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("un valor imposible guardado no pega la foto contra un borde", () => {
    // Una fila escrita a mano, un NaN que se coló: el centro, no el 0.
    assert.deepEqual(normalizeFocal({ x: Number.NaN, y: null }), CENTER_FOCAL);
    assert.deepEqual(normalizeFocal(null), CENTER_FOCAL);
  });
});

describe("una fotografía horizontal dentro del marco", () => {
  it("sobra ancho, y es el ancho lo único que se puede recorrer", () => {
    const rect = coverCropRect(horizontal, F, CENTER_FOCAL);
    // 4/3 ÷ 2 = 0,666…
    assert.ok(Math.abs(rect.width - F / 2) < 1e-9);
    assert.equal(rect.height, 1);
    assert.equal(rect.y, 0);
  });

  it("izquierda, centro y derecha dan tres ventanas distintas", () => {
    const left = coverCropRect(horizontal, F, { x: 0, y: 50 });
    const middle = coverCropRect(horizontal, F, { x: 50, y: 50 });
    const right = coverCropRect(horizontal, F, { x: 100, y: 50 });

    assert.equal(left.x, 0);
    assert.ok(Math.abs(middle.x - (1 - F / 2) / 2) < 1e-9);
    assert.ok(Math.abs(right.x - (1 - F / 2)) < 1e-9);
    // Y las tres son la misma ventana, movida.
    assert.ok(Math.abs(left.width - right.width) < 1e-9);
  });
});

describe("una fotografía vertical dentro del mismo marco", () => {
  it("se encuadra en vertical sin deformarse ni ampliarse", () => {
    const rect = coverCropRect(vertical, F, CENTER_FOCAL);
    assert.equal(rect.width, 1);
    // 0,75 ÷ (4/3) = 0,5625
    assert.ok(Math.abs(rect.height - 0.5625) < 1e-9);
  });

  it("subir y bajar el encuadre elige qué franja se publica", () => {
    const top = coverCropRect(vertical, F, { x: 50, y: 0 });
    const bottom = coverCropRect(vertical, F, { x: 50, y: 100 });
    assert.equal(top.y, 0);
    assert.ok(Math.abs(bottom.y - (1 - 0.5625)) < 1e-9);
  });
});

describe("el recorte derivado es siempre válido", () => {
  const cases: { label: string; image: Size }[] = [
    { label: "horizontal", image: horizontal },
    { label: "vertical", image: vertical },
    { label: "exacta", image: exact },
    { label: "panorámica", image: { width: 4000, height: 800 } },
    { label: "tira vertical", image: { width: 600, height: 2400 } },
  ];

  for (const { label, image } of cases) {
    it(`${label}: nunca se sale de la fotografía`, () => {
      for (const x of [0, 25, 50, 75, 100]) {
        for (const y of [0, 25, 50, 75, 100]) {
          const rect = coverCropRect(image, F, { x, y });
          assert.ok(rect.x >= 0 && rect.y >= 0, `${label} ${x},${y}: origen negativo`);
          assert.ok(rect.width > 0 && rect.height > 0, `${label} ${x},${y}: vacío`);
          assert.ok(
            rect.x + rect.width <= 1 + 1e-9 && rect.y + rect.height <= 1 + 1e-9,
            `${label} ${x},${y}: se sale`,
          );
        }
      }
    });

    it(`${label}: el recorte tiene SIEMPRE la proporción canónica`, () => {
      const rect = coverCropRect(image, F, { x: 30, y: 70 });
      const ratio = (rect.width * image.width) / (rect.height * image.height);
      assert.ok(
        Math.abs(ratio - F) < 1e-9,
        `${label}: salió ${ratio} en vez de ${F}`,
      );
    });
  }
});

describe("punto focal y rectángulo son la misma información", () => {
  it("ida y vuelta devuelve el mismo encuadre", () => {
    for (const image of [horizontal, vertical]) {
      for (const focal of [
        { x: 0, y: 0 },
        { x: 20, y: 80 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ]) {
        const rect = coverCropRect(image, F, focal);
        const back = focalFromCropRect(image, F, { x: rect.x, y: rect.y }, focal);
        assert.ok(sameFocal(back, focal), `${JSON.stringify(focal)} no volvió`);
      }
    }
  });

  it("el eje sin recorrido conserva su valor en vez de perderse", () => {
    // En una vertical no sobra ancho: el eje X no se puede mover, y
    // devolver 50 borraría en silencio lo que hubiera guardado.
    const rect = coverCropRect(vertical, F, { x: 17, y: 40 });
    const back = focalFromCropRect(vertical, F, { x: rect.x, y: rect.y }, { x: 17, y: 40 });
    assert.equal(roundFocal(back).x, 17);
  });
});

describe("lo que la API acepta", () => {
  it("acepta los extremos legítimos", () => {
    assert.equal(focalSchema.safeParse({ x: 0, y: 0 }).success, true);
    assert.equal(focalSchema.safeParse({ x: 100, y: 100 }).success, true);
    assert.equal(focalSchema.safeParse({ x: 33.3, y: 66.7 }).success, true);
  });

  it("rechaza negativos", () => {
    assert.equal(focalSchema.safeParse({ x: -1, y: 50 }).success, false);
    assert.equal(focalSchema.safeParse({ x: 50, y: -0.1 }).success, false);
  });

  it("rechaza por encima del máximo", () => {
    assert.equal(focalSchema.safeParse({ x: 101, y: 50 }).success, false);
    assert.equal(focalSchema.safeParse({ x: 50, y: 100.5 }).success, false);
  });

  it("rechaza lo que no es un número aunque JavaScript diga que sí", () => {
    assert.equal(focalSchema.safeParse({ x: Number.NaN, y: 50 }).success, false);
    assert.equal(focalSchema.safeParse({ x: Number.POSITIVE_INFINITY, y: 50 }).success, false);
    assert.equal(focalSchema.safeParse({ x: "50", y: 50 }).success, false);
    assert.equal(focalSchema.safeParse({ x: null, y: 50 }).success, false);
  });

  it("exige los dos ejes: medio encuadre no es un encuadre", () => {
    assert.equal(focalSchema.safeParse({ x: 50 }).success, false);
    assert.equal(focalSchema.safeParse({}).success, false);
  });

  /**
   * No hay proporción que validar, y es el punto de todo esto: el cuerpo de
   * la petición no lleva ancho ni alto, así que no existe forma de mandar un
   * recorte con la proporción equivocada. La proporción la pone el marco del
   * sitio, no el cliente.
   */
  it("no acepta una proporción porque no la hay en el payload", () => {
    const parsed = focalSchema.safeParse({ x: 50, y: 50, width: 0.5 });
    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.success ? parsed.data : null, { x: 50, y: 50 });
  });
});
