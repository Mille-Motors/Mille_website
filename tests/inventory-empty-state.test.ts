import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inventoryEmptyReason,
  inventoryEmptyState,
} from "@/lib/inventory-empty-state";

/**
 * Un inventario vacío puede significar dos cosas opuestas, y el texto es lo
 * único que las distingue para quien mira. Estas pruebas fijan que MILLE no
 * diga "estamos preparando la primera selección" teniendo vehículos
 * publicados, ni culpe a unos filtros cuando no hay nada que filtrar.
 */
describe("estado vacío del inventario", () => {
  it("sin nada publicado, el vacío es de lanzamiento", () => {
    assert.equal(inventoryEmptyReason(0), "launch");
  });

  it("con inventario publicado, el vacío es de la consulta", () => {
    assert.equal(inventoryEmptyReason(1), "filters");
    assert.equal(inventoryEmptyReason(22), "filters");
  });

  it("el mensaje de lanzamiento no culpa a los filtros", () => {
    const state = inventoryEmptyState({ publishedTotal: 0, activeFilters: 0 });
    assert.equal(state.reason, "launch");
    assert.equal(state.headline, "No publicamos por llenar espacio.");
    assert.equal(
      state.secondary,
      "Estamos preparando la primera selección de MILLE.",
    );
  });

  it("un filtro vacío no insinúa que MILLE no tenga inventario", () => {
    const state = inventoryEmptyState({ publishedTotal: 22, activeFilters: 1 });
    assert.equal(state.reason, "filters");
    assert.equal(state.headline, "Todavía no encontramos el indicado.");
    assert.notEqual(
      state.secondary,
      "Estamos preparando la primera selección de MILLE.",
    );
  });

  it("un universo vacío teniendo inventario sigue siendo contextual", () => {
    // /vehiculos?tipo=moto sin motos publicadas, pero con carros publicados:
    // el tipo no cuenta como filtro activo, y aun así el mensaje global
    // sería mentira.
    const state = inventoryEmptyState({ publishedTotal: 16, activeFilters: 0 });
    assert.equal(state.reason, "filters");
  });

  it("el CTA lleva siempre al formulario", () => {
    for (const publishedTotal of [0, 22]) {
      const state = inventoryEmptyState({ publishedTotal, activeFilters: 0 });
      assert.equal(state.cta.href, "/contacto");
      assert.equal(state.cta.label, "Cuéntanos qué estás buscando");
    }
  });

  it("solo se ofrece limpiar filtros si eso puede revelar algo", () => {
    // Nada publicado: quitar los filtros seguiría dando cero.
    assert.equal(
      inventoryEmptyState({ publishedTotal: 0, activeFilters: 3 }).showClearFilters,
      false,
    );
    // Hay inventario y hay filtros: es la salida real.
    assert.equal(
      inventoryEmptyState({ publishedTotal: 22, activeFilters: 3 }).showClearFilters,
      true,
    );
    // Hay inventario pero ningún filtro que limpiar: el botón no haría nada.
    assert.equal(
      inventoryEmptyState({ publishedTotal: 22, activeFilters: 0 }).showClearFilters,
      false,
    );
  });

  it("el eyebrow es el mismo en los dos casos", () => {
    const launch = inventoryEmptyState({ publishedTotal: 0, activeFilters: 0 });
    const filters = inventoryEmptyState({ publishedTotal: 5, activeFilters: 1 });
    assert.equal(launch.eyebrow, filters.eyebrow);
    assert.equal(launch.eyebrow, "El inventario de hoy");
  });
});
