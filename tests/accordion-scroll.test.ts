import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  revealSection,
  scrollBehaviorFor,
  toggleSection,
} from "@/lib/accordion-scroll";

/**
 * Qué hace la ficha al pulsar el título de una sección.
 *
 * El proyecto no tiene jsdom, así que no se comprueba aquí una animación: se
 * comprueba la DECISIÓN —qué queda abierto—. Cada sección se abre y se cierra
 * por su cuenta, y puede haber varias abiertas a la vez.
 */
describe("abrir y cerrar una sección", () => {
  it("abrir una sección cerrada la deja abierta", () => {
    assert.deepEqual([...toggleSection(new Set(), "hibrido")], ["hibrido"]);
  });

  it("abrir otra NO cierra la que estaba abierta", () => {
    // Quien compara las especificaciones con el equipamiento no quiere que se
    // le cierre una mientras lee la otra.
    const open = toggleSection(new Set(["especificaciones"]), "equipamiento");
    assert.deepEqual([...open].sort(), ["equipamiento", "especificaciones"]);
  });

  it("pueden estar abiertas todas a la vez", () => {
    let open: ReadonlySet<string> = new Set();
    for (const id of ["a", "b", "c", "d"]) open = toggleSection(open, id);
    assert.equal(open.size, 4);
  });

  it("pulsar una abierta la cierra y deja las demás como estaban", () => {
    const open = toggleSection(new Set(["a", "b", "c"]), "b");
    assert.deepEqual([...open].sort(), ["a", "c"]);
  });

  it("abrir y cerrar la misma no deja rastro", () => {
    const opened = toggleSection(new Set(["a"]), "b");
    const closed = toggleSection(opened, "b");
    assert.deepEqual([...closed], ["a"]);
  });

  it("no modifica el conjunto que recibe", () => {
    const before = new Set(["a"]);
    toggleSection(before, "b");
    assert.deepEqual([...before], ["a"]);
  });
});

describe("revelar una sección al buscar texto", () => {
  it("la abre sin cerrar las demás", () => {
    const open = revealSection(new Set(["a"]), "b");
    assert.deepEqual([...open].sort(), ["a", "b"]);
  });

  it("si ya estaba abierta no cambia nada y devuelve el mismo conjunto", () => {
    // Devolver el mismo evita un render que no mostraría nada distinto.
    const before = new Set(["a", "b"]);
    assert.equal(revealSection(before, "b"), before);
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
