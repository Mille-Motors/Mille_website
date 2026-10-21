import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pageWindow } from "@/lib/page-window";

describe("el paginador del admin", () => {
  it("una sola página es solo esa página", () => {
    assert.deepEqual(pageWindow(1, 1), [1]);
  });

  it("hasta siete páginas se muestran todas", () => {
    assert.deepEqual(pageWindow(4, 7), [1, 2, 3, 4, 5, 6, 7]);
  });

  it("al principio abrevia lo lejano", () => {
    assert.deepEqual(pageWindow(1, 20), [1, 2, "…", 20]);
    assert.deepEqual(pageWindow(2, 20), [1, 2, 3, "…", 20]);
  });

  it("en medio abrevia por los dos lados", () => {
    assert.deepEqual(pageWindow(10, 20), [1, "…", 9, 10, 11, "…", 20]);
  });

  it("al final abrevia lo lejano", () => {
    assert.deepEqual(pageWindow(20, 20), [1, "…", 19, 20]);
    assert.deepEqual(pageWindow(19, 20), [1, "…", 18, 19, 20]);
  });

  it("un hueco de una sola página muestra la página y no «…»", () => {
    assert.deepEqual(pageWindow(4, 20), [1, 2, 3, 4, 5, "…", 20]);
    assert.deepEqual(pageWindow(17, 20), [1, "…", 16, 17, 18, 19, 20]);
  });

  it("una página fuera de rango se acota", () => {
    assert.deepEqual(pageWindow(99, 3), [1, 2, 3]);
    assert.deepEqual(pageWindow(0, 3), [1, 2, 3]);
  });

  it("sin páginas no hay nada que dibujar", () => {
    assert.deepEqual(pageWindow(1, 0), []);
  });
});
