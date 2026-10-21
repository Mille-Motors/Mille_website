import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateShort } from "@/lib/format";

/**
 * Lo que la lista de vehículos del admin necesita para caber en una celda:
 * una fecha corta y estable, y una insignia de disponibilidad del tamaño de
 * una fila. Las dos se comparten con el resto del sitio, así que fijar que
 * lo de siempre no cambió importa tanto como lo nuevo.
 */
describe("la fecha de una celda de tabla", () => {
  it("se lee «19 oct 2026», sin «de» y sin punto", () => {
    assert.equal(formatDateShort("2026-10-19T15:00:00.000Z"), "19 oct 2026");
  });

  it("no lleva punto en ningún mes abreviado", () => {
    for (let month = 1; month <= 12; month++) {
      const iso = `2026-${String(month).padStart(2, "0")}-15T15:00:00.000Z`;
      assert.ok(!formatDateShort(iso).includes("."), formatDateShort(iso));
    }
  });

  it("cuenta el día en Bogotá y no en UTC", () => {
    // 02:00 UTC del 20 son las 21:00 del 19 en Bogotá (UTC−5).
    assert.equal(formatDateShort("2026-10-20T02:00:00.000Z"), "19 oct 2026");
  });
});

describe("la insignia de disponibilidad", () => {
  it("la tamaño sm es más compacta que la de siempre", () => {
    const md = renderToStaticMarkup(
      createElement(StatusPill, { status: "reserved" }),
    );
    const sm = renderToStaticMarkup(
      createElement(StatusPill, { status: "reserved", size: "sm" }),
    );
    assert.ok(md.includes("px-3.5") && md.includes("py-1.5"));
    assert.ok(sm.includes("px-2.5") && sm.includes("py-1"));
    assert.ok(!sm.includes("px-3.5"));
  });

  it("sin pedir tamaño, el sitio público sigue como estaba", () => {
    const html = renderToStaticMarkup(
      createElement(StatusPill, { status: "available" }),
    );
    assert.ok(html.includes("gap-2"));
    assert.ok(html.includes("text-sm"));
    assert.ok(html.includes("Disponible"));
  });

  it("dice lo que dice el estado, no otra cosa", () => {
    for (const [status, label] of [
      ["available", "Disponible"],
      ["reserved", "Reservado"],
      ["sold", "Vendido"],
    ] as const) {
      const html = renderToStaticMarkup(
        createElement(StatusPill, { status, size: "sm" }),
      );
      assert.ok(html.includes(label), label);
    }
  });
});
