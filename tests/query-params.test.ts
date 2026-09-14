import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTolerant } from "@/lib/query-params";
import { adminVehicleQuerySchema } from "@/server/vehicles/schemas";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";

/**
 * Un parámetro roto no puede llevarse por delante los que sí son válidos:
 * la pantalla acabaría mostrando el inventario completo mientras la URL
 * sigue diciendo que está filtrado.
 */
describe("parseo tolerante de vehículos", () => {
  it("conserva los filtros válidos y descarta solo el roto", () => {
    const q = parseTolerant(adminVehicleQuerySchema, {
      publication: "published",
      vehicleType: "auto",
      page: "abc",
    });
    assert.equal(q.publication, "published");
    assert.equal(q.vehicleType, "auto");
    assert.equal(q.page, 1);
  });

  it("descarta varios parámetros inválidos a la vez", () => {
    const q = parseTolerant(adminVehicleQuerySchema, {
      make: "BMW",
      page: "0",
      limit: "5000",
      categoryId: "no-es-uuid",
      sort: "aleatorio",
    });
    assert.equal(q.make, "BMW");
    assert.equal(q.page, 1);
    assert.equal(q.limit, 25);
    assert.equal(q.categoryId, undefined);
    assert.equal(q.sort, "updated");
  });

  it("una entrada totalmente válida pasa intacta", () => {
    const q = parseTolerant(adminVehicleQuerySchema, {
      q: "bmw", publication: "draft", sort: "price-asc", page: "3",
    });
    assert.equal(q.q, "bmw");
    assert.equal(q.publication, "draft");
    assert.equal(q.sort, "price-asc");
    assert.equal(q.page, 3);
  });

  it("una entrada sin nada válido cae a los valores por defecto", () => {
    const q = parseTolerant(adminVehicleQuerySchema, {
      publication: "inventado", vehicleType: "camion", sort: "azar",
    });
    assert.equal(q.publication, undefined);
    assert.equal(q.vehicleType, undefined);
    assert.equal(q.sort, "updated");
    assert.equal(q.page, 1);
  });

  it("page=999 es válido: el clamp lo resuelve la página, no el schema", () => {
    assert.equal(parseTolerant(adminVehicleQuerySchema, { page: "999" }).page, 999);
  });

  it("ignora claves que el schema no conoce", () => {
    const q = parseTolerant(adminVehicleQuerySchema, { make: "Audi", utm_source: "x" });
    assert.equal(q.make, "Audi");
  });
});

describe("parseo tolerante de solicitudes", () => {
  it("conserva la bandeja aunque la página sea inválida", () => {
    const q = parseTolerant(adminInquiryQuerySchema, { view: "cerradas", page: "abc" });
    assert.equal(q.view, "cerradas");
    assert.equal(q.page, 1);
  });

  it("descarta un vehicleId malformado sin perder el resto", () => {
    const q = parseTolerant(adminInquiryQuerySchema, {
      view: "spam", type: "general", vehicleId: "no-es-uuid",
    });
    assert.equal(q.view, "spam");
    assert.equal(q.type, "general");
    assert.equal(q.vehicleId, undefined);
  });

  it("un estado incompatible con la bandeja se ignora, la bandeja manda", () => {
    const q = parseTolerant(adminInquiryQuerySchema, { view: "spam", status: "new" });
    assert.equal(q.view, "spam");
    assert.equal(q.status, undefined);
  });
});
