import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { site } from "@/data/site";
import {
  WHATSAPP_CLICK_INTENTS,
  WHATSAPP_CLICK_SOURCES,
} from "@/lib/whatsapp-click";
import { attentionStatus, hourLabel } from "@/lib/whatsapp-hours";
import {
  generalWhatsappUrl,
  intentWhatsappUrl,
  vehicleVisitWhatsappMessage,
  vehicleVisitWhatsappUrl,
  vehicleWhatsappMessage,
  vehicleWhatsappUrl,
  type WhatsappIntent,
} from "@/lib/whatsapp";
import { createRateLimiter } from "@/lib/rate-limiter";
import { whatsappClickSchema } from "@/server/whatsapp/schemas";
import { makeVehicle } from "./support/vehicle";

/**
 * El botón de WhatsApp: a qué número llega, qué mensaje lleva cada motivo y
 * qué se acepta contar. Es lo que un cliente toca primero, así que un número
 * mal escrito o un mensaje que pierde el vehículo se pagan en conversaciones.
 */

/** Lo que WhatsApp mostrará como mensaje, decodificado de la URL. */
function messageOf(url: string | null): string {
  assert.ok(url, "se esperaba una URL de WhatsApp");
  return decodeURIComponent(new URL(url).searchParams.get("text") ?? "");
}

describe("la línea de WhatsApp", () => {
  it("es un número internacional de Colombia, solo dígitos, como exige wa.me", () => {
    assert.ok(site.phone);
    assert.match(site.phone.number, /^57\d{10}$/);
    assert.equal(site.phone.display, "+57 312 638 5028");
  });

  it("todos los enlaces apuntan a ese número", () => {
    const url = generalWhatsappUrl();
    assert.ok(url?.startsWith(`https://wa.me/${site.phone!.number}?text=`));
  });

  it("el horario es de 9 a. m. a 6 p. m., todos los días", () => {
    assert.deepEqual(
      { open: site.phone!.hours.openHour, close: site.phone!.hours.closeHour },
      { open: 9, close: 18 },
    );
  });
});

describe("el mensaje de cada motivo", () => {
  const cases: [WhatsappIntent, RegExp[]][] = [
    ["buscar", [/estoy buscando un vehículo/, /Me interesa:/, /Presupuesto aprox\.:/, /Ciudad:/]],
    ["vender", [/quiero vender mi vehículo/, /Marca\/modelo\/año:/, /Kilometraje:/, /Ciudad:/]],
    ["cita", [/agendar una cita/]],
    ["general", [/más información sobre los vehículos disponibles/]],
  ];

  for (const [intent, expected] of cases) {
    it(`"${intent}" lleva su mensaje ya escrito`, () => {
      const message = messageOf(intentWhatsappUrl(intent));
      assert.match(message, /^Hola MILLE,/);
      for (const part of expected) assert.match(message, part);
    });
  }

  it("las líneas para rellenar van en renglones separados, no en un solo párrafo", () => {
    assert.equal(messageOf(intentWhatsappUrl("buscar")).split("\n").length, 4);
  });
});

describe("el mensaje desde la ficha de un vehículo", () => {
  const vehicle = makeVehicle({ slug: "porsche-macan", make: "Porsche", model: "Macan", version: "", year: 2019, price: 289_900_000 });

  it("dice cuál es, su año y su precio", () => {
    const message = vehicleWhatsappMessage(vehicle);
    assert.match(message, /me interesa el Porsche Macan 2019/);
    assert.match(message, /\$ 289\.900\.000/);
    assert.match(message, /¿Sigue disponible\?/);
  });

  it("termina con el enlace a esa ficha, para abrirla con un toque", () => {
    const lines = messageOf(vehicleWhatsappUrl(vehicle)).split("\n");
    assert.equal(lines.at(-1), "https://millemotorculture.com/vehiculos/porsche-macan");
  });

  it("sin precio no escribe '$ 0'", () => {
    const message = vehicleWhatsappMessage({ ...vehicle, price: null });
    assert.doesNotMatch(message, /\$/);
  });
});

