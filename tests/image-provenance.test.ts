import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  IMAGE_SOURCE_TYPES,
  IMAGE_SOURCE_TYPE_LABELS,
  REPOSITORY_IMAGE_RIGHTS,
  imageRightsFromColumns,
  isImageSourceType,
  repositoryImageRights,
  resolveImageRights,
  type ImageRights,
} from "@/lib/image-provenance";
import { SITE_MEDIA_SLOTS } from "@/lib/site-media";

/**
 * De dónde salió una fotografía y por qué podemos usarla.
 *
 * Dos propiedades importan. La primera es el ORDEN de resolución: una foto
 * con procedencia propia no puede quedar descrita por la del lote. La
 * segunda es que el registro del repositorio siga cubriendo los archivos del
 * repositorio: si alguien añade una fotografía a /public y olvida sus
 * créditos, esta prueba lo dice en vez de dejar una imagen publicada sin
 * poder responder por ella.
 */

const own: ImageRights = {
  sourceType: "owner",
  sourceName: "Propietario",
  author: null,
  sourceUrl: null,
  licenseType: null,
  licenseUrl: null,
  licenseRequiresAttribution: false,
  acquiredOn: null,
  authorizedBy: null,
  proofRef: null,
  notes: null,
};

const lot: ImageRights = { ...own, sourceType: "dealer", sourceName: "Dealer" };

describe("orden de resolución", () => {
  it("la fotografía manda sobre el lote", () => {
    const resolved = resolveImageRights({ image: own, vehicle: lot });
    assert.equal(resolved.status, "documented");
    assert.equal(resolved.origin, "image");
    assert.equal(resolved.rights?.sourceType, "owner");
  });

  it("sin procedencia propia, hereda la del lote", () => {
    const resolved = resolveImageRights({ image: null, vehicle: lot });
    assert.equal(resolved.origin, "vehicle");
    assert.equal(resolved.rights?.sourceType, "dealer");
  });

  it("el bloque gana ENTERO, no campo a campo", () => {
    // Mezclar el autor de un dealer con la licencia de un banco produciría
    // una procedencia que no describe a nadie.
    const resolved = resolveImageRights({ image: own, vehicle: lot });
    assert.equal(resolved.rights?.sourceName, "Propietario");
    assert.notEqual(resolved.rights?.sourceName, "Dealer");
  });

  it("un archivo del repositorio responde por sí solo", () => {
    const resolved = resolveImageRights({
      src: "/images/vehicles/bmw-x5-xdrive40i/01.jpg",
    });
    assert.equal(resolved.origin, "repository");
    assert.equal(resolved.rights?.sourceType, "stock");
  });

  it("lo registrado en la base manda sobre los créditos del repositorio", () => {
    // Si alguien documenta expresamente una foto, eso es más reciente y más
    // específico que el registro del archivo.
    const resolved = resolveImageRights({
      image: own,
      src: "/images/vehicles/bmw-x5-xdrive40i/01.jpg",
    });
    assert.equal(resolved.origin, "image");
  });

  it("lo que nadie registró queda PENDIENTE, no inventado", () => {
    const resolved = resolveImageRights({
      src: "https://ejemplo.supabase.co/storage/v1/object/public/x/y.jpg",
    });
    assert.equal(resolved.status, "pending");
    assert.equal(resolved.rights, null);
    assert.equal(resolved.origin, null);
  });

  it("sin nada de nada, también pendiente", () => {
    assert.equal(resolveImageRights({}).status, "pending");
  });
});

