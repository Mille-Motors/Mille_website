import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminVehicleQuerySchema } from "@/server/vehicles/schemas";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";

/**
 * Lo que llega en la URL acaba en una consulta a la base. Un parámetro
 * inventado no puede colarse, y uno vacío no puede convertirse en un filtro
 * por cadena vacía que no devolvería nada.
 */
describe("consulta de vehículos del admin", () => {
  it("sin parámetros ordena por actualizados y empieza en la página 1", () => {
    const q = adminVehicleQuerySchema.parse({});
    assert.equal(q.sort, "updated");
    assert.equal(q.page, 1);
    assert.equal(q.limit, 25);
  });

  it("acepta la combinación completa de filtros", () => {
    const q = adminVehicleQuerySchema.parse({
      q: "bmw",
      vehicleType: "auto",
      publication: "published",
      availability: "available",
      make: "BMW",
      categoryId: "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f",
      minYear: "2019",
      maxYear: "2024",
      minPrice: "100000000",
      maxPrice: "400000000",
      sort: "price-asc",
      page: "2",
    });
    assert.equal(q.make, "BMW");
    assert.equal(q.minYear, 2019);
    assert.equal(q.maxPrice, 400_000_000);
    assert.equal(q.sort, "price-asc");
    assert.equal(q.page, 2);
  });

  it("un parámetro vacío es ausencia de filtro, no filtro vacío", () => {
    const q = adminVehicleQuerySchema.parse({
      q: "",
      make: "",
      categoryId: "",
      minYear: "",
      minPrice: "",
    });
    assert.equal(q.q, undefined);
    assert.equal(q.make, undefined);
    assert.equal(q.categoryId, undefined);
    assert.equal(q.minYear, undefined);
    assert.equal(q.minPrice, undefined);
  });

  it("recorta los espacios de la búsqueda", () => {
    assert.equal(adminVehicleQuerySchema.parse({ q: "  bmw  " }).q, "bmw");
  });

  it("rechaza enums y orden inventados", () => {
    assert.throws(() => adminVehicleQuerySchema.parse({ vehicleType: "camion" }));
    assert.throws(() => adminVehicleQuerySchema.parse({ publication: "oculto" }));
    assert.throws(() => adminVehicleQuerySchema.parse({ sort: "aleatorio" }));
  });

  it("rechaza una categoría que no es un uuid", () => {
    assert.throws(() => adminVehicleQuerySchema.parse({ categoryId: "suv" }));
  });

  it("rechaza una página o un tamaño imposibles", () => {
    assert.throws(() => adminVehicleQuerySchema.parse({ page: "0" }));
    assert.throws(() => adminVehicleQuerySchema.parse({ limit: "5000" }));
  });

  it("rechaza años y precios fuera de rango", () => {
    assert.throws(() => adminVehicleQuerySchema.parse({ minYear: "1500" }));
    assert.throws(() => adminVehicleQuerySchema.parse({ maxPrice: "-5" }));
  });
});

describe("consulta de solicitudes del admin", () => {
  it("por defecto: 25 por página, página 1, sin filtros", () => {
    const q = adminInquiryQuerySchema.parse({});
    assert.equal(q.limit, 25);
    assert.equal(q.page, 1);
    assert.equal(q.status, undefined);
    assert.equal(q.type, undefined);
    assert.equal(q.vehicleId, undefined);
  });

  it("acepta estado, tipo, tipo de vehículo y búsqueda", () => {
    const q = adminInquiryQuerySchema.parse({
      status: "new",
      type: "appointment",
      vehicleType: "moto",
      q: "ana",
    });
    assert.equal(q.status, "new");
    assert.equal(q.type, "appointment");
    assert.equal(q.vehicleType, "moto");
    assert.equal(q.q, "ana");
  });

  it("'none' significa sin vehículo asociado", () => {
    assert.equal(adminInquiryQuerySchema.parse({ vehicleId: "none" }).vehicleId, "none");
  });

  it("acepta un uuid de vehículo", () => {
    const id = "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f";
    assert.equal(adminInquiryQuerySchema.parse({ vehicleId: id }).vehicleId, id);
  });

  it("rechaza un vehicleId que no es uuid ni 'none'", () => {
    assert.throws(() => adminInquiryQuerySchema.parse({ vehicleId: "bmw-x5" }));
  });

  it("rechaza estados y tipos inventados", () => {
    assert.throws(() => adminInquiryQuerySchema.parse({ status: "archivada" }));
    assert.throws(() => adminInquiryQuerySchema.parse({ type: "reclamo" }));
  });
});
