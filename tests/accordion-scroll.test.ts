import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scrollBehaviorFor, toggleSection } from "@/lib/accordion-scroll";

/**
 * Qué hace la ficha al pulsar el título de una sección.
 *
 * El proyecto no tiene jsdom, así que no se comprueba aquí un
 * `scrollIntoView` de verdad: se comprueba la DECISIÓN de llamarlo, que es
 * donde estaba el fallo. El componente sigue haciendo la llamada; lo que se
 * extrajo es el "sí o no", no el comportamiento.
 */
describe("abrir una sección", () => {
  it("la abre y pide llevar la vista a su inicio", () => {
    assert.deepEqual(toggleSection(null, "hibrido"), {
      open: "hibrido",
      scrollTo: "hibrido",
    });
  });

  it("abrir con otra abierta solo lleva a la nueva", () => {
    // No se pasa antes por la que se cierra: sería un salto hacia arriba y
    // otro hacia abajo dentro del mismo clic.
    assert.deepEqual(toggleSection("especificaciones", "hibrido"), {
      open: "hibrido",
      scrollTo: "hibrido",
    });
  });

  it("sigue habiendo como máximo una abierta", () => {
    const first = toggleSection(null, "a");
    const second = toggleSection(first.open, "b");
    assert.equal(second.open, "b");
  });
});

describe("cerrar una sección", () => {
  it("la cierra y NO toca el scroll", () => {
    assert.deepEqual(toggleSection("hibrido", "hibrido"), {
      open: null,
      scrollTo: null,
    });
  });

  it("abrir y volver a cerrar deja la página donde caiga", () => {
    const opened = toggleSection(null, "documentacion");
    assert.equal(opened.scrollTo, "documentacion");
    const closed = toggleSection(opened.open, "documentacion");
    assert.equal(closed.scrollTo, null);
  });
});

describe("cómo se mueve", () => {
  it("suave por defecto", () => {
    assert.equal(scrollBehaviorFor(false), "smooth");
  });

  it("instantáneo para quien pidió menos movimiento", () => {
    // No es estético: una animación de desplazamiento puede marear a quien
    // activa esa preferencia justamente por eso.
    assert.equal(scrollBehaviorFor(true), "auto");
  });
});
