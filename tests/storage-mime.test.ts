import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDeclaredType, sniffImageType } from "@/lib/image-type";

/**
 * Los bytes mágicos son la fuente de verdad sobre qué es un archivo. Lo que
 * declare el navegador es una pista, y renombrar un .exe a .jpg no cambia su
 * contenido.
 */
const bytes = (...values: number[]) => Uint8Array.from(values);
const pad = (head: number[], length = 16) =>
  Uint8Array.from([...head, ...Array(Math.max(0, length - head.length)).fill(0)]);

describe("detección por contenido", () => {
  it("reconoce JPEG", () => {
    assert.equal(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  });

  it("reconoce PNG", () => {
    assert.equal(
      sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      "image/png",
    );
  });

  it("reconoce WebP por RIFF....WEBP", () => {
    const webp = pad([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]);
    assert.equal(sniffImageType(webp), "image/webp");
  });

  it("reconoce AVIF por la caja ftyp", () => {
    const avif = pad([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
      0x61, 0x76, 0x69, 0x66,
    ]);
    assert.equal(sniffImageType(avif), "image/avif");
  });

  it("rechaza un RIFF que no es WebP (por ejemplo un WAV)", () => {
    const wav = pad([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45,
    ]);
    assert.equal(sniffImageType(wav), null);
  });

  it("rechaza contenido que no es una imagen", () => {
    assert.equal(sniffImageType(pad([0x4d, 0x5a])), null); // ejecutable
    assert.equal(sniffImageType(pad([0x25, 0x50, 0x44, 0x46])), null); // PDF
    assert.equal(sniffImageType(pad([0x3c, 0x73, 0x76, 0x67])), null); // SVG
    assert.equal(sniffImageType(bytes()), null); // vacío
  });

  it("normaliza image/jpg como sinónimo de image/jpeg", () => {
    assert.equal(normalizeDeclaredType("image/jpg"), "image/jpeg");
    assert.equal(normalizeDeclaredType("image/png"), "image/png");
    assert.equal(normalizeDeclaredType(""), "");
  });

  it("un ftyp con marca ajena no pasa por AVIF", () => {
    const mp4 = pad([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6f, 0x6d,
    ]);
    assert.equal(sniffImageType(mp4), null);
  });
});
