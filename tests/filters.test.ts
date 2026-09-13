import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeFilterCount,
  buildQuery,
  inventoryHref,
  parseFilters,
} from "@/lib/filters";

/**
 * Los filtros del inventario son la URL. Lo que se parsea de ella acaba en
 * una consulta a la base, así que un parámetro inventado no puede colarse ni
 * ampliar los resultados en silencio.
 */
const makes = ["BMW", "Audi", "KTM"];
const categories = ["suv", "sedan", "adv"];

describe("lectura de los filtros de la URL", () => {
  it("sin parámetros devuelve el inventario entero, sin orden explícito", () => {
    const f = parseFilters({}, makes, categories);
    assert.equal(f.tipo, "all");
    assert.equal(f.orden, "recientes");
    assert.equal(f.categoria, undefined);
  });

  it("descarta un tipo que no existe", () => {
    assert.equal(parseFilters({ tipo: "camion" }, makes, categories).tipo, "all");
  });

  it("descarta una marca que no está en el inventario", () => {
    assert.equal(parseFilters({ marca: "Ferrari" }, makes, categories).marca, undefined);
    assert.equal(parseFilters({ marca: "BMW" }, makes, categories).marca, "BMW");
  });

  it("descarta una categoría que no pertenece al universo visible", () => {
    assert.equal(parseFilters({ categoria: "inventada" }, makes, categories).categoria, undefined);
    assert.equal(parseFilters({ categoria: "SUV" }, makes, categories).categoria, "suv");
  });

  it("descarta un orden que no existe", () => {
    assert.equal(parseFilters({ orden: "aleatorio" }, makes, categories).orden, "recientes");
  });

  it("lee un rango invertido como venía escrito, no como vacío", () => {
    const f = parseFilters({ minYear: "2024", maxYear: "2019" }, makes, categories);
    assert.equal(f.minYear, 2019);
    assert.equal(f.maxYear, 2024);
  });

  it("un límite ilegible es ausencia de límite, nunca cero", () => {
    const f = parseFilters({ minPrice: "abc", maxPrice: "" }, makes, categories);
    assert.equal(f.minPrice, undefined);
    assert.equal(f.maxPrice, undefined);
  });

  it("con parámetros repetidos se queda con el primero", () => {
    assert.equal(parseFilters({ marca: ["BMW", "Audi"] }, makes, categories).marca, "BMW");
  });

  it("no cuenta el tipo ni el orden como filtros activos", () => {
    const f = parseFilters({ tipo: "auto", orden: "precio-asc" }, makes, categories);
    assert.equal(activeFilterCount(f), 0);
    assert.equal(activeFilterCount(parseFilters({ marca: "BMW" }, makes, categories)), 1);
  });
});

describe("construcción de la URL canónica", () => {
  it("omite el tipo 'all' y el orden por defecto", () => {
    assert.equal(buildQuery({ tipo: "all", orden: "recientes" }), "");
    assert.equal(inventoryHref({ tipo: "all", orden: "recientes" }), "/vehiculos");
  });

  it("incluye lo que sí se eligió", () => {
    assert.equal(
      inventoryHref({ tipo: "auto", categoria: "suv", orden: "precio-asc" }),
      "/vehiculos?tipo=auto&categoria=suv&orden=precio-asc",
    );
  });

  it("ida y vuelta: lo que se construye se vuelve a leer igual", () => {
    const original = {
      tipo: "auto" as const, categoria: "suv", marca: "BMW",
      minYear: 2019, maxYear: 2024, minPrice: 100_000_000, maxPrice: 400_000_000,
      orden: "precio-desc" as const,
    };
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params, makes, categories), original);
  });
});
