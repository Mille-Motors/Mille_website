import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OG_IMAGE, SITE_ORIGIN, socialMetadata } from "@/lib/seo";
import {
  NAV_MEDIA_BY_HREF,
  getSlot,
  legacyImage,
  SITE_MEDIA_SLOTS,
} from "@/lib/site-media";
import { mainNav } from "@/data/site";

/**
 * La imagen con la que se comparte un enlace del sitio.
 *
 * Era la misma fotografía que usaban la portada de Contacto, la 404 y el
 * menú, así que cambiar cualquiera cambiaba las cuatro. Ahora tiene su
 * propio espacio, y estas pruebas fijan lo que un rastreador necesita
 * encontrar.
 */
const og = getSlot("seo.defaultOg")!;
const frame = og.frames.desktop;

describe("la composición de compartir", () => {
  it("es 1.200 × 630, y no pide más", () => {
    // 1.200 × 630 es lo que leen los rastreadores; más resolución no mejora
    // una previsualización. Recomendado y mínimo coinciden a propósito para
    // no hacer creer que hace falta el doble.
    assert.deepEqual(frame.recommended, { width: 1200, height: 630 });
    assert.deepEqual(frame.minimum, { width: 1200, height: 630 });
  });

  it("su proporción sale de esos mismos números", () => {
    assert.equal(frame.ratio, 1200 / 630);
    // ≈ 1,905, que es el 1.91:1 de la documentación de Open Graph.
    assert.ok(Math.abs(frame.ratio - 1.91) < 0.01);
  });

  it("solo acepta JPG y PNG", () => {
    // Una previsualización la reencoda un rastreador ajeno: no es sitio para
    // formatos que alguno no entienda.
    assert.deepEqual(og.acceptedTypes, ["image/jpeg", "image/png"]);
    assert.ok(!og.acceptedTypes!.includes("image/webp"));
    assert.ok(!og.acceptedTypes!.includes("image/avif"));
  });

  it("es el único espacio con la lista recortada", () => {
    const restricted = SITE_MEDIA_SLOTS.filter((slot) => slot.acceptedTypes);
    assert.deepEqual(
      restricted.map((slot) => slot.key),
      ["seo.defaultOg"],
    );
  });
});

describe("el respaldo describe el archivo de verdad", () => {
  it("declara las medidas reales, no las que nos gustaría", () => {
    // El archivo es 1.800 × 1.200, que NO es 1.91:1. Declarar 1200 × 630
    // haría que un rastreador que se fía de la metadata dibujara la
    // previsualización mal.
    assert.equal(OG_IMAGE.width, 1800);
    assert.equal(OG_IMAGE.height, 1200);
    assert.equal(OG_IMAGE.type, "image/jpeg");
  });

  it("el respaldo del espacio trae su medida, para poder declararla", () => {
    const fallback = legacyImage(og);
    assert.deepEqual(fallback.desktop.size, { width: 1800, height: 1200 });
    assert.equal(fallback.desktop.size!.width, OG_IMAGE.width);
  });

  it("la URL del respaldo es absoluta y del sitio", () => {
    assert.ok(OG_IMAGE.url.startsWith(`${SITE_ORIGIN}/`));
    assert.ok(OG_IMAGE.url.startsWith("https://"));
  });

  it("ningún otro espacio declara medida de respaldo, porque nadie la lee", () => {
    const withSize = SITE_MEDIA_SLOTS.filter((slot) => slot.legacySize);
    assert.deepEqual(
      withSize.map((slot) => slot.key),
      ["seo.defaultOg"],
    );
  });
});

describe("la metadata que se emite", () => {
  const image = {
    url: "https://cdn.ejemplo.invalido/og.jpg",
    width: 1200,
    height: 630,
    type: "image/jpeg",
    alt: "MILLE",
  };
  const meta = socialMetadata({
    title: "MILLE",
    description: "Una descripción.",
    path: "/",
    images: [image],
  });

  it("usa la imagen que se le pasa, no una constante", () => {
    assert.deepEqual(meta.openGraph?.images, [image]);
  });

  it("propaga ancho, alto y tipo", () => {
    const [first] = meta.openGraph?.images as typeof image[];
    assert.equal(first.width, 1200);
    assert.equal(first.height, 630);
    assert.equal(first.type, "image/jpeg");
  });

  it("la tarjeta de Twitter sigue siendo la grande", () => {
    // El tipo `Twitter` de Next es una unión y solo una de sus ramas lleva
    // `card`; se estrecha antes de leerla.
    const twitter = meta.twitter as { card?: string; images?: string[] };
    assert.equal(twitter.card, "summary_large_image");
    assert.deepEqual(twitter.images, [image.url]);
  });

  it("sin imagen explícita cae al respaldo", () => {
    const bare = socialMetadata({ title: "x", description: "y", path: "/" });
    assert.deepEqual(bare.openGraph?.images, [OG_IMAGE]);
  });
});

/**
 * El menú tenía sus cinco rutas escritas a mano en el componente y cuatro de
 * ellas compartían archivo con otro espacio. Esto fija que cada enlace
 * tenga su propio espacio y que la correspondencia esté completa.
 */
describe("el menú y sus espacios", () => {
  it("cada enlace del menú tiene su fotografía", () => {
    for (const item of mainNav) {
      const key = NAV_MEDIA_BY_HREF[item.href];
      assert.ok(key, `${item.href} sin espacio asignado`);
      assert.ok(getSlot(key), `${key} no está en el registro`);
    }
  });

  it("/contacto apunta a nav.contact, no a contact.hero", () => {
    assert.equal(NAV_MEDIA_BY_HREF["/contacto"], "nav.contact");
    assert.notEqual(NAV_MEDIA_BY_HREF["/contacto"], "contact.hero");
  });

  it("no hay correspondencias de más", () => {
    assert.equal(
      Object.keys(NAV_MEDIA_BY_HREF).length,
      mainNav.length,
      "sobra o falta una ruta",
    );
  });

  it("los cinco espacios del menú son verticales", () => {
    for (const key of Object.values(NAV_MEDIA_BY_HREF)) {
      const slot = getSlot(key)!;
      assert.ok(slot.frames.desktop.ratio < 1, `${key} no es vertical`);
      assert.equal(slot.frames.mobile, null, `${key}: el menú no se ve en teléfono`);
    }
  });

  it("cuatro arrancan con el archivo de otro espacio y siguen siendo otra fila", () => {
    const pairs: [string, string][] = [
      ["nav.contact", "contact.hero"],
      ["nav.mille", "home.hero"],
      ["nav.sell", "home.about.origin"],
      ["nav.culture", "home.about.future"],
    ];
    for (const [nav, page] of pairs) {
      const a = getSlot(nav)!;
      const b = getSlot(page)!;
      assert.equal(a.legacySrc, b.legacySrc, `${nav} y ${page} deberían compartir respaldo`);
      assert.notEqual(a.key, b.key);
    }
  });
});
