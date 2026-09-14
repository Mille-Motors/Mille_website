import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SITE_MEDIA_SLOTS,
  getSlot,
  isKnownSlot,
  legacyImage,
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
  it("son exactamente los cuatro documentados", () => {
    assert.deepEqual(
      SITE_MEDIA_SLOTS.map((slot) => slot.key),
      ["home.hero", "home.about.origin", "home.about.house", "home.about.future"],
    );
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
