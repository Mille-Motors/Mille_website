import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeFilterCount,
  buildQuery,
  clearedFilters,
  hasInvalidType,
  hasLegacyBodySlug,
  inventoryHref,
  mileageLadder,
  parseFilters,
  searchWords,
  SEARCH_MAX_LENGTH,
} from "@/lib/filters";
import type { InventoryFilters } from "@/lib/filters";

/**
 * Un conjunto de filtros completo a partir de lo que se quiera fijar.
 *
 * `parseFilters` siempre devuelve todas las claves —las que no vienen, en
 * `undefined`— y `deepEqual` distingue una clave ausente de una en
 * `undefined`. Sin esto, cada filtro nuevo rompería las pruebas de ida y
 * vuelta por una razón que no tiene nada que ver con lo que comprueban.
 */
function filters(partial: Partial<InventoryFilters> = {}): InventoryFilters {
  return {
    tipo: "all",
    categoria: undefined,
    marca: undefined,
    modelo: undefined,
    combustible: undefined,
    transmision: undefined,
    traccion: undefined,
    transmisionFinal: undefined,
    ciudad: undefined,
    etiqueta: undefined,
    minYear: undefined,
    maxYear: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minKm: undefined,
    maxKm: undefined,
    q: undefined,
    orden: "recientes",
    ...partial,
  };
}

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
    assert.equal(parseFilters({ categoria: "Camioneta" }).categoria, "camioneta");
  });

  it("«suv» y «4x4» se leen como camioneta: los enlaces viejos siguen llevando a las camionetas", () => {
    assert.equal(parseFilters({ categoria: "suv" }).categoria, "camioneta");
    assert.equal(parseFilters({ categoria: "SUV" }).categoria, "camioneta");
    assert.equal(parseFilters({ categoria: "4x4" }).categoria, "camioneta");
    // Y lo que no es un alias no se toca: sigue siendo cero resultados.
    assert.equal(parseFilters({ categoria: "touring" }).categoria, "touring");
  });

  it("avisa de una carrocería con nombre viejo para poder redirigir a la URL vigente", () => {
    assert.equal(hasLegacyBodySlug({ categoria: "suv" }), true);
    assert.equal(hasLegacyBodySlug({ categoria: "4x4" }), true);
    assert.equal(hasLegacyBodySlug({ categoria: "camioneta" }), false);
    assert.equal(hasLegacyBodySlug({ categoria: "sedan" }), false);
    assert.equal(hasLegacyBodySlug({}), false);
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
      inventoryHref({ tipo: "auto", categoria: "camioneta", orden: "precio-asc" }),
      "/vehiculos?tipo=auto&categoria=camioneta&orden=precio-asc",
    );
  });

  it("canonicalizar un tipo inválido conserva el resto de filtros", () => {
    const params = { tipo: "camion", categoria: "camioneta", marca: "BMW", orden: "precio-asc" };
    const href = inventoryHref(parseFilters({ ...params, tipo: undefined }));
    assert.equal(href, "/vehiculos?categoria=camioneta&marca=BMW&orden=precio-asc");
  });

  it("ida y vuelta: lo que se construye se vuelve a leer igual", () => {
    const original = filters({
      tipo: "auto", categoria: "camioneta", marca: "BMW",
      minYear: 2019, maxYear: 2024, minPrice: 100_000_000, maxPrice: 400_000_000,
      orden: "precio-desc",
    });
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params), original);
  });

  it("ida y vuelta con la taxonomía nueva entera", () => {
    // Todos los filtros a la vez: es el caso que importa, porque son
    // condiciones simultáneas y ninguna puede perderse por el camino.
    const original = filters({
      tipo: "auto",
      categoria: "camioneta",
      marca: "BMW",
      modelo: "X5",
      combustible: "Híbrido enchufable",
      transmision: "Automática",
      traccion: "Integral (AWD)",
      ciudad: "Bogotá, CO",
      etiqueta: "Deportivo",
      minYear: 2020,
      maxYear: 2026,
      maxPrice: 200_000_000,
      maxKm: 50_000,
      orden: "precio-asc",
    });
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params), original);
  });

  it("ida y vuelta también con un filtro que no existe en el inventario", () => {
    const original = filters({
      tipo: "moto", categoria: "touring", marca: "Ferrari",
    });
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params), original);
  });
});

