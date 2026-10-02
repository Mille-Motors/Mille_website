import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MAX_VEHICLE_IMAGE_BYTES, MAX_VEHICLE_IMAGE_LABEL } from "@/lib/image-dimensions";
import { objectPosition } from "@/lib/focal-point";
import { vehicleInputSchema } from "@/server/vehicles/schemas";
import { MAX_GEAR_COUNT, MIN_GEAR_COUNT } from "@/types/vehicle";
import { Thumb } from "@/components/admin/VehicleTable";
import { makeVehicle } from "./support/vehicle";

/**
 * Los dos topes que la auditoría señaló como demasiado estrictos, y el
 * encuadre en la única superficie que lo ignoraba.
 */

describe("el original de una fotografía puede pesar 25 MiB", () => {
  const LIMIT = 25 * 1024 * 1024;

  it("el número es exactamente 26.214.400", () => {
    assert.equal(MAX_VEHICLE_IMAGE_BYTES, LIMIT);
    assert.equal(MAX_VEHICLE_IMAGE_BYTES, 26_214_400);
  });

  it("25 MiB exactos entran", () => {
    assert.equal(LIMIT > MAX_VEHICLE_IMAGE_BYTES, false);
  });

  it("un byte más, no", () => {
    assert.equal(LIMIT + 1 > MAX_VEHICLE_IMAGE_BYTES, true);
  });

  it("lo que un teléfono reciente produce entra", () => {
    // Era justo lo que el tope anterior rechazaba: 12–20 MiB de original.
    for (const mib of [11, 12, 16, 20, 24]) {
      assert.equal(
        mib * 1024 * 1024 > MAX_VEHICLE_IMAGE_BYTES,
        false,
        `${mib} MiB debería entrar`,
      );
    }
  });

  it("la etiqueta de la interfaz dice lo mismo que el número", () => {
    assert.equal(MAX_VEHICLE_IMAGE_LABEL, "25 MB");
  });
});

describe("una caja puede tener hasta doce marchas", () => {
  const parse = (gearCount: number) =>
    vehicleInputSchema.safeParse({ vehicleType: "auto", gearCount });

  it("el tope es doce", () => {
    assert.equal(MIN_GEAR_COUNT, 1);
    assert.equal(MAX_GEAR_COUNT, 12);
  });

  for (const gears of [1, 6, 8, 9, 10, 12]) {
    it(`${gears} marchas es válido`, () => {
      assert.equal(parse(gears).success, true);
    });
  }

  for (const gears of [0, -1, 13, 20]) {
    it(`${gears} marchas se rechaza`, () => {
      assert.equal(parse(gears).success, false);
    });
  }

  it("9 y 10 son datos reales: 9G-Tronic y 10R80", () => {
    assert.equal(parse(9).success, true);
    assert.equal(parse(10).success, true);
  });
});

describe("la tabla del admin respeta el encuadre", () => {
  it("deriva object-position del focal de la portada", () => {
    const vehicle = makeVehicle({
      images: [
        {
          id: "i1",
          src: "/a.jpg",
          alt: "a",
          source: "storage",
          storagePath: "v/a.jpg",
          focal: { x: 0, y: 50 },
        },
      ],
    });

    const html = renderToStaticMarkup(
      createElement(Thumb, { vehicle, className: "size-24" }),
    );

    // Era la única superficie que recortaba siempre por el centro: la ficha,
    // la tarjeta y la rejilla de fotos ya respetaban el encuadre.
    assert.ok(
      html.includes("object-position:0% 50%") ||
        html.includes("object-position: 0% 50%"),
      `no se encontró el encuadre en el HTML: ${html.slice(0, 400)}`,
    );
    assert.equal(objectPosition({ x: 0, y: 50 }), "0% 50%");
  });

  it("una portada centrada sigue centrada", () => {
    const html = renderToStaticMarkup(
      createElement(Thumb, { vehicle: makeVehicle(), className: "size-24" }),
    );
    assert.ok(
      html.includes("object-position:50% 50%") ||
        html.includes("object-position: 50% 50%"),
    );
  });
});
