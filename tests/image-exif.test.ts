import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { imageTooSmall, readImageDimensions } from "@/lib/image-dimensions";
import { frameQuality, vehicleQuality } from "@/lib/image-quality";
import { getSlot } from "@/lib/site-media";

/**
 * Orientación EXIF.
 *
 * Un teléfono guarda casi siempre el sensor en horizontal —4032 × 3024— y
 * anota "gírala un cuarto de vuelta". El navegador obedece y enseña
 * 3024 × 4032; el servidor leía los números crudos y validaba contra una
 * fotografía que nadie llega a ver.
 *
 * Las muestras se construyen byte a byte: lo que hay que fijar es el
 * parseo, y un JPEG de verdad metería 4 MB en el repositorio para
 * comprobar un entero de dos bytes.
 */

/** Un APP1 con un bloque EXIF que solo lleva la etiqueta Orientation. */
function exifSegment(orientation: number, little = true): number[] {
  const u16 = (value: number) =>
    little ? [value & 0xff, value >> 8] : [value >> 8, value & 0xff];
  const u32 = (value: number) =>
    little
      ? [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, value >>> 24]
      : [value >>> 24, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];

  const tiff = [
    ...(little ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(0x002a),
    ...u32(8), // la IFD0 empieza justo detrás del encabezado TIFF
    ...u16(1), // una sola entrada
    ...u16(0x0112), // Orientation
    ...u16(3), // tipo SHORT
    ...u32(1), // un valor
    ...u16(orientation),
    0x00,
    0x00, // el campo de valor son 4 bytes; el SHORT ocupa los dos primeros
    ...u32(0), // no hay IFD siguiente
  ];

  const body = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const length = body.length + 2;
  return [0xff, 0xe1, length >> 8, length & 0xff, ...body];
}

/** Un JPEG mínimo: inicio, el APP1 que se le pase y un SOF0 con la medida. */
function jpeg(
  width: number,
  height: number,
  segments: number[] = [],
): Uint8Array {
  const sof = [
    0xff,
    0xc0,
    0x00,
    0x11, // longitud
    0x08, // precisión
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03, // tres componentes
    ...[1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0],
  ];
  // Diez bytes de cola: el recorrido exige margen por delante del cursor.
  return new Uint8Array([0xff, 0xd8, ...segments, ...sof, ...Array(12).fill(0)]);
}

const PHONE = { raw: [4032, 3024] as const, visual: [3024, 4032] as const };

describe("un JPEG sin EXIF se mide como siempre", () => {
  it("sin ningún segmento APP1", () => {
    assert.deepEqual(readImageDimensions(jpeg(4032, 3024)), {
      width: 4032,
      height: 3024,
    });
  });

  it("con un APP1 que no es EXIF", () => {
    // Un JFIF cualquiera: se recorre y se ignora.
    const jfif = [0xff, 0xe1, 0x00, 0x08, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x00];
    assert.deepEqual(readImageDimensions(jpeg(1600, 1200, jfif)), {
      width: 1600,
      height: 1200,
    });
  });
});

describe("las orientaciones que NO giran la fotografía", () => {
  for (const orientation of [1, 2, 3, 4]) {
    it(`orientación ${orientation} conserva ancho y alto`, () => {
      const read = readImageDimensions(
        jpeg(PHONE.raw[0], PHONE.raw[1], exifSegment(orientation)),
      );
      assert.deepEqual(read, { width: PHONE.raw[0], height: PHONE.raw[1] });
    });
  }
});

describe("las orientaciones que SÍ la giran un cuarto de vuelta", () => {
  for (const orientation of [5, 6, 7, 8]) {
    it(`orientación ${orientation} intercambia ancho y alto`, () => {
      const read = readImageDimensions(
        jpeg(PHONE.raw[0], PHONE.raw[1], exifSegment(orientation)),
      );
      assert.deepEqual(read, {
        width: PHONE.visual[0],
        height: PHONE.visual[1],
      });
    });
  }

  it("funciona con los dos órdenes de bytes del encabezado TIFF", () => {
    for (const little of [true, false]) {
      assert.deepEqual(
        readImageDimensions(jpeg(4032, 3024, exifSegment(6, little))),
        { width: 3024, height: 4032 },
        little ? "Intel" : "Motorola",
      );
    }
  });
});

describe("metadata rota no tumba la lectura", () => {
  const broken: { label: string; segment: number[] }[] = [
    {
      label: "orden de bytes desconocido",
      segment: exifSegment(6).map((byte, at) => (at === 10 ? 0x58 : byte)),
    },
    {
      label: "sin la marca 0x2A del TIFF",
      segment: exifSegment(6).map((byte, at) => (at === 12 ? 0x99 : byte)),
    },
    {
      label: "un valor de orientación fuera del 1–8",
      segment: exifSegment(1).map((byte, at) => (at === 30 ? 0x63 : byte)),
    },
    {
      label: "un bloque EXIF truncado a la mitad",
      segment: (() => {
        const full = exifSegment(6);
        const cut = full.slice(0, 14);
        const length = cut.length - 2;
        return [cut[0], cut[1], length >> 8, length & 0xff, ...cut.slice(4)];
      })(),
    },
    {
      label: "solo el encabezado Exif, sin TIFF",
      segment: [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00],
    },
  ];

  for (const { label, segment } of broken) {
    it(`${label}: se usan los números crudos`, () => {
      // Nunca una excepción y nunca `null` por culpa de la metadata: una
      // fotografía válida no puede caerse porque su EXIF esté mal escrito.
      let read: ReturnType<typeof readImageDimensions> = null;
      assert.doesNotThrow(() => {
        read = readImageDimensions(jpeg(1600, 1200, segment));
      });
      assert.deepEqual(read, { width: 1600, height: 1200 }, label);
    });
  }
});

describe("los demás formatos no cambian", () => {
  it("PNG se sigue midiendo por su cabecera", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    // IHDR: ancho y alto en big endian a partir del byte 16.
    png.set([0, 0, 0x06, 0x40], 16); // 1600
    png.set([0, 0, 0x04, 0xb0], 20); // 1200
    assert.deepEqual(readImageDimensions(png), { width: 1600, height: 1200 });
  });

  it("WebP se sigue midiendo por su cabecera", () => {
    const webp = new Uint8Array(30);
    const ascii = (text: string, at: number) =>
      webp.set([...text].map((c) => c.charCodeAt(0)), at);
    ascii("RIFF", 0);
    ascii("WEBP", 8);
    ascii("VP8X", 12);
    // Ancho y alto menos uno, en 24 bits little endian.
    webp.set([0x3f, 0x06, 0x00], 24); // 1599 + 1
    webp.set([0xaf, 0x04, 0x00], 27); // 1199 + 1
    assert.deepEqual(readImageDimensions(webp), { width: 1600, height: 1200 });
  });
});