/**
 * Los filtros nuevos son condiciones, no atajos: cada uno estrecha y ninguno
 * ensancha. Estas pruebas fijan que un valor que no existe se conserve —cero
 * honesto— y que quitar todos los filtros no se lleve por delante el
 * universo ni el orden.
 */
describe("la taxonomía nueva en la URL", () => {
  it("conserva combustible, tracción y carácter tal como se escribieron", () => {
    const f = parseFilters({
      combustible: "Híbrido enchufable",
      traccion: "4x4 (4WD)",
      etiqueta: "Off-road",
    });
    // Sin tocar mayúsculas ni tildes: es el texto que guarda la columna, y
    // normalizarlo lo haría dejar de coincidir.
    assert.equal(f.combustible, "Híbrido enchufable");
    assert.equal(f.traccion, "4x4 (4WD)");
    assert.equal(f.etiqueta, "Off-road");
  });

  it("un combustible que no existe se conserva: cero honesto", () => {
    assert.equal(parseFilters({ combustible: "Plutonio" }).combustible, "Plutonio");
  });

  it("cuenta cada filtro nuevo como activo", () => {
    assert.equal(
      activeFilterCount(
        parseFilters({
          categoria: "camioneta",
          combustible: "Híbrido enchufable",
          minYear: "2020",
          maxPrice: "200000000",
        }),
      ),
      4,
    );
  });

  it("limpiar deja el universo y el orden, y nada más", () => {
    const applied = parseFilters({
      tipo: "auto",
      categoria: "camioneta",
      combustible: "Eléctrico",
      traccion: "Integral (AWD)",
      maxKm: "50000",
      orden: "precio-asc",
    });
    const cleared = clearedFilters(applied);
    assert.equal(cleared.tipo, "auto");
    assert.equal(cleared.orden, "precio-asc");
    assert.equal(activeFilterCount(cleared), 0);
    assert.equal(inventoryHref(cleared), "/vehiculos?tipo=auto&orden=precio-asc");
  });

  it("el kilometraje máximo viaja y vuelve", () => {
    assert.equal(parseFilters({ maxKm: "50000" }).maxKm, 50_000);
    // Un tope ilegible es ausencia de tope, nunca cero.
    assert.equal(parseFilters({ maxKm: "abc" }).maxKm, undefined);
    assert.equal(parseFilters({ maxKm: "0" }).maxKm, undefined);
  });

  it("los escalones de kilometraje cubren el inventario sin pasarse", () => {
    assert.deepEqual(mileageLadder(0), []);
    const ladder = mileageLadder(45_000);
    assert.ok(ladder.includes(50_000), "hace falta un tope que incluya al más rodado");
    assert.ok(!ladder.includes(75_000), "no se ofrecen topes por encima del inventario");
  });
});

/**
 * El buscador y el rango de kilometraje.
 *
 * Lo escrito en el buscador acaba en una consulta a la base, así que la regla
 * es la de siempre: nada de lo que viaja en la URL puede desaparecer en
 * silencio y ensanchar el resultado.
 */
