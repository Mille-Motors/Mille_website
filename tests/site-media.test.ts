import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NOT_FOUND_PATH,
  NOT_FOUND_SURFACE,
  SITE_MEDIA_SLOTS,
  getSlot,
  isKnownSlot,
  legacyImage,
  revalidationTargetsFor,
  siteMediaSurfaces,
} from "@/lib/site-media";
import {
  siteMediaAltSchema,
  siteMediaKeySchema,
  siteMediaPatchSchema,
} from "@/server/site-media/schemas";

/**
 * Los slots son una lista cerrada definida en el código. Aceptar claves
 * arbitrarias convertiría la tabla en un CMS improvisado y permitiría
 * escribir filas que ninguna página lee.
 */
describe("registro de slots", () => {
  it("son exactamente los catorce documentados", () => {
    assert.deepEqual(
      SITE_MEDIA_SLOTS.map((slot) => slot.key),
      [
        "home.hero",
        "home.featured.a",
        "home.featured.b",
        "home.about.origin",
        "home.about.house",
        "home.about.future",
        "contact.hero",
        "error.404",
        // El menú dejó de depender de los assets de otros espacios.
        "nav.vehicles",
        "nav.mille",
        "nav.sell",
        "nav.culture",
        "nav.contact",
        // Y compartir un enlace dejó de depender de la foto de contacto.
        "seo.defaultOg",
      ],
    );
  });

  it("la fotografía de contacto cae a la original del repositorio", () => {
    const contact = getSlot("contact.hero");
    assert.ok(contact);
    assert.equal(contact.legacySrc, "/images/brand/night.jpg");
    assert.equal(contact.legacyAlt, "Vehículo de MILLE fotografiado de noche");
    assert.deepEqual(legacyImage(contact).desktop.focal, { x: 50, y: 50 });
  });

  it("cada slot trae su imagen de respaldo y su texto", () => {
    for (const slot of SITE_MEDIA_SLOTS) {
      assert.ok(slot.legacySrc.startsWith("/images/"), slot.key);
      assert.ok(slot.legacyAlt.length > 10, slot.key);
      assert.ok(slot.label.length > 0, slot.key);
      assert.ok(slot.description.length > 0, slot.key);
    }
  });

  it("el respaldo apunta a la imagen original y se marca como heredada", () => {
    const hero = getSlot("home.hero")!;
    const image = legacyImage(hero);
    assert.equal(image.desktop.src, "/images/brand/hero.jpg");
    assert.equal(image.desktop.source, "legacy");
    assert.equal(image.alt, hero.legacyAlt);
    // Sin variante propia, pero con su encuadre vertical listo.
    assert.equal(image.mobile, null);
    assert.deepEqual(image.mobileFocal, { x: 50, y: 50 });
  });

  it("reconoce los slots conocidos y solo esos", () => {
    assert.equal(isKnownSlot("home.hero"), true);
    assert.equal(isKnownSlot("home.inventado"), false);
    assert.equal(isKnownSlot(""), false);
    assert.equal(getSlot("no.existe"), undefined);
  });
});

describe("validación del endpoint", () => {
  it("acepta una clave conocida", () => {
    assert.equal(siteMediaKeySchema.parse("home.hero"), "home.hero");
  });

  it("rechaza una clave que no está en el registro", () => {
    assert.throws(() => siteMediaKeySchema.parse("home.inventado"));
    assert.throws(() => siteMediaKeySchema.parse("../../etc/passwd"));
    assert.throws(() => siteMediaKeySchema.parse(""));
  });

  it("exige un texto alternativo con algo dentro", () => {
    assert.equal(siteMediaAltSchema.parse("  Un BMW rojo  "), "Un BMW rojo");
    assert.throws(() => siteMediaAltSchema.parse(""));
    assert.throws(() => siteMediaAltSchema.parse("ab"));
    assert.throws(() => siteMediaAltSchema.parse("x".repeat(400)));
  });

  it("el patch admite texto y los dos encuadres", () => {
    const parsed = siteMediaPatchSchema.parse({ alt: "Una fotografía" });
    assert.equal(parsed.alt, "Una fotografía");
    assert.equal(
      siteMediaPatchSchema.safeParse({ focal: { x: 10, y: 20 } }).success,
      true,
    );
    // El encuadre de teléfono se puede guardar solo: es el caso normal
    // cuando no hay variante propia.
    assert.equal(
      siteMediaPatchSchema.safeParse({ mobileFocal: { x: 50, y: 20 } }).success,
      true,
    );
    assert.throws(() => siteMediaPatchSchema.parse({}));
  });
});

/**
 * La fotografía del 404 es un caso aparte: es decorativa, no se muestra en
 * teléfonos y su página no tiene una ruta que invalidar. Estas pruebas fijan
 * las tres cosas para que no se pierdan en la próxima edición.
 */
