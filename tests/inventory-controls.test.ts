import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryNav } from "@/components/vehicle/CategoryNav";
import { TypeToggle } from "@/components/vehicle/TypeToggle";
import { parseFilters } from "@/lib/filters";

/**
 * Lo primero que se ve del inventario: escribir, cuatro o dos ruedas, una
 * carrocería. Son enlaces, así que lo que se comprueba es adónde llevan.
 */

/** Cada enlace con su texto, en el orden en que aparecen. */
function links(html: string): { href: string; text: string; current: string | null }[] {
  return [...html.matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    // El HTML escribe `&` como `&amp;`; el navegador lo lee de vuelta.
    href: (/href="([^"]*)"/.exec(match[1])?.[1] ?? "").replaceAll("&amp;", "&"),
    current: /aria-current="([^"]*)"/.exec(match[1])?.[1] ?? null,
    text: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));
}

describe("el selector de cuatro o dos ruedas", () => {
  const render = (query: Record<string, string>) =>
    links(
      renderToStaticMarkup(
        createElement(TypeToggle, { filters: parseFilters(query) }),
      ),
    );

  it("son dos mitades, sin números, y ninguna elegida si no se pidió ninguna", () => {
    const [cars, motos] = render({});
    // Solo el nombre y lo que lee un lector de pantalla: el filtro no lleva
    // contadores, que además se quedaban obsoletos al cambiar de vista.
    assert.equal(cars.text, "4 ruedas (carros)");
    assert.equal(motos.text, "2 ruedas (motos)");
    assert.equal(cars.current, null);
    assert.equal(motos.current, null);
  });

  it("cada una lleva a su universo", () => {
    const [cars, motos] = render({});
    assert.equal(cars.href, "/vehiculos?tipo=auto");
    assert.equal(motos.href, "/vehiculos?tipo=moto");
  });

  it("la elegida se marca, y pulsarla otra vez vuelve al inventario entero", () => {
    const [cars, motos] = render({ tipo: "auto" });
    assert.equal(cars.current, "true");
    assert.equal(cars.href, "/vehiculos");
    assert.equal(motos.current, null);
    assert.equal(motos.href, "/vehiculos?tipo=moto");
  });

  it("al cambiar de universo se suelta lo que era del anterior", () => {
    const [, motos] = render({
      tipo: "auto",
      categoria: "camioneta",
      marca: "BMW",
      minPrice: "100000000",
    });
    assert.equal(motos.href, "/vehiculos?tipo=moto");
  });

  it("…pero lo escrito en el buscador y el orden se conservan", () => {
    const [cars, motos] = render({ tipo: "auto", q: "x5", orden: "precio-asc" });
    assert.equal(motos.href, "/vehiculos?tipo=moto&q=x5&orden=precio-asc");
    assert.equal(cars.href, "/vehiculos?q=x5&orden=precio-asc");
  });

  it("dice «carros» y «motos» a quien no ve el dibujo", () => {
    const html = renderToStaticMarkup(
      createElement(TypeToggle, { filters: parseFilters({}) }),
    );
    assert.match(html, /sr-only[^>]*> \(carros\)/);
    assert.match(html, /sr-only[^>]*> \(motos\)/);
  });
});

describe("las píldoras de categoría", () => {
  const categories = [
    { id: "1", name: "Camioneta", pluralName: "Camionetas", slug: "camioneta", count: 3 },
    { id: "2", name: "Sedán", pluralName: "Sedanes", slug: "sedan", count: 1 },
    { id: "3", name: "Pickup", pluralName: "Pickups", slug: "pickup", count: 0 },
  ];
  const render = (query: Record<string, string>) =>
    links(
      renderToStaticMarkup(
        createElement(CategoryNav, { filters: parseFilters(query), categories }),
      ),
    );

  it("«Todos» y después cada carrocería, tenga o no vehículos hoy", () => {
    assert.deepEqual(
      render({ tipo: "auto" }).map((link) => link.text.replace(" (sin vehículos por ahora)", "")),
      ["Todos", "Camionetas", "Sedanes", "Pickups"],
    );
  });

  it("la que no tiene vehículos se atenúa, pero sigue siendo un enlace", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryNav, { filters: parseFilters({ tipo: "auto" }), categories }),
    );
    const pickups = links(html).find((link) => link.text.startsWith("Pickups"))!;
    assert.equal(pickups.href, "/vehiculos?tipo=auto&categoria=pickup");
    assert.match(pickups.text, /sin vehículos por ahora/);
    // Y las que sí tienen, no llevan el aviso.
    assert.doesNotMatch(
      links(html).find((link) => link.text.startsWith("Camionetas"))!.text,
      /sin vehículos/,
    );
  });

  it("la fila que se desliza contiene su texto oculto: si no, ensancha la página en teléfono", () => {
    // El aviso «sin vehículos por ahora» es `sr-only`, es decir, absoluto. Sin
    // un ancestro posicionado dentro de la fila con `overflow-x-auto`, se sale
    // de ella y la página gana un desplazamiento lateral (medido: 786 px en 390).
    const html = renderToStaticMarkup(
      createElement(CategoryNav, { filters: parseFilters({ tipo: "auto" }), categories }),
    );
    const list = /<ul class="([^"]*)"/.exec(html)![1];
    const classes = list.split(" ");
    assert.ok(classes.includes("overflow-x-auto"), "la fila no se desliza");
    assert.ok(classes.includes("relative"), "la fila no contiene lo absoluto");
    assert.ok(html.includes("sr-only"), "el aviso no está");
  });

  it("la activa se marca; «Todos» lo está si no hay ninguna", () => {
    assert.equal(render({ tipo: "auto" })[0].current, "page");
    const camionetas = render({ tipo: "auto", categoria: "camioneta" });
    assert.equal(camionetas[0].current, null);
    assert.equal(camionetas[1].current, "page");
  });

  it("un enlace viejo con «suv» marca la camioneta, no deja todo sin elegir", () => {
    const entries = render({ tipo: "auto", categoria: "suv" });
    assert.equal(entries[1].current, "page");
  });

  it("elegir una categoría NO suelta lo demás", () => {
    const entries = render({
      tipo: "auto",
      q: "x5",
      marca: "BMW",
      minPrice: "100000000",
      maxKm: "50000",
    });
    const sedan = entries.find((entry) => entry.text === "Sedanes")!;
    const params = new URL(sedan.href, "https://x.test").searchParams;
    assert.equal(params.get("categoria"), "sedan");
    assert.equal(params.get("q"), "x5");
    assert.equal(params.get("marca"), "BMW");
    assert.equal(params.get("minPrice"), "100000000");
    assert.equal(params.get("maxKm"), "50000");
  });

  it("«Todos» quita la categoría y deja el resto", () => {
    const all = render({ tipo: "auto", categoria: "camioneta", q: "x5" })[0];
    assert.equal(all.href, "/vehiculos?tipo=auto&q=x5");
  });

  it("sin categorías no se dibuja nada", () => {
    assert.equal(
      renderToStaticMarkup(
        createElement(CategoryNav, { filters: parseFilters({}), categories: [] }),
      ),
      "",
    );
  });
});
