import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CENTER_FOCAL,
  clampFocalAxis,
  coverOverflow,
  focalAfterDrag,
  focalAfterKey,
  normalizeFocal,
  objectPosition,
  roundFocal,
  sameFocal,
} from "@/lib/focal-point";
import { SITE_MEDIA_SLOTS } from "@/lib/site-media";
import {
  focalSchema,
  siteMediaPatchSchema,
} from "@/server/site-media/schemas";

/**
 * El encuadre decide qué parte de una fotografía ve el visitante. Un valor
 * ilegible no puede dejar la portada en blanco: siempre hay que poder caer al
 * centro, que es como se veía el sitio antes de que esto existiera.
 */
describe("límites del encuadre", () => {
  it("recorta a 0–100 en vez de aceptar cualquier número", () => {
    assert.equal(clampFocalAxis(-40), 0);
    assert.equal(clampFocalAxis(180), 100);
    assert.equal(clampFocalAxis(37.5), 37.5);
  });

  it("los extremos son válidos, no errores", () => {
    assert.equal(clampFocalAxis(0), 0);
    assert.equal(clampFocalAxis(100), 100);
  });

  it("lo que no es un número cae al centro", () => {
    assert.equal(clampFocalAxis(Number.NaN), 50);
    assert.equal(clampFocalAxis(Number.POSITIVE_INFINITY), 50);
    assert.equal(clampFocalAxis(null), 50);
    assert.equal(clampFocalAxis(undefined), 50);
    assert.equal(clampFocalAxis("no soy un número"), 50);
  });

  it("una fila sin encuadre se comporta como centrada", () => {
    assert.deepEqual(normalizeFocal(null), CENTER_FOCAL);
    assert.deepEqual(normalizeFocal(undefined), CENTER_FOCAL);
    assert.deepEqual(normalizeFocal({}), CENTER_FOCAL);
  });

  it("se serializa tal como lo entiende CSS", () => {
    assert.equal(objectPosition(CENTER_FOCAL), "50% 50%");
    assert.equal(objectPosition({ x: 0, y: 100 }), "0% 100%");
  });
});

/**
 * `cover` escala hasta cubrir el marco, así que sobra en un eje y en el otro
 * no. Lo que sobra es exactamente el recorrido del encuadre.
 */
describe("sobrante del recorte", () => {
  it("una foto apaisada en un marco cuadrado solo se mueve en horizontal", () => {
    const overflow = coverOverflow(
      { width: 400, height: 400 },
      { width: 800, height: 400 },
    );
    assert.equal(overflow.y, 0);
    assert.equal(overflow.x, 400);
  });

  it("una foto vertical en un marco apaisado solo se mueve en vertical", () => {
    const overflow = coverOverflow(
      { width: 800, height: 400 },
      { width: 400, height: 800 },
    );
    assert.equal(overflow.x, 0);
    assert.equal(overflow.y, 1200);
  });

  it("si la proporción coincide no hay nada que recorrer", () => {
    const overflow = coverOverflow(
      { width: 400, height: 300 },
      { width: 800, height: 600 },
    );
    assert.deepEqual(overflow, { x: 0, y: 0 });
  });

  it("un marco todavía sin medir no rompe la cuenta", () => {
    assert.deepEqual(
      coverOverflow({ width: 0, height: 0 }, { width: 800, height: 600 }),
      { x: 0, y: 0 },
    );
  });
});

/**
 * El signo del arrastre es lo que separa un editor que se siente natural de
 * uno que parece tener los controles invertidos.
 */
describe("arrastre", () => {
  const overflow = { x: 400, y: 200 };

  it("arrastrar la foto a la derecha muestra su lado izquierdo", () => {
    // Mover 100 px sobre un sobrante de 400 px es un cuarto del recorrido.
    const next = focalAfterDrag(CENTER_FOCAL, { dx: 100, dy: 0 }, overflow);
    assert.equal(next.x, 25);
    assert.equal(next.y, 50);
  });

  it("arrastrar hacia arriba muestra la parte de abajo", () => {
    const next = focalAfterDrag(CENTER_FOCAL, { dx: 0, dy: -50 }, overflow);
    assert.equal(next.y, 75);
  });

  it("no se sale de la fotografía por mucho que se arrastre", () => {
    const far = focalAfterDrag(CENTER_FOCAL, { dx: 9999, dy: -9999 }, overflow);
    assert.deepEqual(far, { x: 0, y: 100 });
  });

  it("un eje sin sobrante no se mueve", () => {
    const next = focalAfterDrag(
      { x: 30, y: 70 },
      { dx: 200, dy: 200 },
      { x: 0, y: 0 },
    );
    assert.deepEqual(next, { x: 30, y: 70 });
  });

  it("el mismo gesto recorre lo mismo en marcos de distinto tamaño", () => {
    // 10 % del sobrante, sea cual sea el sobrante.
    const chico = focalAfterDrag(CENTER_FOCAL, { dx: 20, dy: 0 }, { x: 200, y: 0 });
    const grande = focalAfterDrag(CENTER_FOCAL, { dx: 80, dy: 0 }, { x: 800, y: 0 });
    assert.equal(chico.x, grande.x);
  });
});

