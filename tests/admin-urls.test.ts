import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminInquiriesHref, adminVehiclesHref } from "@/lib/admin-urls";
import { adminVehicleQuerySchema } from "@/server/vehicles/schemas";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";

/**
 * Estos constructores los usan los dos lados: los componentes de cliente al
 * navegar y las páginas de servidor al corregir una página fuera de rango.
 * Por eso viven en un módulo puro — importarlos desde un módulo "use client"
 * hacía que el servidor recibiera una referencia de cliente en vez de la
 * función, y llamarla reventaba.
 *
 * Que este test los importe sin arrastrar React ni nada del navegador es, en
 * sí mismo, parte de lo que se comprueba.
 */
describe("URLs del listado de vehículos", () => {
  it("la vista por defecto no ensucia la URL", () => {
    assert.equal(adminVehiclesHref({}), "/admin/vehiculos");
    assert.equal(
      adminVehiclesHref({ sort: "updated", page: 1 }),
      "/admin/vehiculos",
    );
  });

  it("incluye los filtros elegidos", () => {
    assert.equal(
      adminVehiclesHref({ publication: "published", vehicleType: "auto", make: "BMW" }),
      "/admin/vehiculos?vehicleType=auto&publication=published&make=BMW",
    );
  });

  it("conserva los filtros al saltar de página", () => {
    const href = adminVehiclesHref({ publication: "draft", make: "Audi", page: 3 });
    assert.ok(href.includes("publication=draft"));
    assert.ok(href.includes("make=Audi"));
    assert.ok(href.includes("page=3"));
  });

  it("ida y vuelta: lo construido se vuelve a leer igual", () => {
    const query = adminVehicleQuerySchema.parse({
      q: "bmw", vehicleType: "auto", publication: "published",
      make: "BMW", sort: "price-asc", page: "2",
    });
    const params = Object.fromEntries(
      new URLSearchParams(adminVehiclesHref(query).split("?")[1]),
    );
    const again = adminVehicleQuerySchema.parse(params);
    assert.equal(again.q, query.q);
    assert.equal(again.publication, query.publication);
    assert.equal(again.make, query.make);
    assert.equal(again.sort, query.sort);
    assert.equal(again.page, query.page);
  });

  it("corregir a la última página conserva el resto", () => {
    const query = adminVehicleQuerySchema.parse({ publication: "published", page: "999" });
    assert.equal(
      adminVehiclesHref({ ...query, page: 2 }),
      "/admin/vehiculos?publication=published&page=2",
    );
  });
});

describe("URLs de solicitudes", () => {
  it("la bandeja activa es la de por defecto", () => {
    assert.equal(adminInquiriesHref({}), "/admin/solicitudes");
    assert.equal(adminInquiriesHref({ view: "activas" }), "/admin/solicitudes");
  });

  it("las otras bandejas sí aparecen", () => {
    assert.equal(adminInquiriesHref({ view: "cerradas" }), "/admin/solicitudes?view=cerradas");
    assert.equal(adminInquiriesHref({ view: "spam" }), "/admin/solicitudes?view=spam");
  });

  it("conserva bandeja y filtros al paginar", () => {
    const href = adminInquiriesHref({ view: "cerradas", type: "appointment", q: "ana", page: 2 });
    assert.ok(href.includes("view=cerradas"));
    assert.ok(href.includes("type=appointment"));
    assert.ok(href.includes("q=ana"));
    assert.ok(href.includes("page=2"));
  });

  it("ida y vuelta con la bandeja", () => {
    const query = adminInquiryQuerySchema.parse({ view: "spam", q: "ana" });
    const params = Object.fromEntries(
      new URLSearchParams(adminInquiriesHref(query).split("?")[1]),
    );
    const again = adminInquiryQuerySchema.parse(params);
    assert.equal(again.view, "spam");
    assert.equal(again.q, "ana");
  });

  it("escapa lo que haga falta en la búsqueda", () => {
    assert.ok(adminInquiriesHref({ q: "a b&c" }).includes("q=a+b%26c"));
  });
});