describe("la búsqueda por texto", () => {
  it("viaja en la URL y vuelve tal como se escribió", () => {
    assert.equal(parseFilters({ q: "bmw x5" }).q, "bmw x5");
    assert.equal(inventoryHref({ q: "bmw x5" }), "/vehiculos?q=bmw+x5");
  });

  it("recorta los espacios y junta los repetidos", () => {
    assert.equal(parseFilters({ q: "  bmw     x5  " }).q, "bmw x5");
  });

  it("vacío es ausencia de búsqueda, no una búsqueda por nada", () => {
    assert.equal(parseFilters({ q: "" }).q, undefined);
    assert.equal(parseFilters({ q: "   " }).q, undefined);
    assert.equal(parseFilters({}).q, undefined);
  });

  it("con parámetros repetidos se queda con el primero", () => {
    assert.equal(parseFilters({ q: ["audi", "bmw"] }).q, "audi");
  });

  it("un texto sin ninguna palabra real no es una búsqueda", () => {
    assert.equal(parseFilters({ q: "%" }).q, undefined);
    assert.equal(parseFilters({ q: " _ % " }).q, undefined);
    assert.equal(activeFilterCount(parseFilters({ q: "%" })), 0);
  });

  it("tiene un tope de largo", () => {
    const q = parseFilters({ q: "a".repeat(500) }).q;
    assert.equal(q?.length, SEARCH_MAX_LENGTH);
  });

  it("cuenta como un filtro activo, y limpiar la quita", () => {
    const applied = parseFilters({ tipo: "auto", q: "x5", orden: "precio-asc" });
    assert.equal(activeFilterCount(applied), 1);
    const cleared = clearedFilters(applied);
    assert.equal(cleared.q, undefined);
    assert.equal(activeFilterCount(cleared), 0);
  });

  it("ida y vuelta junto a otros filtros", () => {
    const original = filters({ tipo: "auto", q: "x5 enchufable", marca: "BMW", minPrice: 100_000_000 });
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params), original);
  });

  it("elegir una categoría o cambiar de universo no pierde lo escrito si se arma así", () => {
    // Es lo que hacen las píldoras de categoría y el selector de ruedas.
    const base = parseFilters({ tipo: "auto", q: "x5", precio: "x", marca: "BMW" });
    assert.equal(inventoryHref({ ...base, categoria: "camioneta" }), "/vehiculos?tipo=auto&categoria=camioneta&marca=BMW&q=x5");
    assert.equal(inventoryHref({ tipo: "moto", orden: base.orden, q: base.q }), "/vehiculos?tipo=moto&q=x5");
  });
});

describe("las palabras de una búsqueda", () => {
  it("separa por espacios y baja a minúsculas", () => {
    assert.deepEqual(searchWords("BMW  X5"), ["bmw", "x5"]);
  });

  it("no repite palabras", () => {
    assert.deepEqual(searchWords("bmw BMW bmw x5"), ["bmw", "x5"]);
  });

  it("lo vacío no es una búsqueda", () => {
    assert.deepEqual(searchWords(""), []);
    assert.deepEqual(searchWords(undefined), []);
    assert.deepEqual(searchWords("   "), []);
  });

  it("tiene un tope de palabras: más no afinan, encarecen", () => {
    assert.equal(searchWords("a b c d e f g h i j").length, 6);
  });

  it("los comodines de la base no son parte de lo que se busca", () => {
    // Sin esto, «%» devolvía el inventario entero.
    assert.deepEqual(searchWords("%"), []);
    assert.deepEqual(searchWords("_"), []);
    assert.deepEqual(searchWords("bmw%"), ["bmw"]);
    assert.deepEqual(searchWords("100%_bmw"), ["100", "bmw"]);
  });

  it("una palabra enorme se recorta", () => {
    assert.equal(searchWords("x".repeat(200))[0].length, 40);
  });
});

describe("el kilometraje como rango", () => {
  it("el mínimo viaja y vuelve", () => {
    assert.equal(parseFilters({ minKm: "10000" }).minKm, 10_000);
    assert.equal(parseFilters({ minKm: "abc" }).minKm, undefined);
    assert.equal(parseFilters({ minKm: "0" }).minKm, undefined);
  });

  it("un rango al revés se lee como venía escrito, no como vacío", () => {
    const f = parseFilters({ minKm: "80000", maxKm: "20000" });
    assert.deepEqual([f.minKm, f.maxKm], [20_000, 80_000]);
  });

  it("cada cota cuenta como un filtro", () => {
    assert.equal(activeFilterCount(parseFilters({ minKm: "10000" })), 1);
    assert.equal(activeFilterCount(parseFilters({ minKm: "10000", maxKm: "50000" })), 2);
  });

  it("ida y vuelta", () => {
    const original = filters({ minKm: 10_000, maxKm: 50_000 });
    const params = Object.fromEntries(new URLSearchParams(buildQuery(original)));
    assert.deepEqual(parseFilters(params), original);
  });
});
