import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INQUIRY_VIEWS,
  allowsDeletion,
  inquiryViewStatuses,
  isStatusInView,
  viewForStatus,
} from "@/lib/inquiry-views";
import { INQUIRY_STATUSES } from "@/types/vehicle";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";

/**
 * Una solicitud cerrada deja de ser trabajo pendiente pero no deja de
 * existir. Estas pruebas fijan qué vive en cada bandeja y, sobre todo, que
 * ningún estado se quede sin bandeja.
 */
describe("bandejas", () => {
  it("las activas son las que aún hay que atender", () => {
    assert.deepEqual(inquiryViewStatuses.activas, ["new", "contacted"]);
  });

  it("cerradas y spam están cada una en la suya", () => {
    assert.deepEqual(inquiryViewStatuses.cerradas, ["closed"]);
    assert.deepEqual(inquiryViewStatuses.spam, ["spam"]);
  });

  it("todo estado pertenece exactamente a una bandeja", () => {
    for (const status of INQUIRY_STATUSES) {
      const views = INQUIRY_VIEWS.filter((v) => isStatusInView(status, v));
      assert.equal(views.length, 1, `${status} está en ${views.length} bandejas`);
    }
  });

  it("ni CLOSED ni SPAM aparecen entre las activas", () => {
    assert.equal(isStatusInView("closed", "activas"), false);
    assert.equal(isStatusInView("spam", "activas"), false);
  });

  it("cada estado sabe volver a su bandeja", () => {
    assert.equal(viewForStatus("new"), "activas");
    assert.equal(viewForStatus("contacted"), "activas");
    assert.equal(viewForStatus("closed"), "cerradas");
    assert.equal(viewForStatus("spam"), "spam");
  });

  it("solo se puede borrar donde la solicitud ya salió del flujo", () => {
    assert.equal(allowsDeletion("activas"), false);
    assert.equal(allowsDeletion("cerradas"), true);
    assert.equal(allowsDeletion("spam"), true);
  });
});

describe("consulta de solicitudes con bandeja", () => {
  it("sin nada se abre la bandeja de trabajo", () => {
    const q = adminInquiryQuerySchema.parse({});
    assert.equal(q.view, "activas");
    assert.equal(q.status, undefined);
    assert.equal(q.page, 1);
    assert.equal(q.limit, 25);
  });

  it("un estado suelto abre su propia bandeja", () => {
    assert.equal(adminInquiryQuerySchema.parse({ status: "closed" }).view, "cerradas");
    assert.equal(adminInquiryQuerySchema.parse({ status: "spam" }).view, "spam");
    // El enlace del dashboard sigue llevando a la bandeja activa.
    const fromDashboard = adminInquiryQuerySchema.parse({ status: "new" });
    assert.equal(fromDashboard.view, "activas");
    assert.equal(fromDashboard.status, "new");
  });

  it("el estado afina dentro de la bandeja cuando pertenece a ella", () => {
    const q = adminInquiryQuerySchema.parse({ view: "activas", status: "contacted" });
    assert.equal(q.view, "activas");
    assert.equal(q.status, "contacted");
  });

  it("un estado ajeno a la bandeja se ignora en vez de no devolver nada", () => {
    const q = adminInquiryQuerySchema.parse({ view: "activas", status: "closed" });
    assert.equal(q.view, "activas");
    assert.equal(q.status, undefined);
  });

  it("conserva los filtros existentes dentro de cualquier bandeja", () => {
    const q = adminInquiryQuerySchema.parse({
      view: "cerradas", type: "appointment", vehicleType: "moto", q: "ana", page: "2",
    });
    assert.equal(q.view, "cerradas");
    assert.equal(q.type, "appointment");
    assert.equal(q.vehicleType, "moto");
    assert.equal(q.q, "ana");
    assert.equal(q.page, 2);
  });

  it("rechaza una bandeja inventada", () => {
    assert.throws(() => adminInquiryQuerySchema.parse({ view: "papelera" }));
  });
});