describe("la fotografía del 404", () => {
  const slot = getSlot("error.404");

  it("cae a la misma imagen que tenía escrita la página", () => {
    assert.ok(slot);
    assert.equal(slot.legacySrc, "/images/brand/night.jpg");
  });

  it("nace centrada, como todas", () => {
    assert.ok(slot);
    assert.deepEqual(legacyImage(slot).desktop.focal, { x: 50, y: 50 });
  });

  it("es decorativa: se publica sin texto alternativo", () => {
    assert.ok(slot);
    assert.equal(slot.decorative, true);
  });

  it("no tiene marco de teléfono porque ahí no se muestra", () => {
    assert.ok(slot);
    assert.equal(slot.frames.mobile, null);
    assert.ok(slot.frames.desktop.ratio > 0);
  });

  it("declara unas medidas utilizables", () => {
    for (const each of SITE_MEDIA_SLOTS) {
      for (const frame of [each.frames.desktop, each.frames.mobile]) {
        if (!frame) continue;
        assert.ok(frame.ratio > 0, `${each.key}: proporción`);
        // Lo recomendado tiene que ser mayor que el mínimo o el escalón no
        // significa nada, y los dos tienen que respetar la proporción.
        assert.ok(
          frame.recommended.width >= frame.minimum.width &&
            frame.recommended.height >= frame.minimum.height,
          `${each.key}: recomendado por debajo del mínimo`,
        );
        for (const size of [frame.recommended, frame.minimum]) {
          const declared = size.width / size.height;
          assert.ok(
            Math.abs(declared - frame.ratio) / frame.ratio < 0.05,
            `${each.key}: ${size.width}×${size.height} no es ${frame.ratio}`,
          );
        }
      }
    }
  });
});

/**
 * El bug que motivó esto: `revalidateSiteMedia()` solo invalidaba la home,
 * así que una fotografía nueva en /contacto no aparecía hasta el siguiente
 * despliegue. El destino ya no está escrito a mano; sale de los slots.
 */
describe("invalidación", () => {
  it("cada slot dice en qué superficie aparece", () => {
    for (const slot of SITE_MEDIA_SLOTS) {
      assert.ok(slot.surface.length > 0, slot.key);
    }
  });

  it("contacto y la 404 están entre las superficies, no solo la home", () => {
    const surfaces = siteMediaSurfaces();
    assert.ok(surfaces.includes("/"));
    assert.ok(surfaces.includes("/contacto"));
    assert.ok(surfaces.includes(NOT_FOUND_SURFACE));
  });

  /**
   * El destino se decide POR CLAVE. Antes no se recibía la clave y se
   * calculaba a partir de todas las superficies declaradas: invalidaba el
   * layout raíz y funcionaba por cobertura, no por intención.
   */
  it("una fotografía de la home refresca la home", () => {
    for (const key of ["home.hero", "home.featured.a", "home.about.house"]) {
      assert.deepEqual(revalidationTargetsFor(key), [{ path: "/" }], key);
    }
  });

  it("la de contacto refresca /contacto y nada más", () => {
    assert.deepEqual(revalidationTargetsFor("contact.hero"), [
      { path: "/contacto" },
    ]);
  });

  it("la de la 404 refresca su propia salida, que no es una ruta normal", () => {
    assert.deepEqual(revalidationTargetsFor("error.404"), [
      { path: NOT_FOUND_PATH },
    ]);
  });

  it("el menú refresca el layout: viaja en todas las páginas", () => {
    // La barra está en el layout público, así que la fotografía del menú
    // aparece en cada página y refrescar una sola no bastaría.
    for (const key of ["nav.contact", "nav.mille", "nav.vehicles"]) {
      assert.deepEqual(
        revalidationTargetsFor(key),
        [{ path: "/", type: "layout" }],
        key,
      );
    }
  });

  it("la de compartir también, porque la metadata la hereda cada página", () => {
    assert.deepEqual(revalidationTargetsFor("seo.defaultOg"), [
      { path: "/", type: "layout" },
    ]);
  });

  it("sin clave se invalida todo, incluida la 404", () => {
    const targets = revalidationTargetsFor();
    assert.deepEqual(targets, [
      { path: "/", type: "layout" },
      { path: NOT_FOUND_PATH },
    ]);
  });

  it("una clave desconocida no deja nada sin refrescar", () => {
    assert.deepEqual(revalidationTargetsFor("no.existe"), [
      { path: "/", type: "layout" },
    ]);
  });

  it("todos los slots tienen al menos un destino", () => {
    for (const slot of SITE_MEDIA_SLOTS) {
      assert.ok(revalidationTargetsFor(slot.key).length > 0, slot.key);
    }
  });
});
