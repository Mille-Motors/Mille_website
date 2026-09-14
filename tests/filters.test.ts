import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeFilterCount,
  buildQuery,
  hasInvalidType,
  inventoryHref,
  parseFilters,
} from "@/lib/filters";

/**
 * Los filtros del inventario son la URL. Lo que se parsea de ella acaba en
 * una consulta a la base, así que la regla que fijan estas pruebas es una:
 * un filtro presente en la URL nunca puede desaparecer y devolver MÁS
 * resultados de los pedidos.
 */
describe("lectura de los filtros de la URL", () => {
  it("sin parámetros devuelve el inventario entero, sin orden explícito", () => {
    const f = parseFilters({});
    assert.equal(f.tipo, "all");
    assert.equal(f.orden, "recientes");
    assert.equal(f.categoria, undefined);
    assert.equal(f.marca, undefined);
  });

  it("un tipo desconocido se lee como 'todo' para poder renderizar", () => {
    assert.equal(parseFilters({ tipo: "camion" }).tipo, "all");
  });

  it("…y se marca como inválido para que la URL se canonicalice", () => {
    assert.equal(hasInvalidType({ tipo: "camion" }), true);
    assert.equal(hasInvalidType({ tipo: "auto" }), false);
    assert.equal(hasInvalidType({ tipo: "moto" }), false);
    assert.equal(hasInvalidType({}), false);
    assert.equal(hasInvalidType({ tipo: "" }), false);
  });

  it("una marca desconocida SE CONSERVA: cero honesto, no inventario entero", () => {
    assert.equal(parseFilters({ marca: "Ferrari" }).marca, "Ferrari");
  });

  it("una categoría desconocida SE CONSERVA", () => {
    assert.equal(parseFilters({ categoria: "no-existe" }).categoria, "no-existe");
  });

  it("una categoría válida sin publicados se conserva igual", () => {
    // `touring` existe en la taxonomía pero no tiene motos publicadas: debe
    // dar cero, no todas las motos.
    const f = parseFilters({ tipo: "moto", categoria: "touring" });
    assert.equal(f.tipo, "moto");
    assert.equal(f.categoria, "touring");
  });

  it("una marca del universo opuesto se conserva", () => {
    const f = parseFilters({ tipo: "auto", marca: "KTM" });
    assert.equal(f.tipo, "auto");
    assert.equal(f.marca, "KTM");
  });

  it("la categoría se normaliza a minúsculas", () => {
    assert.equal(parseFilters({ categoria: "SUV" }).categoria, "suv");
  });

  it("un valor vacío sí es ausencia de filtro", () => {
    assert.equal(parseFilters({ categoria: "", marca: "" }).categoria, undefined);
    assert.equal(parseFilters({ marca: "" }).marca, undefined);
  });

  it("descarta un orden que no existe: no ensancha nada", () => {
    assert.equal(parseFilters({ orden: "aleatorio" }).orden, "recientes");
  });

  it("lee un rango invertido como venía escrito, no como vacío", () => {
    const f = parseFilters({ minYear: "2024", maxYear: "2019" });
    assert.equal(f.minYear, 2019);
    assert.equal(f.maxYear, 2024);
  });

  it("un límite ilegible es ausencia de límite, nunca cero", () => {
    const f = parseFilters({ minPrice: "abc", maxPrice: "" });
    assert.equal(f.minPrice, undefined);
    assert.equal(f.maxPrice, undefined);
  });

  it("con parámetros repetidos se queda con el primero", () => {
    assert.equal(parseFilters({ marca: ["BMW", "Audi"] }).marca, "BMW");
  });

  it("no cuenta el tipo ni el orden como filtros activos", () => {
    assert.equal(activeFilterCount(parseFilters({ tipo: "auto", orden: "precio-asc" })), 0);
    assert.equal(activeFilterCount(parseFilters({ marca: "BMW" })), 1);
    // Un filtro que no existirá en la base sigue contando como activo: es lo
    // que permite ofrecer "Limpiar filtros" en un resultado vacío.
    assert.equal(activeFilterCount(parseFilters({ categoria: "no-existe" })), 1);
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

  it("canonicalizar un tipo inválido conserva el resto de filtros", () => {
    const params = { tipo: "camion", categoria: "suv", marca: "BMW", orden: "precio-asc" };
    const href = inventoryHref(parseFilters({ ...params, tipo: undefined }));
    assert.equal(href, "/vehiculos?categoria=suv&marca=BMW&orden=precio-asc");
  });

  it("ida y vuelta: lo que se construye se vuelve a leer igual", () => {
    const original = {
      tipo: "auto" as const, categoria: "suv", marca: "BMW",
      minYear: 2019, maxYear: 2024, minPrice: 100_000_000, maxPrice: 400_000_000,
      orden: "precio-desc" as const,
    };
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params), original);
  });

  it("ida y vuelta también con un filtro que no existe en el inventario", () => {
    const original = {
      tipo: "moto" as const, categoria: "touring", marca: "Ferrari",
      minYear: undefined, maxYear: undefined, minPrice: undefined, maxPrice: undefined,
      orden: "recientes" as const,
    };
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params), original);
  });
});
