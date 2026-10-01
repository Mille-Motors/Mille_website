import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  imageTooSmall,
  longEdge,
  readImageDimensions,
} from "@/lib/image-dimensions";

/**
 * Medir una imagen leyendo su cabecera.
 *
 * Existe por un fallo que no daba ningún error: entraban fotografías de
 * 516×387 y nada avisaba. No se pierde calidad en el camino —el objeto se
 * guarda byte a byte y Next nunca amplía por encima del original— pero un
 * máster pequeño metido en un hueco grande lo estira el navegador. La única
 * forma de arreglarlo es medirlo antes de aceptarlo.
 */

/** Un PNG mínimo y válido, construido a mano. */
function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("medir una imagen por su cabecera", () => {
  it("lee un PNG", () => {
    assert.deepEqual(readImageDimensions(png(4000, 3000)), {
      width: 4000,
      height: 3000,
    });
  });

  it("lee un JPEG real del repositorio", () => {
    const bytes = new Uint8Array(readFileSync("public/images/brand/night.jpg"));
    assert.deepEqual(readImageDimensions(bytes), { width: 1800, height: 1200 });
  });

  it("el lado largo no depende de la orientación", () => {
    assert.equal(longEdge({ width: 4000, height: 3000 }), 4000);
    assert.equal(longEdge({ width: 3000, height: 4000 }), 4000);
  });

  it("lo que no se puede medir devuelve null, no un cero", () => {
    // Cero sería "mide cero" y haría rechazar la imagen; null es "no lo sé"
    // y la deja pasar, que es lo correcto ante una cabecera rara.
    assert.equal(readImageDimensions(new Uint8Array([1, 2, 3, 4])), null);
    assert.equal(readImageDimensions(new Uint8Array(0)), null);
  });

  it("no confunde una tabla Huffman con un inicio de cuadro", () => {
    // 0xC4 está dentro del rango SOF pero es una tabla Huffman. Es el error
    // clásico de este parseo y daría dimensiones inventadas.
    const bytes = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xc4, 0x00, 0x06, 0x11, 0x22, 0x33, 0x44, // DHT con longitud 6
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20, // SOF0 600x800
      0x03, 0x01, 0x11, 0x00,
    ]);
    assert.deepEqual(readImageDimensions(bytes), { width: 800, height: 600 });
  });
});

/**
 * La regla de resolución mínima, en las DOS dimensiones.
 *
 * Mirar solo el lado largo dejaba pasar una foto de 600×1.200: cumple
 * "1.000 px de lado largo" y sigue siendo demasiado estrecha para un hueco
 * de unos 860 px de CSS, que en Retina son 1.720 reales. El ancho es la
 * restricción que manda; el alto solo existe para descartar tiras.
 */
describe("qué resolución sirve para una ficha", () => {
  const accepted = (width: number, height: number) =>
    imageTooSmall({ width, height }) === null;

  it("acepta una horizontal de móvil", () => {
    assert.ok(accepted(4032, 3024));
    assert.ok(accepted(1600, 1200));
  });

  it("acepta una vertical de móvil", () => {
    assert.ok(accepted(3024, 4032));
    assert.ok(accepted(1080, 1920));
  });

  it("acepta 4:3, 3:2 y un 16:9 razonable", () => {
    assert.ok(accepted(1600, 1200), "4:3");
    assert.ok(accepted(1800, 1200), "3:2");
    assert.ok(accepted(1920, 1080), "16:9");
    assert.ok(accepted(1280, 720), "16:9 más modesto");
  });

  it("rechaza las que motivaron la regla", () => {
    assert.ok(!accepted(516, 387));
    assert.ok(!accepted(375, 500));
  });

  it("rechaza lo estrecho aunque sea alto, que es lo que se escapaba", () => {
    // 600×1200 tiene 1.200 px de lado largo y pasaba la regla anterior.
    assert.ok(!accepted(600, 1200));
    assert.ok(!accepted(800, 2000));
  });

  it("rechaza una tira panorámica aunque sea enorme de ancho", () => {
    assert.ok(!accepted(3000, 500));
  });

  it("el motivo dice la medida real y qué hace falta", () => {
    const reason = imageTooSmall({ width: 516, height: 387 });
    assert.ok(reason);
    assert.match(reason, /516×387/);
    assert.match(reason, /1000×700/);
    assert.match(reason, /2000/);
  });
});
