import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { warmOrder } from "@/lib/gallery-warm";
import { moveItem, reconcileOrder, sameOrder } from "@/lib/image-order";

/**
 * El orden de las fotos: lo que mueve el gestor del admin y lo que precarga la
 * galería pública.
 */

describe("mover una foto", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("de una posición a otra, sin tocar el resto", () => {
    assert.deepEqual(moveItem(ids, 3, 1), ["a", "d", "b", "c", "e"]);
    assert.deepEqual(moveItem(ids, 1, 3), ["a", "c", "d", "b", "e"]);
  });

  it("de la última a la primera: una sola operación, no doce clics", () => {
    assert.deepEqual(moveItem(ids, 4, 0), ["e", "a", "b", "c", "d"]);
  });

  it("no cambia la lista original", () => {
    const copy = [...ids];
    moveItem(ids, 0, 4);
    assert.deepEqual(ids, copy);
  });

  it("moverla a donde ya está, o desde donde no hay nada, no cambia nada", () => {
    assert.deepEqual(moveItem(ids, 2, 2), ids);
    assert.deepEqual(moveItem(ids, 9, 1), ids);
    assert.deepEqual(moveItem(ids, -1, 1), ids);
  });

  it("un destino fuera de la lista se queda en el extremo", () => {
    assert.deepEqual(moveItem(ids, 1, 99), ["a", "c", "d", "e", "b"]);
    assert.deepEqual(moveItem(ids, 3, -5), ["d", "a", "b", "c", "e"]);
  });

  it("conserva todas las fotos, sin repetir ni perder ninguna", () => {
    for (let from = 0; from < ids.length; from += 1) {
      for (let to = 0; to < ids.length; to += 1) {
        assert.deepEqual([...moveItem(ids, from, to)].sort(), [...ids].sort());
      }
    }
  });
});

describe("comparar dos órdenes", () => {
  it("iguales o distintos", () => {
    assert.equal(sameOrder(["a", "b"], ["a", "b"]), true);
    assert.equal(sameOrder(["a", "b"], ["b", "a"]), false);
    assert.equal(sameOrder(["a"], ["a", "b"]), false);
  });
});

describe("el orden pendiente frente a lo que existe", () => {
  it("sin nada pendiente, manda el del servidor", () => {
    assert.deepEqual(reconcileOrder(null, ["a", "b", "c"]), ["a", "b", "c"]);
  });

  it("con un orden pendiente, se respeta", () => {
    assert.deepEqual(reconcileOrder(["c", "a", "b"], ["a", "b", "c"]), ["c", "a", "b"]);
  });

  it("una foto que se borró mientras tanto desaparece del orden pendiente", () => {
    assert.deepEqual(reconcileOrder(["c", "a", "b"], ["a", "c"]), ["c", "a"]);
  });

  it("una foto nueva que el orden pendiente no conoce va al final, no se pierde", () => {
    assert.deepEqual(reconcileOrder(["b", "a"], ["a", "b", "z"]), ["b", "a", "z"]);
  });
});

describe("en qué orden precarga la galería", () => {
  it("primero la siguiente y la anterior, luego las más lejanas", () => {
    assert.deepEqual(warmOrder(0, 6), [1, 5, 2, 4, 3]);
    assert.deepEqual(warmOrder(2, 6), [3, 1, 4, 0, 5]);
  });

  it("no incluye la que ya se ve", () => {
    for (let current = 0; current < 5; current += 1) {
      assert.ok(!warmOrder(current, 5).includes(current));
    }
  });

  it("pide cada foto una sola vez, y todas", () => {
    const order = warmOrder(3, 9);
    assert.equal(new Set(order).size, order.length);
    assert.equal(order.length, 8);
  });

  it("con dos fotos, la otra; con una, nada", () => {
    assert.deepEqual(warmOrder(0, 2), [1]);
    assert.deepEqual(warmOrder(1, 2), [0]);
    assert.deepEqual(warmOrder(0, 1), []);
  });

  it("en una galería de quince, las vecinas de la primera van antes que las del medio", () => {
    const order = warmOrder(0, 15);
    assert.ok(order.indexOf(1) < order.indexOf(7));
    assert.ok(order.indexOf(14) < order.indexOf(8));
  });
});
