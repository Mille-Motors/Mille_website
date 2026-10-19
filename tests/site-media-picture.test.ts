import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteMediaPicture } from "@/components/media/SiteMediaPicture";
import {
  MOBILE_BREAKPOINT_PX,
  fileForVariant,
  getSlot,
  legacyImage,
  type SiteMediaImage,
} from "@/lib/site-media";

/**
 * Cómo se sirve una fotografía del sitio en los dos viewports.
 *
 * Lo que estas pruebas fijan es la propiedad que motivó todo: un teléfono NO
 * puede descargar la fotografía de escritorio además de la suya. Esconder
 * una con CSS no vale —el navegador las baja las dos—, así que la decisión
 * tiene que estar en un `<source media>`, que el navegador evalúa antes de
 * pedir nada.
 */
const base: SiteMediaImage = legacyImage(getSlot("home.hero")!);

const withMobile: SiteMediaImage = {
  ...base,
  desktop: { ...base.desktop, src: "/images/brand/hero.jpg", focal: { x: 30, y: 40 } },
  mobile: {
    // Una ruta local: `getImageProps` valida el host contra
    // `remotePatterns`, que se deriva de una variable de entorno que no
    // existe en las pruebas. Lo que se comprueba aquí es la estructura.
    src: "/images/brand/hero-movil.jpg",
    source: "storage",
    focal: { x: 60, y: 20 },
    size: { width: 1400, height: 2500 },
    bytes: 900_000,
    contentType: "image/jpeg",
  },
  mobileFocal: { x: 60, y: 20 },
};

const onlyDesktop: SiteMediaImage = {
  ...base,
  desktop: { ...base.desktop, focal: { x: 30, y: 40 } },
  mobile: null,
  mobileFocal: { x: 50, y: 15 },
};

const render = (image: SiteMediaImage, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(SiteMediaPicture, { image, sizes: "100vw", ...props }),
  );

describe("sin variante de teléfono", () => {
  const html = render(onlyDesktop);

  it("no hay `<source>`: un solo archivo para los dos tamaños", () => {
    assert.equal(html.includes("<source"), false);
    assert.equal((html.match(/<img/g) ?? []).length, 1);
  });

  it("pero sí hay dos encuadres, uno por viewport", () => {
    // Es el caso normal: la misma fotografía, mirada de otra forma en
    // vertical. Lo resuelven dos variables CSS y una consulta de medios.
    assert.ok(html.includes("--focal-d:30% 40%"), html.slice(0, 300));
    assert.ok(html.includes("--focal-m:50% 15%"));
    assert.ok(html.includes("focal-art"));
  });

  it("conserva las clases del diseño", () => {
    const styled = render(onlyDesktop, { className: "photo-grade object-cover" });
    assert.ok(styled.includes("photo-grade"));
    assert.ok(styled.includes("object-cover"));
  });
});

describe("con variante de teléfono", () => {
  const html = render(withMobile, { mobileSizes: "100vw" });

  it("ofrece la de teléfono en un `<source media>`", () => {
    assert.ok(html.includes("<source"));
    assert.ok(
      html.includes(`max-width: ${MOBILE_BREAKPOINT_PX - 0.02}px`),
      "la consulta de medios tiene que marcar el corte",
    );
    assert.ok(html.includes("hero-movil"));
  });

  it("el `<img>` sigue siendo el de escritorio", () => {
    const img = /<img[^>]*>/.exec(html)?.[0] ?? "";
    assert.ok(img.includes("hero.jpg"), img);
    assert.equal(img.includes("hero-movil"), false);
  });

  it("cada variante lleva su propio encuadre", () => {
    assert.ok(html.includes("--focal-d:30% 40%"));
    assert.ok(html.includes("--focal-m:60% 20%"));
  });
});

describe("la fotografía que es LCP", () => {
  it("sin `priority` no precarga nada", () => {
    assert.equal(render(withMobile).includes('rel="preload"'), false);
  });

  it("con `priority` precarga UNA variante por viewport, nunca las dos", () => {
    const html = render(withMobile, { priority: true });
    const preloads = html.match(/<link[^>]*rel="preload"[^>]*>/g) ?? [];
    assert.equal(preloads.length, 2);

    const mobile = preloads.find((tag) => tag.includes("hero-movil"));
    const desktop = preloads.find((tag) => !tag.includes("hero-movil"));
    assert.ok(mobile && desktop);
    // Consultas de medios mutuamente excluyentes: ningún dispositivo
    // satisface las dos, así que ninguno precarga dos archivos.
    assert.ok(mobile.includes("max-width"));
    assert.ok(desktop.includes("min-width"));
    assert.ok(desktop.includes(`${MOBILE_BREAKPOINT_PX}px`));
  });

  it("sin variante de teléfono, un solo preload y sin `media`", () => {
    const html = render(onlyDesktop, { priority: true });
    const preloads = html.match(/<link[^>]*rel="preload"[^>]*>/g) ?? [];
    assert.equal(preloads.length, 1);
    assert.equal(preloads[0].includes("media="), false);
  });
});

describe("el respaldo nunca deja un hueco", () => {
  it("en teléfono sin variante propia se usa la de escritorio", () => {
    const file = fileForVariant(onlyDesktop, "mobile");
    assert.equal(file.src, onlyDesktop.desktop.src);
    // …pero con el encuadre de teléfono, que es el punto.
    assert.deepEqual(file.focal, { x: 50, y: 15 });
  });

  it("con variante propia se usa la suya", () => {
    const file = fileForVariant(withMobile, "mobile");
    assert.equal(file.src, "/images/brand/hero-movil.jpg");
    assert.deepEqual(file.focal, { x: 60, y: 20 });
  });

  it("quitar la variante devuelve al respaldo sin pasar por ningún vacío", () => {
    const removed: SiteMediaImage = { ...withMobile, mobile: null };
    const file = fileForVariant(removed, "mobile");
    assert.equal(file.src, removed.desktop.src);
    assert.ok(file.src.length > 0);
  });

  it("un slot sin fila cae a la fotografía del repositorio", () => {
    for (const key of ["home.hero", "nav.contact", "seo.defaultOg"]) {
      const image = legacyImage(getSlot(key)!);
      assert.ok(image.desktop.src.startsWith("/images/"), key);
      assert.equal(fileForVariant(image, "mobile").src, image.desktop.src);
    }
  });
});

describe("los espacios del menú son independientes", () => {
  it("cambiar uno no puede cambiar otro, aunque arranquen igual", () => {
    // Arrancan apuntando al mismo archivo a propósito: el sitio tiene que
    // verse igual tras la migración. Lo que no puede es que compartan fila.
    const navContact = getSlot("nav.contact")!;
    const contactHero = getSlot("contact.hero")!;
    assert.equal(navContact.legacySrc, contactHero.legacySrc);
    assert.notEqual(navContact.key, contactHero.key);
    // Y cada uno tiene su propio marco: el menú es vertical, la portada no.
    assert.notEqual(
      navContact.frames.desktop.ratio,
      contactHero.frames.desktop.ratio,
    );
  });
});
