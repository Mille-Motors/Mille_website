import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "@/components/layout/Footer";
import { LEGAL_PATHS } from "@/lib/legal";

/**
 * El pie: los canales son iconos bajo el nombre de la casa, y los documentos
 * legales quedan a la par de la navegación.
 */

const html = renderToStaticMarkup(createElement(Footer));

/** El contenido de una región `<nav aria-label="…">` o `<ul aria-label="…">`. */
function region(tag: "nav" | "ul", label: string): string {
  const open = html.indexOf(`<${tag} aria-label="${label}"`);
  assert.ok(open >= 0, `no hay <${tag}> «${label}»`);
  return html.slice(open, html.indexOf(`</${tag}>`, open));
}

describe("los canales del pie", () => {
  const channels = region("ul", "Canales de contacto");

  it("son tres iconos con nombre accesible: Instagram, WhatsApp y Correo", () => {
    for (const name of ["Instagram", "WhatsApp", "Correo"]) {
      assert.ok(channels.includes(`aria-label="${name}"`), `falta el icono de ${name}`);
      assert.ok(channels.includes(`title="${name}"`), `${name} no dice qué es al pasar el cursor`);
    }
  });

  it("no llevan texto visible: solo el icono", () => {
    const visible = channels.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim();
    assert.equal(visible, "");
  });

  it("miden 44 px, lo mínimo para tocarlos con el dedo", () => {
    assert.equal((channels.match(/\bsize-11\b/g) ?? []).length, 3);
  });

  it("siguen abriendo el canal real, sin filtrar la referencia", () => {
    assert.ok(channels.includes("instagram.com/millemotorculture"));
    assert.ok(channels.includes("wa.me/"));
    assert.ok(channels.includes("mailto:"));
    assert.equal((channels.match(/rel="noreferrer noopener"/g) ?? []).length, 2);
  });

  it("el de WhatsApp conserva su marca para medir los toques", () => {
    assert.ok(channels.includes('data-wa-source="footer"'));
    assert.ok(channels.includes('data-wa-intent="general"'));
  });

  it("viven bajo el nombre de la casa, antes que la navegación", () => {
    assert.ok(html.indexOf("Bogotá") < html.indexOf("Canales de contacto"));
    assert.ok(html.indexOf("Canales de contacto") < html.indexOf('aria-label="Pie de página"'));
  });
});

describe("los documentos legales del pie", () => {
  const legal = region("nav", "Información legal");

  it("tienen su propia columna, con los tres documentos y la autoridad", () => {
    for (const path of Object.values(LEGAL_PATHS)) {
      assert.ok(legal.includes(`href="${path}"`), `falta ${path}`);
    }
    assert.ok(legal.includes("Superintendencia"));
  });

  it("no se mezclan con los canales", () => {
    const channels = region("ul", "Canales de contacto");
    for (const path of Object.values(LEGAL_PATHS)) {
      assert.ok(!channels.includes(`href="${path}"`));
    }
  });

  it("quedan a la par de la navegación: las dos columnas empiezan arriba", () => {
    const nav = region("nav", "Pie de página");
    // Las dos listas se alinean por arriba; ninguna empuja a la otra hacia abajo.
    assert.ok(nav.includes("content-start"));
    assert.ok(legal.includes("content-start"));
    // Y la navegación va justo antes que los documentos, en el mismo bloque.
    assert.ok(html.indexOf('aria-label="Pie de página"') < html.indexOf('aria-label="Información legal"'));
  });
});

describe("lo demás del pie sigue donde estaba", () => {
  it("el nombre grande de MILLE se conserva", () => {
    assert.match(html, /aria-hidden="true"[^>]*>MILLE<\/p>/);
  });

  it("y también «Volver arriba» y la firma", () => {
    assert.ok(html.includes("Volver arriba"));
    assert.ok(html.includes("Todos los derechos reservados"));
  });
});
