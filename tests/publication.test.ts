import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicationBlockers } from "@/lib/publication";
import type { Vehicle } from "@/types/vehicle";

/**
 * Publicar es lo que hace visible un vehículo al público, así que no debería
 * poder ocurrir a medias.
 */
const base: Vehicle = {
  id: "1", slug: "bmw-x5", make: "BMW", model: "X5", version: "xDrive40i",
  year: 2023, price: 350_000_000, mileage: 20_000, vehicleType: "auto",
  category: { id: "c1", name: "SUV", pluralName: "SUV", slug: "suv", vehicleType: "auto", active: true, position: 0 },
  fuelType: "Gasolina", transmission: "Automática", drivetrain: "4x4 (AWD)",
  engine: "3.0", power: "340 hp", exteriorColor: "Gris", interiorColor: "Negro",
  city: "Bogotá, CO", availability: "available", publication: "draft", featured: false,
  description: "Un vehículo.", equipment: [],
  images: [{ id: "i1", src: "/a.jpg", alt: "a", source: "legacy", storagePath: null }],
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", publishedAt: null,
};

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
      images: [{ id: "placeholder", src: "/images/brand/night.jpg", alt: "", source: "legacy" as const, storagePath: null }],
    };
    assert.match(publicationBlockers(withPlaceholder)[0], /fotograf/i);
  });

  it("acumula todos los motivos, no solo el primero", () => {
    const empty = { ...base, make: "", price: 0, description: "", images: [] };
    assert.equal(publicationBlockers(empty).length, 4);
  });
});
