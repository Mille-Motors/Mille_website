import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VehicleAbout } from "@/components/vehicle/VehicleAbout";
import { VehicleContactActions } from "@/components/vehicle/VehicleContactActions";
import {
  VehicleDetails,
  type DetailSection,
} from "@/components/vehicle/VehicleDetails";
import { VehicleTags } from "@/components/vehicle/VehicleTags";
import { descriptionParts } from "@/lib/vehicle-display";
import { makeVehicle } from "./support/vehicle";

/**
 * «Acerca de este vehículo» y las salidas de contacto de la ficha.
 *
 * Lo que fijan estas pruebas es lo que se pidió quitar y lo que se pidió
 * dejar: el carácter del vehículo se ve pero ya no lleva a otra página, la
 * tarjeta del relato forma parte del menú sin poder plegarse, y la única vía
 * de contacto desde la ficha es WhatsApp.
 */

/** Un enlace de verdad: `<a ` o `<a>`, no `<aside`. */
const hasLink = (html: string) => /<a[\s>]/.test(html);

const attrs = (html: string, name: string) =>
  [...html.matchAll(new RegExp(`${name}="([^"]*)"`, "g"))].map((m) => m[1]);

describe("el texto de «Acerca de este vehículo»", () => {
  it("un primer párrafo corto sube como entradilla", () => {
    const parts = descriptionParts("Un X5 en excelente estado.\n\nSe entrega con documentos.");
    assert.equal(parts.lead, "Un X5 en excelente estado.");
    assert.deepEqual(parts.body, ["Se entrega con documentos."]);
  });

  it("un texto de un solo párrafo no tiene entradilla", () => {
    const parts = descriptionParts("Todo en un solo párrafo, sin más.");
    assert.equal(parts.lead, null);
    assert.deepEqual(parts.body, ["Todo en un solo párrafo, sin más."]);
  });

  it("un primer párrafo largo no es una entradilla: agrandarlo sería un muro", () => {
    const long = "x".repeat(400);
    const parts = descriptionParts(`${long}\n\nSegundo.`);
    assert.equal(parts.lead, null);
    assert.deepEqual(parts.body, [long, "Segundo."]);
  });

  it("no toca lo escrito: solo lo reparte", () => {
    const written = "Primero.\n\nSegundo.\n\nTercero con\nsalto de línea.";
    const parts = descriptionParts(written);
    assert.deepEqual([parts.lead, ...parts.body].join("\n\n"), written);
  });

  it("los espacios sobrantes entre párrafos no crean párrafos vacíos", () => {
    const parts = descriptionParts("Uno.\n\n\n   \n\nDos.");
    assert.deepEqual([parts.lead, ...parts.body], ["Uno.", "Dos."]);
  });

  it("sin texto no hay nada", () => {
    assert.deepEqual(descriptionParts("  \n "), { lead: null, body: [] });
  });
});

describe("las etiquetas de carácter", () => {
  const vehicle = makeVehicle({ tags: ["Deportivo", "Lujo"], vehicleType: "auto" });
  const html = renderToStaticMarkup(createElement(VehicleTags, { vehicle }));

  it("se ven", () => {
    assert.ok(html.includes("Deportivo"));
    assert.ok(html.includes("Lujo"));
  });

  it("NO son enlaces: no llevan a ningún sitio", () => {
    assert.ok(!hasLink(html), "una etiqueta sigue siendo un enlace");
    assert.ok(!html.includes("href"), "una etiqueta lleva href");
    assert.ok(!html.includes("<button"));
  });

  it("sin etiquetas no se dibuja nada", () => {
    assert.equal(
      renderToStaticMarkup(createElement(VehicleTags, { vehicle: makeVehicle({ tags: [] }) })),
      "",
    );
  });
});

describe("la tarjeta «Acerca de este vehículo»", () => {
  const vehicle = makeVehicle({
    description: "Un vehículo en excelente estado.\n\nSe entrega con documentación completa.",
    tags: ["Familiar"],
    funFact: { enabled: true, title: "¿Sabías que?", body: "Un dato curioso." },
  });
  const html = renderToStaticMarkup(createElement(VehicleAbout, { vehicle }));

  it("trae el relato, el carácter y el apunte", () => {
    assert.ok(html.includes("Un vehículo en excelente estado."));
    assert.ok(html.includes("Se entrega con documentación completa."));
    assert.ok(html.includes("Familiar"));
    assert.ok(html.includes("Un dato curioso."));
  });

  it("el carácter va antes del apunte, no después", () => {
    assert.ok(html.indexOf("Familiar") < html.indexOf("Un dato curioso."));
  });

  it("no tiene ningún enlace: nada que lleve a otra página", () => {
    assert.ok(!hasLink(html));
  });

  it("sin carácter ni apunte, el texto no deja una columna vacía", () => {
    const plain = renderToStaticMarkup(
      createElement(VehicleAbout, {
        vehicle: makeVehicle({
          description: "Solo texto.",
          tags: [],
          funFact: { enabled: false },
        }),
      }),
    );
    assert.ok(plain.includes("Solo texto."));
    assert.ok(!plain.includes("lg:grid-cols-"), "reserva una columna que no usa");
  });

  it("un apunte apagado no se dibuja aunque tenga texto", () => {
    const off = renderToStaticMarkup(
      createElement(VehicleAbout, {
        vehicle: makeVehicle({
          description: "Texto.",
          funFact: { enabled: false, body: "No debería verse." },
        }),
      }),
    );
    assert.ok(!off.includes("No debería verse."));
  });
});

