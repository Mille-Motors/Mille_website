import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicationBlockers } from "@/lib/publication";
import type { Vehicle } from "@/types/vehicle";
import { makeVehicle } from "./support/vehicle";

/**
 * Publicar es lo que hace visible un vehículo al público, así que no debería
 * poder ocurrir a medias.
 */
const base: Vehicle = makeVehicle();

describe("requisitos para publicar", () => {
  it("un vehículo completo no tiene impedimentos", () => {
    assert.deepEqual(publicationBlockers(base), []);
  });

  it("exige marca y modelo", () => {
    assert.equal(publicationBlockers({ ...base, make: "  " }).length, 1);
    assert.equal(publicationBlockers({ ...base, model: "" }).length, 1);
  });

  it("exige precio", () => {
    assert.match(publicationBlockers({ ...base, price: 0 })[0], /precio/i);
  });

  it("exige descripción", () => {
    assert.match(publicationBlockers({ ...base, description: "   " })[0], /descripción/i);
  });

  it("exige al menos una fotografía", () => {
    assert.match(publicationBlockers({ ...base, images: [] })[0], /fotograf/i);
  });

  it("no acepta la imagen de respaldo como fotografía", () => {
    const withPlaceholder = {
      ...base,
      images: [{ id: "placeholder", src: "/images/brand/night.jpg", alt: "", source: "legacy" as const, storagePath: null, focal: { x: 50, y: 50 } }],
    };
    assert.match(publicationBlockers(withPlaceholder)[0], /fotograf/i);
  });

  it("acumula todos los motivos, no solo el primero", () => {
    const empty = { ...base, make: "", price: 0, description: "", images: [] };
    assert.equal(publicationBlockers(empty).length, 4);
  });
});
