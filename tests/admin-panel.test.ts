import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attentionItems } from "@/components/admin/DashboardBlocks";
import {
  formatDateShort,
  formatDateTimeLong,
  formatDateTimeShort,
  formatRelative,
} from "@/lib/format";
import type { InventoryStats } from "@/types/vehicle";

/**
 * El Panel y las fechas que enseñan las pantallas internas.
 *
 * Las fechas se arman por partes y con la zona de Bogotá a propósito: el
 * servidor las pinta en UTC y el navegador en la hora local, y un carácter
 * distinto —el espacio de «p. m.» no es el mismo en todos los entornos— basta
 * para que React descarte el HTML del servidor entero.
 */

const empty: InventoryStats = {
  total: 0,
  published: 0,
  draft: 0,
  archived: 0,
  available: 0,
  reserved: 0,
  sold: 0,
  newInquiries: 0,
};

const calm = { open: 0, overdue: 0 };

describe("fechas con hora de las pantallas internas", () => {
  it("la fecha larga lleva el año y la hora de Bogotá", () => {
    assert.equal(formatDateTimeLong("2026-10-20T17:29:00.000Z"), "20 oct 2026, 12:29 p. m.");
  });

  it("la corta no lleva año", () => {
    assert.equal(formatDateTimeShort("2026-10-20T17:29:00.000Z"), "20 oct, 12:29 p. m.");
  });

  it("no deja espacios especiales: servidor y navegador escriben lo mismo", () => {
    for (const text of [
      formatDateTimeLong("2026-10-20T17:29:00.000Z"),
      formatDateTimeShort("2026-10-20T17:29:00.000Z"),
      formatDateTimeLong("2026-10-20T03:05:00.000Z"),
    ]) {
      assert.ok(!/[  ]/.test(text), JSON.stringify(text));
    }
  });

  it("cuenta el día en Bogotá y no en UTC", () => {
    // 03:05 UTC del 20 son las 22:05 del 19 en Bogotá.
    assert.equal(formatDateTimeLong("2026-10-20T03:05:00.000Z"), "19 oct 2026, 10:05 p. m.");
  });
});

describe("hace cuánto", () => {
  const now = new Date("2026-10-20T18:00:00.000Z");

  it("minutos, horas, ayer y días", () => {
    assert.equal(formatRelative("2026-10-20T17:42:00.000Z", now), "hace 18 minutos");
    assert.equal(formatRelative("2026-10-20T15:00:00.000Z", now), "hace 3 horas");
    assert.equal(formatRelative("2026-10-19T18:00:00.000Z", now), "ayer");
    assert.equal(formatRelative("2026-10-16T18:00:00.000Z", now), "hace 4 días");
  });

  it("lo que acaba de pasar es «ahora»", () => {
    assert.equal(formatRelative("2026-10-20T17:59:40.000Z", now), "ahora");
  });

  it("pasada una semana da la fecha, no «hace 12 días»", () => {
    assert.equal(
      formatRelative("2026-10-08T18:00:00.000Z", now),
      formatDateShort("2026-10-08T18:00:00.000Z"),
    );
  });
});

describe("«Para atender» del Panel", () => {
  it("sin nada pendiente no lista nada", () => {
    assert.deepEqual(attentionItems({ stats: empty, privacy: calm, legalGaps: 0 }), []);
  });

  it("solo aparece lo que tiene algo pendiente", () => {
    const items = attentionItems({
      stats: { ...empty, newInquiries: 2, draft: 3 },
      privacy: calm,
      legalGaps: 0,
    });
    assert.deepEqual(
      items.map((item) => item.key),
      ["inquiries", "drafts"],
    );
  });

  it("lo vencido va primero y es urgente", () => {
    const items = attentionItems({
      stats: { ...empty, newInquiries: 1, reserved: 1, draft: 1 },
      privacy: { open: 3, overdue: 1 },
      legalGaps: 2,
    });
    assert.equal(items[0].key, "privacy-overdue");
    assert.equal(items[0].tone, "urgent");
    assert.deepEqual(
      items.map((item) => item.key),
      ["privacy-overdue", "inquiries", "legal", "reserved", "drafts"],
    );
  });

  it("con plazos vencidos no repite las abiertas dentro de plazo", () => {
    const keys = attentionItems({
      stats: empty,
      privacy: { open: 3, overdue: 1 },
      legalGaps: 0,
    }).map((item) => item.key);
    assert.ok(keys.includes("privacy-overdue"));
    assert.ok(!keys.includes("privacy-open"));
  });

  it("sin vencidas, las abiertas son normales y no urgentes", () => {
    const [item] = attentionItems({
      stats: empty,
      privacy: { open: 2, overdue: 0 },
      legalGaps: 0,
    });
    assert.equal(item.key, "privacy-open");
    assert.equal(item.tone, "normal");
  });

  it("concuerda el singular y el plural", () => {
    const [one] = attentionItems({ stats: { ...empty, newInquiries: 1 }, privacy: calm, legalGaps: 0 });
    const [many] = attentionItems({ stats: { ...empty, newInquiries: 4 }, privacy: calm, legalGaps: 0 });
    assert.equal(one.title, "1 consulta nueva");
    assert.equal(many.title, "4 consultas nuevas");
  });

  it("cada renglón lleva a la lista que cuenta", () => {
    const items = attentionItems({
      stats: { ...empty, newInquiries: 1, reserved: 1, draft: 1 },
      privacy: { open: 1, overdue: 0 },
      legalGaps: 1,
    });
    const hrefs = Object.fromEntries(items.map((item) => [item.key, item.href]));
    assert.equal(hrefs.inquiries, "/admin/solicitudes?status=new");
    assert.equal(hrefs.reserved, "/admin/vehiculos?availability=reserved");
    assert.equal(hrefs.drafts, "/admin/vehiculos?publication=draft");
    assert.equal(hrefs["privacy-open"], "/admin/privacidad");
    assert.equal(hrefs.legal, "/admin/configuracion");
  });
});
