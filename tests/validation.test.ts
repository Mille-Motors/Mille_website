import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inquiryInputSchema } from "@/server/inquiries/schemas";
import { vehicleInputSchema } from "@/server/vehicles/schemas";

/**
 * La validación del servidor es lo único que separa la base de datos de lo
 * que cualquiera quiera escribir en ella. Lo que valide el formulario es
 * comodidad para quien escribe; esto es la garantía.
 */

describe("solicitudes públicas", () => {
  const valid = {
    type: "general" as const,
    name: "Ana Ruiz",
    phone: "+57 310 555 4433",
    email: "ana@correo.com",
  };

  it("acepta una solicitud bien formada", () => {
    const parsed = inquiryInputSchema.parse(valid);
    assert.equal(parsed.name, "Ana Ruiz");
    assert.equal(parsed.email, "ana@correo.com");
  });

  it("recorta los espacios de alrededor", () => {
    const parsed = inquiryInputSchema.parse({ ...valid, name: "  Ana Ruiz  " });
    assert.equal(parsed.name, "Ana Ruiz");
  });

  it("rechaza un correo inválido", () => {
    assert.throws(() => inquiryInputSchema.parse({ ...valid, email: "no-es-correo" }));
  });

  it("rechaza un nombre vacío", () => {
    assert.throws(() => inquiryInputSchema.parse({ ...valid, name: "" }));
  });

  it("rechaza un tipo que no existe", () => {
    assert.throws(() => inquiryInputSchema.parse({ ...valid, type: "otro" }));
  });

  it("acepta teléfonos como los escribe la gente", () => {
    for (const phone of ["3105554433", "310 555 4433", "+57 (310) 555-4433"]) {
      assert.equal(inquiryInputSchema.parse({ ...valid, phone }).phone, phone);
    }
  });

  it("rechaza teléfonos con muy pocos o demasiados dígitos", () => {
    for (const phone of ["12", "1234567890123456789"]) {
      assert.throws(() => inquiryInputSchema.parse({ ...valid, phone }));
    }
  });

  it("conserva el campo trampa para que el servicio pueda descartarlo", () => {
    const parsed = inquiryInputSchema.parse({ ...valid, website: "http://spam.ru" });
    assert.equal(parsed.website, "http://spam.ru");
  });
});

describe("vehículos", () => {
  const valid = {
    vehicleType: "auto" as const,
    make: "BMW",
    model: "X5",
    year: 2023,
    price: 350_000_000,
    mileage: 20_000,
    categoryId: "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f",
    fuelType: "Gasolina" as const,
    transmission: "Automática" as const,
    drivetrain: "4x4 (AWD)" as const,
    city: "Bogotá, CO",
    description: "Un vehículo.",
  };

  it("acepta un vehículo bien formado", () => {
    const parsed = vehicleInputSchema.parse(valid);
    assert.equal(parsed.make, "BMW");
    assert.equal(parsed.availability, "available");
    assert.equal(parsed.featured, false);
  });

  it("rechaza un precio negativo", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, price: -1 }));
  });

  it("rechaza un kilometraje negativo", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, mileage: -1 }));
  });

  it("rechaza años fuera de rango", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, year: 1800 }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, year: 3000 }));
  });

  it("rechaza una categoría que no es un uuid", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, categoryId: "suv" }));
  });

  it("rechaza enums inventados", () => {
    assert.throws(() => vehicleInputSchema.parse({ ...valid, fuelType: "Plutonio" }));
    assert.throws(() => vehicleInputSchema.parse({ ...valid, transmission: "Mágica" }));
  });

  it("descarta las líneas vacías del equipamiento y conserva el orden", () => {
    const parsed = vehicleInputSchema.parse({
      ...valid,
      equipment: ["Techo", "   ", "Cámara", ""],
    });
    assert.deepEqual(parsed.equipment, ["Techo", "Cámara"]);
  });

  it("solo admite slugs seguros para una URL", () => {
    assert.equal(vehicleInputSchema.parse({ ...valid, slug: "bmw-x5-2023" }).slug, "bmw-x5-2023");
    for (const slug of ["BMW X5", "bmw/x5", "bmw_x5", "-bmw", "bmw--x5"]) {
      assert.throws(() => vehicleInputSchema.parse({ ...valid, slug }));
    }
  });
});
