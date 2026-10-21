import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AUTO_BODY_TYPES, MOTO_BODY_TYPES } from "@/lib/body-types";
import { GROUND, CANVAS } from "@/components/vehicle/sketch/geometry";
import {
  CategorySketch,
  SKETCH_KEYS,
  getSketch,
  isSketchKey,
  sketchKeyFor,
} from "@/components/vehicle/sketch";

/**
 * Los bocetos de cada categoría.
 *
 * Lo que de verdad importa no es el dibujo —eso se mira— sino que no se pueda
 * volver a la situación de la que se salió: una portada con unas categorías,
 * un filtro con otras y un admin con otras. Cada carrocería de la taxonomía
 * tiene que tener su dibujo, y cada dibujo tiene que corresponder a una
 * carrocería real.
 */

const bodySlugs = [...AUTO_BODY_TYPES, ...MOTO_BODY_TYPES].map((body) => body.slug);

describe("los bocetos y la taxonomía", () => {
  it("cada carrocería de carro y de moto tiene su boceto propio", () => {
    for (const slug of bodySlugs) {
      assert.ok(isSketchKey(slug), `«${slug}» no tiene boceto`);
    }
  });

  it("y no hay bocetos huérfanos: cada uno es una carrocería de verdad", () => {
    assert.deepEqual([...SKETCH_KEYS].sort(), [...bodySlugs].sort());
  });

  it("una fila que todavía se llama «suv» o «4x4» se dibuja con la camioneta, no con el sedán", () => {
    assert.equal(sketchKeyFor("suv", "auto"), "camioneta");
    assert.equal(sketchKeyFor("4x4", "auto"), "camioneta");
    assert.equal(sketchKeyFor("camioneta", "auto"), "camioneta");
  });

  it("no hay boceto de van: MILLE no las vende", () => {
    assert.ok(!isSketchKey("van"));
    assert.equal(sketchKeyFor("van", "auto"), "sedan");
  });

  it("una categoría creada mañana se dibuja con el representante de su universo", () => {
    assert.equal(sketchKeyFor("roadster", "auto"), "sedan");
    assert.equal(sketchKeyFor("trial", "moto"), "naked");
    assert.equal(sketchKeyFor("sport", "moto"), "sport");
    // Un slug de moto no dibuja una moto en un carro, y al revés.
    assert.equal(sketchKeyFor("sport", "auto"), "sport");
  });
});

describe("cada boceto", () => {
  for (const key of SKETCH_KEYS) {
    const sketch = getSketch(key);

    it(`${key}: dos ruedas apoyadas en el suelo y dentro de la hoja`, () => {
      assert.equal(sketch.wheels.length, 2);
      for (const wheel of sketch.wheels) {
        assert.ok(Math.abs(wheel.cy + wheel.r - GROUND) < 0.01, "la rueda no toca el suelo");
        assert.ok(wheel.cx - wheel.r >= 0 && wheel.cx + wheel.r <= CANVAS.width);
        assert.ok(wheel.rim < wheel.r);
      }
    });

    it(`${key}: sus trazos son números, no NaN, y empiezan con un movimiento`, () => {
      const paths = [...sketch.body, ...sketch.glass, ...sketch.detail, ...sketch.guide];
      assert.ok(sketch.body.length > 0, "sin silueta");
      for (const d of paths) {
        assert.match(d, /^M/);
        assert.doesNotMatch(d, /NaN|Infinity|undefined/);
      }
    });

    it(`${key}: ninguna coordenada se sale de la hoja`, () => {
      // Se leen los pares de coordenadas de los trazos absolutos que emite la
      // geometría (M, L, Q) y se comprueba que caben en el lienzo.
      const paths = [...sketch.body, ...sketch.glass, ...sketch.detail, ...sketch.guide];
      for (const d of paths) {
        for (const [, x, y] of d.matchAll(/[MLQ]\s*(-?[\d.]+)[ ,](-?[\d.]+)/g)) {
          assert.ok(Number(x) >= -2 && Number(x) <= CANVAS.width + 2, `x fuera de la hoja: ${x}`);
          assert.ok(Number(y) >= -2 && Number(y) <= CANVAS.height + 2, `y fuera de la hoja: ${y}`);
        }
      }
    });
  }
});

describe("cómo se pinta un boceto", () => {
  const html = (variant?: "plate" | "mark") =>
    renderToStaticMarkup(
      createElement(CategorySketch, { slug: "sedan", vehicleType: "auto", variant }),
    );

  it("son líneas: sin relleno y con el color de quien lo pone", () => {
    const svg = html();
    assert.match(svg, /aria-hidden="true"/);
    assert.match(svg, /stroke="currentColor"/);
    assert.doesNotMatch(svg, /fill="(?!none)/, "ningún trazo lleva relleno");
    // Ningún color escrito a mano: lo decide la superficie.
    assert.doesNotMatch(svg, /#[0-9a-fA-F]{3,6}|rgb\(/);
  });

  it("la lámina lleva las líneas de construcción; la marca pequeña no", () => {
    assert.match(html("plate"), /stroke-dasharray/);
    assert.doesNotMatch(html("mark"), /stroke-dasharray/);
  });

  it("el trazo mide lo mismo a cualquier tamaño", () => {
    assert.match(html(), /vector-effect="non-scaling-stroke"/);
  });

  it("lo que pasa por detrás de una pieza se tapa, y dos bocetos no comparten máscara", () => {
    const two = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(CategorySketch, { slug: "touring", vehicleType: "moto" }),
        createElement(CategorySketch, { slug: "touring", vehicleType: "moto" }),
      ),
    );
    const ids = [...two.matchAll(/<mask id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
    // Cada máscara la usa su propio dibujo.
    for (const id of ids) assert.ok(two.includes(`url(#${id})`));
  });

  it("un boceto sin piezas que tapen no lleva máscara", () => {
    assert.doesNotMatch(html(), /<mask/);
  });
});
