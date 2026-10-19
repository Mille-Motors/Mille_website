import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPEN_PRIVACY_STATUSES,
  PRIVACY_REQUEST_STATUSES,
  PRIVACY_REQUEST_TERMS,
  PRIVACY_REQUEST_TYPES,
  PRIVACY_REQUEST_TYPE_LABELS,
  businessDaysUntil,
  isOpenPrivacyStatus,
  privacyRequestDeadlines,
  trackForType,
} from "@/lib/privacy-requests";
import {
  adminPrivacyQuerySchema,
  privacyRequestCreateSchema,
  privacyRequestPatchSchema,
} from "@/server/privacy/schemas";

/**
 * Los trámites de derechos del Titular y, sobre todo, sus PLAZOS.
 *
 * El plazo es lo que distingue esta bandeja de la de solicitudes
 * comerciales: aquí lo que no se atiende a tiempo se incumple. Que la vía y
 * el vencimiento se deduzcan del tipo —y no los teclee alguien— es lo que
 * evita que un reclamo acabe tramitado como consulta por descuido.
 */

describe("vía del trámite", () => {
  it("manda por consulta lo que es acceso a la información", () => {
    // Art. 14 de la Ley 1581 de 2012.
    for (const type of ["access", "proof_of_consent", "use_information"] as const) {
      assert.equal(trackForType(type), "consulta", type);
    }
  });

  it("manda por reclamo la corrección, la supresión y la revocatoria", () => {
    // Art. 15 de la Ley 1581 de 2012, y art. 9 del Decreto 1377 de 2013 para
    // revocatoria y supresión.
    for (const type of [
      "update",
      "rectification",
      "deletion",
      "revocation",
      "complaint",
    ] as const) {
      assert.equal(trackForType(type), "reclamo", type);
    }
  });

  it("ante la duda aplica el plazo más CORTO", () => {
    // `other` va por consulta: responder antes nunca incumple; responder
    // después, sí.
    assert.equal(trackForType("other"), "consulta");
    assert.ok(
      PRIVACY_REQUEST_TERMS.consulta.base < PRIVACY_REQUEST_TERMS.reclamo.base,
    );
  });

  it("clasifica todos los tipos, sin dejar ninguno fuera", () => {
    for (const type of PRIVACY_REQUEST_TYPES) {
      assert.ok(["consulta", "reclamo"].includes(trackForType(type)), type);
      assert.ok(PRIVACY_REQUEST_TYPE_LABELS[type], `falta etiqueta de ${type}`);
    }
  });
});

describe("plazos legales", () => {
  it("son los de la ley: diez y quince días hábiles", () => {
    assert.equal(PRIVACY_REQUEST_TERMS.consulta.base, 10);
    assert.equal(PRIVACY_REQUEST_TERMS.consulta.extension, 5);
    assert.equal(PRIVACY_REQUEST_TERMS.reclamo.base, 15);
    assert.equal(PRIVACY_REQUEST_TERMS.reclamo.extension, 8);
  });

  it("citan su artículo", () => {
    assert.match(PRIVACY_REQUEST_TERMS.consulta.article, /art\. 14/);
    assert.match(PRIVACY_REQUEST_TERMS.reclamo.article, /art\. 15/);
  });

  it("cuenta diez hábiles para una consulta, saltando el festivo", () => {
    // Recibida el lunes 19 de octubre de 2026. El 2 de noviembre es festivo
    // trasladado, así que el décimo hábil cae el 3.
    const { track, dueOn } = privacyRequestDeadlines("access", "2026-10-19");
    assert.equal(track, "consulta");
    assert.equal(dueOn, "2026-11-03");
  });

  it("cuenta quince hábiles para un reclamo", () => {
    const { track, dueOn } = privacyRequestDeadlines("deletion", "2026-10-19");
    assert.equal(track, "reclamo");
    assert.equal(dueOn, "2026-11-10");
  });

  it("la prórroga va DESPUÉS del vencimiento, no en paralelo", () => {
    const { dueOn, extendedDueOn } = privacyRequestDeadlines(
      "access",
      "2026-10-19",
    );
    assert.ok(extendedDueOn > dueOn);
  });

  it("un reclamo nunca vence antes que una consulta del mismo día", () => {
    const consulta = privacyRequestDeadlines("access", "2026-03-02");
    const reclamo = privacyRequestDeadlines("rectification", "2026-03-02");
    assert.ok(reclamo.dueOn > consulta.dueOn);
  });
});