describe("«Acerca de este vehículo» es una tarjeta desplegable más", () => {
  const sections: DetailSection[] = [
    {
      id: "acerca",
      title: "Acerca de este vehículo",
      children: createElement("p", null, "El relato"),
    },
    {
      id: "especificaciones",
      title: "Especificaciones",
      children: createElement("p", null, "Cilindrada 2.998 cc"),
    },
    {
      id: "equipamiento",
      title: "Equipamiento",
      children: createElement("p", null, "Harman Kardon"),
    },
  ];
  const html = renderToStaticMarkup(createElement(VehicleDetails, { sections }));

  it("tiene su botón: se puede plegar, como las demás", () => {
    // Una tarjeta, un botón: las tres son desplegables.
    assert.equal((html.match(/<button/g) ?? []).length, 3);
    const first = html.slice(0, html.indexOf("Especificaciones"));
    assert.ok(first.includes("Acerca de este vehículo"));
    assert.ok(first.includes("<button"), "«Acerca de este vehículo» no tiene botón");
    assert.ok(first.includes('aria-expanded="true"'));
  });

  it("es la primera y nace abierta: el relato se ve sin pulsar nada", () => {
    assert.deepEqual(attrs(html, "aria-expanded"), ["true", "false", "false"]);
    // El atributo `hidden`, no la clase `overflow-hidden` del marco.
    const hiddenAttribute = /\shidden(=|\s|>)/;
    const first = html.slice(0, html.indexOf("Especificaciones"));
    // La comprobación de que el patrón de verdad detecta un panel cerrado: sin
    // esto, una expresión mal escrita pasaría sin probar nada.
    assert.ok(hiddenAttribute.test(html), "el patrón no detecta ni el panel cerrado");
    assert.ok(!hiddenAttribute.test(first), "el relato nace oculto");
  });

  it("las tres son regiones que se anuncian con su propio botón", () => {
    assert.equal((html.match(/role="region"/g) ?? []).length, 3);
  });

  it("el texto de las tres está en el HTML aunque estén cerradas", () => {
    for (const fragment of ["El relato", "Cilindrada 2.998 cc", "Harman Kardon"]) {
      assert.ok(html.includes(fragment), `falta «${fragment}»`);
    }
  });
});

describe("contacto desde la ficha: solo WhatsApp", () => {
  const vehicle = makeVehicle({ slug: "bmw-x5", make: "BMW", model: "X5", year: 2021 });
  const links = (html: string) => attrs(html, "href");

  for (const variant of ["summary", "closing"] as const) {
    const html = renderToStaticMarkup(
      createElement(VehicleContactActions, { vehicle, variant }),
    );

    it(`${variant}: no hay formularios ni botones que abran uno`, () => {
      assert.ok(!html.includes("<button"));
      assert.ok(!/Solicitar información/i.test(html));
      assert.ok(!/Agendar cita/i.test(html));
      assert.ok(!html.includes("role=\"dialog\""));
    });

    it(`${variant}: todo lo que se ofrece va a la línea de WhatsApp`, () => {
      assert.ok(links(html).length >= 1);
      for (const href of links(html)) {
        assert.match(href, /^https:\/\/wa\.me\/57\d{10}\?text=/);
      }
    });
  }

  it("el resumen de arriba tiene UNA sola acción", () => {
    const html = renderToStaticMarkup(
      createElement(VehicleContactActions, { vehicle, variant: "summary" }),
    );
    assert.equal(links(html).length, 1);
    assert.ok(html.includes("Escribir por WhatsApp"));
  });

  it("la franja roja ofrece preguntar y pedir una visita, las dos por WhatsApp", () => {
    const html = renderToStaticMarkup(
      createElement(VehicleContactActions, { vehicle, variant: "closing" }),
    );
    assert.equal(links(html).length, 2);
    assert.ok(html.includes("Escribir por WhatsApp"));
    assert.ok(html.includes("Agendar una visita"));
    const messages = links(html).map((href) =>
      decodeURIComponent(new URL(href).searchParams.get("text") ?? ""),
    );
    assert.match(messages[0], /me interesa el BMW X5 xDrive40i 2021/);
    assert.match(messages[1], /agendar una visita para ver el BMW X5 xDrive40i 2021/);
  });

  it("cada botón se cuenta con su motivo, para saber cuál se usa", () => {
    const html = renderToStaticMarkup(
      createElement(VehicleContactActions, { vehicle, variant: "closing" }),
    );
    assert.deepEqual(attrs(html, "data-wa-intent"), ["vehiculo", "cita"]);
    assert.deepEqual(attrs(html, "data-wa-slug"), ["bmw-x5", "bmw-x5"]);
  });

  it("solo la franja es el ancla de la barra fija del teléfono", () => {
    const summary = renderToStaticMarkup(
      createElement(VehicleContactActions, { vehicle, variant: "summary" }),
    );
    const closing = renderToStaticMarkup(
      createElement(VehicleContactActions, { vehicle, variant: "closing" }),
    );
    assert.ok(!summary.includes('id="contactar"'));
    assert.ok(closing.includes('id="contactar"'));
  });
});
