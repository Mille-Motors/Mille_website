import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  VehicleDetails,
  type DetailSection,
} from "@/components/vehicle/VehicleDetails";

/**
 * El contenido cerrado SIGUE en el HTML.
 *
 * Antes el panel se desmontaba al cerrar, y eso dejaba la ficha dependiendo
 * de que alguien hiciera clic: el texto de tres de cada cuatro secciones no
 * estaba en el documento, así que no existía para un buscador, ni para
 * buscar dentro de la página, ni al imprimir. En una ficha de vehículo eso
 * es justo el contenido que importa.
 *
 * Lo que sí tiene que desaparecer al cerrar es la VISIBILIDAD: fuera del
 * árbol accesible y fuera del orden de tabulación. De eso se encarga el
 * atributo `hidden`, y estas pruebas lo fijan sobre el HTML que se sirve.
 */

/** Las cuatro secciones de una ficha compleja, como la del X5 enchufable. */
const sections: DetailSection[] = [
  {
    id: "especificaciones",
    title: "Especificaciones",
    children: createElement("p", null, "Cilindrada 2.998 cc"),
  },
  {
    id: "sistema",
    title: "Sistema híbrido",
    children: createElement("p", null, "Autonomía eléctrica 85 km"),
  },
  {
    id: "equipamiento",
    title: "Equipamiento",
    children: createElement(
      "p",
      null,
      "Harman Kardon Surround",
      createElement("a", { href: "/vehiculos" }, "enlace interno"),
    ),
  },
  {
    id: "documentacion",
    title: "Documentación",
    children: createElement("p", null, "SOAT vigente hasta el 18 de marzo"),
  },
];

const html = renderToStaticMarkup(createElement(VehicleDetails, { sections }));

describe("la ficha sirve todo su contenido, abra quien abra", () => {
  it("el texto de LAS CUATRO secciones está en el HTML inicial", () => {
    for (const fragment of [
      "Cilindrada 2.998 cc",
      "Autonomía eléctrica 85 km",
      "Harman Kardon Surround",
      "SOAT vigente hasta el 18 de marzo",
    ]) {
      assert.ok(
        html.includes(fragment),
        `"${fragment}" no llegó al HTML: la sección se desmontó`,
      );
    }
  });

  it("los cuatro títulos están, y son botones", () => {
    for (const title of [
      "Especificaciones",
      "Sistema híbrido",
      "Equipamiento",
      "Documentación",
    ]) {
      assert.ok(html.includes(title), `falta el título ${title}`);
    }
    assert.equal((html.match(/<button/g) ?? []).length, 4);
  });

  it("solo una sección nace abierta", () => {
    const expanded = html.match(/aria-expanded="true"/g) ?? [];
    const collapsed = html.match(/aria-expanded="false"/g) ?? [];
    assert.equal(expanded.length, 1, "debería haber exactamente una abierta");
    assert.equal(collapsed.length, 3);
  });

  it("las tres cerradas llevan `hidden`, y la abierta no", () => {
    // La etiqueta entera: `hidden` lo escribe React después de `role`.
    const panels = [...html.matchAll(/<div[^>]*role="region"[^>]*>/g)].map(
      (match) => match[0],
    );
    assert.equal(panels.length, 4, "los cuatro paneles tienen que existir");
    const hiddenPanels = panels.filter((tag) => tag.includes("hidden"));
    assert.equal(hiddenPanels.length, 3);
  });

  it("un enlace dentro de una sección cerrada no queda alcanzable", () => {
    // `hidden` saca el subárbol del orden de tabulación y del árbol
    // accesible; esconderlo con opacity o height no lo haría.
    const equipmentPanel = /id="[^"]*equipamiento"([^>]*)>/.exec(html);
    assert.ok(equipmentPanel, "no se encontró el panel de equipamiento");
    assert.ok(
      equipmentPanel[1].includes("hidden"),
      "el panel cerrado debería llevar hidden",
    );
  });

  it("cada panel se anuncia con el título de su propio botón", () => {
    const triggers = [...html.matchAll(/id="([^"]*)-trigger"/g)].map((m) => m[1]);
    assert.equal(triggers.length, 4);
    for (const panelId of triggers) {
      assert.ok(
        html.includes(`aria-controls="${panelId}"`),
        `el botón no controla su panel ${panelId}`,
      );
      assert.ok(
        html.includes(`aria-labelledby="${panelId}-trigger"`),
        `el panel ${panelId} no se anuncia con su botón`,
      );
    }
  });

  it("sin secciones no se dibuja nada", () => {
    assert.equal(
      renderToStaticMarkup(createElement(VehicleDetails, { sections: [] })),
      "",
    );
  });
});