describe("pedir una visita desde la ficha: también es WhatsApp", () => {
  const vehicle = makeVehicle({ slug: "porsche-macan", make: "Porsche", model: "Macan", version: "", year: 2019, price: 289_900_000 });

  it("dice cuál quiere ver y pregunta por horarios", () => {
    const message = vehicleVisitWhatsappMessage(vehicle);
    assert.match(message, /^Hola MILLE, quisiera agendar una visita para ver el Porsche Macan 2019/);
    assert.match(message, /¿Qué días y horarios tienen disponibles\?/);
  });

  it("termina con el enlace a esa ficha", () => {
    const lines = messageOf(vehicleVisitWhatsappUrl(vehicle)).split("\n");
    assert.equal(lines.at(-1), "https://millemotorculture.com/vehiculos/porsche-macan");
  });

  it("va a la misma línea que todo lo demás", () => {
    assert.ok(
      vehicleVisitWhatsappUrl(vehicle)?.startsWith(`https://wa.me/${site.phone!.number}?text=`),
    );
  });

  it("no es el mismo mensaje que el de preguntar por disponibilidad", () => {
    assert.notEqual(vehicleVisitWhatsappMessage(vehicle), vehicleWhatsappMessage(vehicle));
  });
});

describe("la atención por horario (hora de Bogotá, UTC−5)", () => {
  const hours = site.phone!.hours;
  const at = (bogotaHour: number, minute = 0) =>
    new Date(Date.UTC(2026, 9, 17, bogotaHour + 5, minute));

  it("abre a las 9:00 y atiende hasta antes de las 6:00 p. m.", () => {
    assert.equal(attentionStatus(hours, at(8, 59)).open, false);
    assert.equal(attentionStatus(hours, at(9, 0)).open, true);
    assert.equal(attentionStatus(hours, at(17, 59)).open, true);
    assert.equal(attentionStatus(hours, at(18, 0)).open, false);
  });

  it("dentro de horario promete la respuesta de hoy", () => {
    assert.match(attentionStatus(hours, at(11)).text, /hoy, hasta las 6 p\. m\.$/);
  });

  it("ninguna frase acaba con doble punto", () => {
    for (const hour of [2, 11, 21]) {
      assert.doesNotMatch(attentionStatus(hours, at(hour)).text, /\.\./);
    }
  });

  it("de madrugada dice que responden hoy desde las 9; de noche, mañana", () => {
    assert.match(attentionStatus(hours, at(2)).text, /hoy desde las 9 a\. m\./);
    assert.match(attentionStatus(hours, at(21)).text, /mañana desde las 9 a\. m\./);
  });

  it("escribe las horas como se leen en español", () => {
    assert.equal(hourLabel(9), "9 a. m.");
    assert.equal(hourLabel(18), "6 p. m.");
    assert.equal(hourLabel(12), "12 m.");
    assert.equal(hourLabel(0), "12 a. m.");
  });
});

describe("el conteo de clics", () => {
  const valid = { source: "float", intent: "buscar", path: "/vehiculos" } as const;

  it("acepta un clic bien formado, con o sin vehículo", () => {
    assert.ok(whatsappClickSchema.parse(valid));
    assert.equal(
      whatsappClickSchema.parse({ ...valid, source: "vehicle-bar", intent: "vehiculo", vehicleSlug: "bmw-x5-xdrive40i", path: "/vehiculos/bmw-x5-xdrive40i" }).vehicleSlug,
      "bmw-x5-xdrive40i",
    );
  });

  it("acepta todas las fuentes y motivos que el sitio emite", () => {
    for (const source of WHATSAPP_CLICK_SOURCES) {
      assert.ok(whatsappClickSchema.safeParse({ ...valid, source }).success, source);
    }
    for (const intent of WHATSAPP_CLICK_INTENTS) {
      assert.ok(whatsappClickSchema.safeParse({ ...valid, intent }).success, intent);
    }
  });

  it("rechaza lo que no es suyo: fuente inventada, ruta sin '/', slug con forma rara", () => {
    assert.equal(whatsappClickSchema.safeParse({ ...valid, source: "otro" }).success, false);
    assert.equal(whatsappClickSchema.safeParse({ ...valid, path: "vehiculos" }).success, false);
    assert.equal(whatsappClickSchema.safeParse({ ...valid, vehicleSlug: "BMW X5" }).success, false);
    assert.equal(whatsappClickSchema.safeParse({ ...valid, vehicleSlug: "../../etc" }).success, false);
    assert.equal(whatsappClickSchema.safeParse({ ...valid, path: `/${"a".repeat(300)}` }).success, false);
  });

  it("no hay ningún campo que identifique a una persona", () => {
    const keys = Object.keys(whatsappClickSchema.shape);
    assert.deepEqual(keys.sort(), ["intent", "path", "source", "vehicleSlug"]);
  });
});

describe("el limitador del conteo", () => {
  it("deja pasar hasta el tope y corta después, por clave", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    assert.deepEqual([1, 2, 3, 4].map(() => limiter.take("a")), [true, true, true, false]);
    assert.equal(limiter.take("b"), true, "otra IP tiene su propio cupo");
  });
});