describe("teclado", () => {
  it("las flechas empujan la foto en el mismo sentido que el dedo", () => {
    assert.equal(focalAfterKey(CENTER_FOCAL, "ArrowRight")?.x, 48);
    assert.equal(focalAfterKey(CENTER_FOCAL, "ArrowLeft")?.x, 52);
    assert.equal(focalAfterKey(CENTER_FOCAL, "ArrowUp")?.y, 52);
    assert.equal(focalAfterKey(CENTER_FOCAL, "ArrowDown")?.y, 48);
  });

  it("Shift avanza más rápido", () => {
    assert.equal(focalAfterKey(CENTER_FOCAL, "ArrowRight", true)?.x, 40);
  });

  it("tampoco se sale por teclado", () => {
    assert.equal(focalAfterKey({ x: 1, y: 50 }, "ArrowRight", true)?.x, 0);
    assert.equal(focalAfterKey({ x: 99, y: 50 }, "ArrowLeft", true)?.x, 100);
  });

  it("cualquier otra tecla no es asunto suyo", () => {
    assert.equal(focalAfterKey(CENTER_FOCAL, "Enter"), null);
    assert.equal(focalAfterKey(CENTER_FOCAL, "a"), null);
  });
});

describe("persistencia", () => {
  it("se guarda con un decimal, que es de sobra", () => {
    assert.deepEqual(roundFocal({ x: 42.183, y: 61.927 }), { x: 42.2, y: 61.9 });
  });

  it("medio píxel de arrastre no deja el botón de guardar encendido", () => {
    assert.ok(sameFocal({ x: 50.01, y: 49.99 }, CENTER_FOCAL));
    assert.ok(!sameFocal({ x: 51, y: 50 }, CENTER_FOCAL));
  });

  it("el endpoint acepta un encuadre válido, extremos incluidos", () => {
    assert.deepEqual(focalSchema.parse({ x: 0, y: 100 }), { x: 0, y: 100 });
    assert.deepEqual(focalSchema.parse({ x: 33.3, y: 12 }), { x: 33.3, y: 12 });
  });

  it("el endpoint rechaza lo que no es un porcentaje", () => {
    assert.throws(() => focalSchema.parse({ x: Number.NaN, y: 50 }));
    assert.throws(() => focalSchema.parse({ x: Number.POSITIVE_INFINITY, y: 50 }));
    assert.throws(() => focalSchema.parse({ x: -1, y: 50 }));
    assert.throws(() => focalSchema.parse({ x: 101, y: 50 }));
    assert.throws(() => focalSchema.parse({ x: "50", y: 50 }));
    assert.throws(() => focalSchema.parse({ x: 50 }));
  });

  it("se puede guardar solo el encuadre, solo el texto, o ambos", () => {
    assert.deepEqual(siteMediaPatchSchema.parse({ focal: { x: 10, y: 90 } }).focal, {
      x: 10,
      y: 90,
    });
    assert.equal(siteMediaPatchSchema.parse({ alt: "Una fotografía" }).alt, "Una fotografía");
    const both = siteMediaPatchSchema.parse({
      alt: "Una fotografía",
      focal: { x: 1, y: 2 },
    });
    assert.equal(both.alt, "Una fotografía");
    assert.deepEqual(both.focal, { x: 1, y: 2 });
  });

  it("un cuerpo vacío no cuenta como una edición", () => {
    assert.throws(() => siteMediaPatchSchema.parse({}));
  });
});

/**
 * El marco del admin tiene que ser el de la página. Si alguien cambia el
 * layout público y olvida estos números, al menos que no queden absurdos.
 */
describe("marcos de los slots", () => {
  it("cada slot declara su marco de escritorio y de teléfono", () => {
    for (const slot of SITE_MEDIA_SLOTS) {
      for (const view of ["desktop", "mobile"] as const) {
        const frame = slot.frames[view];
        assert.ok(frame.label.length > 0, `${slot.key} ${view}`);
        assert.ok(
          Number.isFinite(frame.ratio) && frame.ratio > 0.4 && frame.ratio < 3,
          `${slot.key} ${view}: proporción fuera de lo plausible`,
        );
      }
    }
  });

  it("el manifiesto es el que más cambia entre escritorio y teléfono", () => {
    // Es el único sin aspect-ratio en móvil: pasa de apaisado a casi
    // cuadrado, y por eso el editor necesita enseñar las dos vistas.
    const house = SITE_MEDIA_SLOTS.find((slot) => slot.key === "home.about.house");
    assert.ok(house);
    assert.ok(house.frames.desktop.ratio > 1.1);
    assert.ok(house.frames.mobile.ratio < 1.05);
  });
});