describe("lectura desde las columnas", () => {
  const empty = {
    rightsSourceType: null,
    rightsSourceName: null,
    rightsAuthor: null,
    rightsSourceUrl: null,
    rightsLicenseType: null,
    rightsLicenseUrl: null,
    rightsLicenseRequiresAttribution: false,
    rightsAcquiredOn: null,
    rightsAuthorizedBy: null,
    rightsProofRef: null,
    rightsNotes: null,
  };

  it("sin fuente no hay procedencia, aunque haya restos en otras columnas", () => {
    // "Nadie lo registró" es una respuesta. Unas columnas sueltas de una
    // edición a medias no documentan ninguna fotografía.
    const row = { ...empty, rightsAuthor: "Alguien", rightsNotes: "nota" };
    assert.equal(imageRightsFromColumns(row), null);
  });

  it("ignora un valor de fuente que no pertenece al vocabulario", () => {
    const row = { ...empty, rightsSourceType: "INVENTADO" };
    assert.equal(imageRightsFromColumns(row), null);
  });

  it("lee la fecha como día del calendario, sin corrimiento", () => {
    // Una fecha DATE que se formatea en hora local se corre al día anterior
    // en Bogotá. Es el mismo error que obliga a guardar el SOAT como DATE.
    const row = {
      ...empty,
      rightsSourceType: "OWNER",
      rightsAcquiredOn: new Date("2026-10-19T00:00:00.000Z"),
    };
    assert.equal(imageRightsFromColumns(row)?.acquiredOn, "2026-10-19");
  });

  it("traduce la fuente a minúsculas del dominio", () => {
    const row = { ...empty, rightsSourceType: "PHOTOGRAPHER" };
    assert.equal(imageRightsFromColumns(row)?.sourceType, "photographer");
  });
});

describe("el registro del repositorio", () => {
  const credits = (file: string) =>
    JSON.parse(
      readFileSync(path.join(process.cwd(), "public/images", file), "utf8"),
    ) as { slug?: string; file: string }[];

  it("cubre todas las fotografías de vehículos con créditos", () => {
    for (const entry of credits("vehicles/CREDITS.json")) {
      const key = `/images/vehicles/${entry.slug}/${entry.file}`;
      assert.ok(
        repositoryImageRights(key),
        `falta la procedencia de ${key} en REPOSITORY_IMAGE_RIGHTS`,
      );
    }
  });

  it("cubre todas las fotografías de marca", () => {
    for (const entry of credits("brand/CREDITS.json")) {
      const key = `/images/brand/${entry.file}`;
      assert.ok(repositoryImageRights(key), `falta la procedencia de ${key}`);
    }
  });

  it("cubre el archivo de respaldo de cada espacio del sitio", () => {
    // Si un espacio cae a su imagen original y esa imagen no tiene créditos
    // registrados, el Admin no podría responder por lo que el sitio muestra.
    for (const slot of SITE_MEDIA_SLOTS) {
      assert.ok(
        repositoryImageRights(slot.legacySrc),
        `${slot.key} cae a ${slot.legacySrc}, que no tiene procedencia`,
      );
    }
  });

  it("describe el render de marca como material propio, no como stock", () => {
    const hero = repositoryImageRights("/images/brand/hero.jpg");
    assert.equal(hero?.sourceType, "own");
    assert.equal(hero?.sourceName, "MILLE Motor Culture");
  });

  it("no afirma que la licencia de Unsplash exija atribución", () => {
    // La agradece, no la exige, y la diferencia decide si el sitio público
    // tiene que pintar créditos. Hoy ninguna lo exige.
    const stock = repositoryImageRights(
      "/images/vehicles/bmw-x5-xdrive40i/01.jpg",
    );
    assert.equal(stock?.licenseType, "Unsplash License");
    assert.equal(stock?.licenseRequiresAttribution, false);
  });

  it("ninguna entrada se queda sin fuente", () => {
    for (const [key, rights] of Object.entries(REPOSITORY_IMAGE_RIGHTS)) {
      assert.ok(isImageSourceType(rights.sourceType), `${key} sin fuente válida`);
    }
  });

  it("toda entrada de banco de imágenes dice de dónde salió", () => {
    for (const [key, rights] of Object.entries(REPOSITORY_IMAGE_RIGHTS)) {
      if (rights.sourceType !== "stock") continue;
      assert.ok(rights.author, `${key} sin autor`);
      assert.ok(rights.sourceUrl, `${key} sin URL de origen`);
      assert.ok(rights.licenseUrl, `${key} sin URL de licencia`);
    }
  });
});

describe("vocabulario de fuentes", () => {
  it("tiene etiqueta para cada valor", () => {
    for (const type of IMAGE_SOURCE_TYPES) {
      assert.ok(IMAGE_SOURCE_TYPE_LABELS[type], `falta etiqueta de ${type}`);
    }
  });

  it("no acepta un valor de fuera", () => {
    assert.equal(isImageSourceType("robada"), false);
    assert.equal(isImageSourceType(null), false);
    assert.equal(isImageSourceType("OWN"), false);
  });
});
