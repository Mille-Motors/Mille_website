import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicationBlockers } from "@/lib/publication";
import type { Vehicle } from "@/types/vehicle";
import { makeVehicle } from "./support/vehicle";

/**
 * Las condiciones que se exigen para publicar tienen que seguir cumpliéndose
 * DESPUÉS de publicar. Estas pruebas fijan qué estados debe rechazar la
 * invariante; que se aplique en cada mutación se comprueba contra la base en
 * el QA, porque necesita transacciones reales.
 */
const published: Vehicle = makeVehicle({
  publication: "published",
  publishedAt: "2026-01-01T00:00:00.000Z",
  images: [
    { id: "i1", src: "/a.jpg", alt: "a", source: "storage", storagePath: "vehicles/1/a.jpg" },
  ],
});

describe("estados que la invariante debe rechazar", () => {
  it("un publicado íntegro no tiene impedimentos", () => {
    assert.deepEqual(publicationBlockers(published), []);
  });

  it("borrar la última fotografía deja el vehículo inválido", () => {
    const sinFotos = { ...published, images: [] };
    assert.match(publicationBlockers(sinFotos)[0], /fotograf/i);
  });

  it("quedarse solo con el marcador de respaldo también es inválido", () => {
    const conPlaceholder = {
      ...published,
      images: [{ id: "placeholder", src: "/images/brand/night.jpg", alt: "", source: "legacy" as const, storagePath: null }],
    };
    assert.match(publicationBlockers(conPlaceholder)[0], /fotograf/i);
  });

  it("precio 0 sobre un publicado es inválido", () => {
    assert.match(publicationBlockers({ ...published, price: 0 })[0], /precio/i);
  });

  it("precio negativo también", () => {
    assert.equal(publicationBlockers({ ...published, price: -1 }).length, 1);
  });

  it("vaciar la descripción es inválido", () => {
    assert.match(publicationBlockers({ ...published, description: "   " })[0], /descripci/i);
  });

  it("vaciar marca o modelo es inválido", () => {
    assert.equal(publicationBlockers({ ...published, make: "" }).length, 1);
    assert.equal(publicationBlockers({ ...published, model: "  " }).length, 1);
  });

  it("acumula todos los motivos para poder explicarlos juntos", () => {
    const roto = { ...published, make: "", price: 0, description: "", images: [] };
    assert.equal(publicationBlockers(roto).length, 4);
  });

  it("un borrador incompleto no es asunto de la invariante", () => {
    // publicationBlockers describe el estado; quien decide si aplica es la
    // invariante, que solo mira los PUBLISHED.
    const borrador = { ...published, publication: "draft" as const, price: 0 };
    assert.ok(publicationBlockers(borrador).length > 0);
  });
});