describe("cuántos días quedan", () => {
  it("es cero el día del vencimiento", () => {
    assert.equal(businessDaysUntil("2026-10-19", "2026-10-19"), 0);
  });

  it("es positivo mientras falte", () => {
    assert.equal(businessDaysUntil("2026-10-20", "2026-10-19"), 1);
  });

  it("es negativo cuando ya venció", () => {
    assert.equal(businessDaysUntil("2026-10-19", "2026-10-20"), -1);
  });

  it("cuenta hábiles y no días de calendario", () => {
    // Del viernes 16 al lunes 19 hay tres días de calendario y uno hábil.
    assert.equal(businessDaysUntil("2026-10-19", "2026-10-16"), 1);
  });
});

describe("estados", () => {
  it("el plazo corre solo en los abiertos", () => {
    assert.deepEqual(
      [...OPEN_PRIVACY_STATUSES],
      ["received", "in_progress", "needs_info"],
    );
    for (const status of ["answered", "rejected", "closed"] as const) {
      assert.equal(isOpenPrivacyStatus(status), false, status);
    }
  });

  it("distingue «no procede» de «atendida»", () => {
    // Cerrar como atendida una supresión que se negó esconde que se negó y
    // por qué. Son dos desenlaces distintos.
    assert.ok(PRIVACY_REQUEST_STATUSES.includes("rejected"));
    assert.ok(PRIVACY_REQUEST_STATUSES.includes("answered"));
  });
});

describe("validación del registro", () => {
  const valid = {
    type: "deletion" as const,
    channel: "email" as const,
    receivedOn: "2026-10-19",
    titularName: "Ana Ruiz",
    titularEmail: "ana@correo.com",
  };

  it("acepta un registro completo", () => {
    const parsed = privacyRequestCreateSchema.parse(valid);
    assert.equal(parsed.titularEmail, "ana@correo.com");
    // Sin marcar, la identidad NO se da por acreditada.
    assert.equal(parsed.identityVerified, false);
  });

  /** Lo mismo, pero sin ningún canal de respuesta. */
  const withoutContact = {
    type: valid.type,
    channel: valid.channel,
    receivedOn: valid.receivedOn,
    titularName: valid.titularName,
  };

  it("exige una forma de responder", () => {
    // Sin canal de respuesta el derecho no se puede atender. La base tiene el
    // mismo CHECK; esto solo da un mensaje entendible antes de llegar.
    assert.throws(() => privacyRequestCreateSchema.parse(withoutContact));
  });

  it("acepta solo el teléfono", () => {
    const parsed = privacyRequestCreateSchema.parse({
      ...withoutContact,
      titularPhone: "+57 310 555 4433",
    });
    assert.equal(parsed.titularPhone, "+57 310 555 4433");
  });

  it("rechaza una fecha de recibo con otro formato", () => {
    assert.throws(() =>
      privacyRequestCreateSchema.parse({ ...valid, receivedOn: "19/10/2026" }),
    );
  });

  it("rechaza un tipo que no es un derecho reconocido", () => {
    assert.throws(() =>
      privacyRequestCreateSchema.parse({ ...valid, type: "quiero-un-porsche" }),
    );
  });

  it("no deja mover la fecha de recibo al editar", () => {
    // De ella cuelga el vencimiento: permitir moverla sería permitir mover un
    // plazo legal.
    const parsed = privacyRequestPatchSchema.parse({
      status: "in_progress",
      receivedOn: "2020-01-01",
    }) as Record<string, unknown>;
    assert.equal(parsed.receivedOn, undefined);
  });

  it("rechaza una edición vacía", () => {
    // Un cuerpo vacío no es una edición y no debe dejar una línea de
    // auditoría que no describe ningún cambio.
    assert.throws(() => privacyRequestPatchSchema.parse({}));
  });
});

describe("filtros de la bandeja", () => {
  it("abre por defecto la bandeja donde corre el plazo", () => {
    assert.equal(adminPrivacyQuerySchema.parse({}).view, "abiertas");
  });

  it("descarta un estado que no existe", () => {
    assert.throws(() => adminPrivacyQuerySchema.parse({ status: "pendiente" }));
  });
});
