import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  effectiveSize,
  formatBytes,
  formatSize,
  frameQuality,
  survivingFraction,
  vehicleQuality,
} from "@/lib/image-quality";
import { SITE_MEDIA_SLOTS, getSlot, type SiteMediaFrame } from "@/lib/site-media";

/**
 * Si una fotografía da de sí para el hueco donde va.
 *
 * El dato que importa no es cuánto mide el archivo sino cuánto queda después
 * del recorte: contar solo el ancho diría «excelente» de una panorámica que
 * se va a ver blanda en un marco 4:3.
 */
const frame = (key: string): SiteMediaFrame => getSlot(key)!.frames.desktop;

describe("qué sobrevive al recorte", () => {
  it("de una panorámica en 4:3 manda el alto", () => {
    // 6000 × 1500 en 4:3 → el alto limita: 1500 × 4/3 = 2000 de ancho.
    assert.deepEqual(effectiveSize({ width: 6000, height: 1500 }, 4 / 3), {
      width: 2000,
      height: 1500,
    });
  });

  it("de una vertical en 4:3 manda el ancho", () => {
    assert.deepEqual(effectiveSize({ width: 3024, height: 4032 }, 4 / 3), {
      width: 3024,
      height: 2268,
    });
  });

  it("si ya encaja, no se pierde nada", () => {
    const size = { width: 2048, height: 1536 };
    assert.deepEqual(effectiveSize(size, 4 / 3), size);
    assert.equal(survivingFraction(size, 4 / 3), 1);
  });

  it("nunca amplía: el recorte solo puede quitar", () => {
    for (const ratio of [0.56, 0.76, 4 / 5, 1, 4 / 3, 1.6, 1.95]) {
      const source = { width: 2000, height: 1200 };
      const kept = effectiveSize(source, ratio);
      assert.ok(kept.width <= source.width, `ancho con ${ratio}`);
      assert.ok(kept.height <= source.height, `alto con ${ratio}`);
    }
  });

  it("una medida imposible no revienta", () => {
    assert.deepEqual(effectiveSize({ width: 0, height: 0 }, 4 / 3), {
      width: 0,
      height: 0,
    });
    assert.deepEqual(effectiveSize({ width: 100, height: 100 }, 0), {
      width: 0,
      height: 0,
    });
  });
});

describe("el veredicto de un espacio del sitio", () => {
  const hero = frame("home.hero"); // 1.6 · rec 3200×2000 · mín 2400×1500

  it("por encima de lo recomendado con margen, excelente", () => {
    assert.equal(frameQuality({ width: 4280, height: 2675 }, hero).level, "excellent");
  });

  it("justo lo recomendado, recomendada", () => {
    assert.equal(frameQuality({ width: 3200, height: 2000 }, hero).level, "recommended");
  });

  it("entre el mínimo y lo recomendado hay dos escalones", () => {
    // A mitad de camino se considera aceptable; más cerca del mínimo, baja.
    assert.equal(frameQuality({ width: 2800, height: 1750 }, hero).level, "acceptable");
    assert.equal(frameQuality({ width: 2450, height: 1532 }, hero).level, "low");
  });

  it("por debajo del mínimo se dice sin rodeos", () => {
    const verdict = frameQuality({ width: 1800, height: 1125 }, hero);
    assert.equal(verdict.level, "below");
    assert.equal(verdict.label, "Por debajo del mínimo");
  });

  it("mide lo que queda, no lo que trae el archivo", () => {
    // 4000 de ancho suena de sobra, pero en 1.6 solo quedan 1600 útiles
    // porque el alto es de 1000.
    const verdict = frameQuality({ width: 4000, height: 1000 }, hero);
    assert.deepEqual(verdict.effective, { width: 1600, height: 1000 });
    assert.equal(verdict.level, "below");
  });

  it("avisa cuando el recorte se come la fotografía", () => {
    // Una vertical de teléfono en el marco 1.95 de «Vende con MILLE».
    const house = getSlot("home.about.house")!.frames.desktop;
    assert.equal(
      frameQuality({ width: 3024, height: 4032 }, house).aggressiveCrop,
      true,
    );
    // Y no avisa cuando el recorte es un ajuste.
    assert.equal(
      frameQuality({ width: 3200, height: 1700 }, house).aggressiveCrop,
      false,
    );
  });
});

describe("la escalera de las fotos de vehículo", () => {
  const level = (width: number, height: number) =>
    vehicleQuality({ width, height }).label;

  it("reconoce cada escalón declarado", () => {
    assert.equal(level(4000, 3000), "Excelente");
    assert.equal(level(3000, 2250), "Recomendada");
    assert.equal(level(2400, 1800), "Buena");
    assert.equal(level(1920, 1440), "Aceptable");
    assert.equal(level(1280, 960), "Resolución baja");
    assert.equal(level(1000, 750), "Mínimo permitido");
  });

  it("por debajo del mínimo duro, rechazada", () => {
    assert.equal(vehicleQuality({ width: 516, height: 387 }).level, "below");
    assert.equal(vehicleQuality({ width: 1200, height: 600 }).level, "below");
  });

  it("una vertical de teléfono entra por lo que le queda, no por su ancho", () => {
    // 3024 × 4032 deja 3024 × 2268 en 4:3: recomendada, no excelente.
    assert.equal(level(3024, 4032), "Recomendada");
  });

  it("el mínimo duro sigue siendo el de siempre", () => {
    assert.equal(vehicleQuality({ width: 1000, height: 700 }).level !== "below", true);
    assert.equal(vehicleQuality({ width: 999, height: 700 }).level, "below");
    assert.equal(vehicleQuality({ width: 1000, height: 699 }).level, "below");
  });
});

describe("todos los espacios tienen un veredicto coherente", () => {
  it("su propia recomendación puntúa al menos como recomendada", () => {
    for (const slot of SITE_MEDIA_SLOTS) {
      for (const each of [slot.frames.desktop, slot.frames.mobile]) {
        if (!each) continue;
        const verdict = frameQuality(each.recommended, each);
        assert.ok(
          verdict.level === "recommended" || verdict.level === "excellent",
          `${slot.key}: su recomendación salió ${verdict.level}`,
        );
      }
    }
  });

  it("su propio mínimo nunca cae por debajo del mínimo", () => {
    for (const slot of SITE_MEDIA_SLOTS) {
      for (const each of [slot.frames.desktop, slot.frames.mobile]) {
        if (!each) continue;
        assert.notEqual(
          frameQuality(each.minimum, each).level,
          "below",
          `${slot.key}: su mínimo se rechaza a sí mismo`,
        );
      }
    }
  });
});

describe("cómo se escriben los números", () => {
  it("las medidas llevan separador de miles", () => {
    assert.equal(formatSize({ width: 2400, height: 1800 }), "2.400 × 1.800 px");
  });

  it("el peso se lee en la unidad que toca", () => {
    assert.equal(formatBytes(900), "900 B");
    assert.match(formatBytes(500 * 1024), /kB$/);
    assert.match(formatBytes(7_800_000), /MB$/);
  });
});