/**
 * El punto de todo esto: la corrección tiene que llegar a las validaciones
 * sin que ninguna de ellas sepa que EXIF existe. Todas leen de
 * `readImageDimensions`, así que basta con que esa función diga la verdad.
 */
describe("la validación cambia de resultado, que es lo que importa", () => {
  const raw = [1600, 1200] as const;

  it("la misma foto, girada, se mide como vertical", () => {
    assert.deepEqual(readImageDimensions(jpeg(...raw, exifSegment(6))), {
      width: 1200,
      height: 1600,
    });
  });

  it("un espacio horizontal la juzga por lo que se ve, no por el archivo", () => {
    const frame = getSlot("home.featured.a")!.frames.desktop; // 4:3
    const flat = frameQuality({ width: 1600, height: 1200 }, frame);
    const turned = frameQuality({ width: 1200, height: 1600 }, frame);

    // Horizontal cumple el mínimo del slot; girada, no: en 4:3 solo quedan
    // 1200 × 900 útiles.
    assert.notEqual(flat.level, "below");
    assert.equal(turned.level, "below");
    assert.deepEqual(turned.effective, { width: 1200, height: 900 });
  });

  it("el mínimo duro de una ficha se evalúa sobre lo visual", () => {
    // 1200 × 800 girada son 800 × 1200: por debajo de los 1000 de ancho.
    const turned = readImageDimensions(jpeg(1200, 800, exifSegment(8)))!;
    assert.deepEqual(turned, { width: 800, height: 1200 });
    assert.ok(imageTooSmall(turned));
    assert.equal(vehicleQuality(turned).level, "below");

    // Sin girar, la misma foto entra.
    const flat = readImageDimensions(jpeg(1200, 800))!;
    assert.equal(imageTooSmall(flat), null);
  });

  it("una vertical de teléfono puntúa por su lado largo real", () => {
    const turned = readImageDimensions(
      jpeg(PHONE.raw[0], PHONE.raw[1], exifSegment(6)),
    )!;
    // 3024 × 4032 en 4:3 deja 3024 × 2268: recomendada.
    assert.equal(vehicleQuality(turned).label, "Recomendada");
  });
});
