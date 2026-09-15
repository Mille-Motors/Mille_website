import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NOT_FOUND_SURFACE,
  SITE_MEDIA_SLOTS,
  getSlot,
  isKnownSlot,
  legacyImage,
  siteMediaRevalidationTarget,
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
  it("son exactamente los seis documentados", () => {
    assert.deepEqual(
      SITE_MEDIA_SLOTS.map((slot) => slot.key),
      [
        "home.hero",
        "home.about.origin",
        "home.about.house",
        "home.about.future",
        "contact.hero",
        "error.404",
      ],
    );
  });

  it("la fotografía de contacto cae a la original del repositorio", () => {
    const contact = getSlot("contact.hero");
    assert.ok(contact);
    assert.equal(contact.legacySrc, "/images/brand/night.jpg");
    assert.equal(contact.legacyAlt, "Vehículo de MILLE fotografiado de noche");
    assert.deepEqual(legacyImage(contact).focal, { x: 50, y: 50 });
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
    assert.equal(image.src, "/images/brand/hero.jpg");
    assert.equal(image.source, "legacy");
    assert.equal(image.alt, hero.legacyAlt);
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

  it("el patch solo admite el texto alternativo", () => {
    const parsed = siteMediaPatchSchema.parse({ alt: "Una fotografía" });
    assert.equal(parsed.alt, "Una fotografía");
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
    assert.deepEqual(legacyImage(slot).focal, { x: 50, y: 50 });
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

  it("declara un ancho recomendado utilizable", () => {
    for (const each of SITE_MEDIA_SLOTS) {
      assert.ok(
        Number.isInteger(each.recommendedWidth) &&
          each.recommendedWidth >= 1200 &&
          each.recommendedWidth <= 4000,
        `${each.key}: ${each.recommendedWidth}`,
      );
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

  it("con varias superficies se invalida el layout raíz, que las cubre todas", () => {
    const target = siteMediaRevalidationTarget();
    assert.equal(target.path, "/");
    assert.equal(target.type, "layout");
  });

  it("no se queda corta: hay más de una superficie que cubrir", () => {
    // Si algún día vuelve a haber una sola, el destino puede ser esa ruta;
    // mientras haya varias, invalidar solo la home es el bug de origen.
    assert.ok(siteMediaSurfaces().length > 1);
  });
});
