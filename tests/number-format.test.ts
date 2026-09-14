import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCOP,
  formatMileage,
  groupDigits,
  onlyDigits,
  parseGrouped,
} from "@/lib/format";

/**
 * El formateo es lo que ve quien administra; el número es lo que guarda la
 * base. Estas pruebas fijan la frontera entre los dos.
 */
describe("agrupación de miles", () => {
  it("agrupa como se escribe en Colombia", () => {
    assert.equal(groupDigits("1"), "1");
    assert.equal(groupDigits("1000"), "1.000");
    assert.equal(groupDigits("1000000"), "1.000.000");
    assert.equal(groupDigits("289900000"), "289.900.000");
    assert.equal(groupDigits("84500"), "84.500");
  });

  it("el cero se agrupa como cero, no como vacío", () => {
    assert.equal(groupDigits("0"), "0");
  });

  it("descarta los ceros a la izquierda sin comerse el número", () => {
    assert.equal(groupDigits("007"), "7");
    assert.equal(groupDigits("000"), "0");
  });

  it("una cadena sin dígitos no produce nada", () => {
    assert.equal(groupDigits(""), "");
    assert.equal(groupDigits("abc"), "");
  });

  it("ignora lo que no sean dígitos, venga como venga pegado", () => {
    assert.equal(onlyDigits("$ 289.900.000"), "289900000");
    assert.equal(onlyDigits("84.500 km"), "84500");
  });
});

describe("lectura del valor escrito", () => {
  it("devuelve el número que representa el texto", () => {
    assert.equal(parseGrouped("289.900.000"), 289_900_000);
    assert.equal(parseGrouped("$ 1.000"), 1000);
  });

  it("distingue vacío de cero", () => {
    assert.equal(parseGrouped(""), null);
    assert.equal(parseGrouped("   "), null);
    assert.equal(parseGrouped("0"), 0);
  });

  it("ida y vuelta sin pérdida", () => {
    for (const value of [0, 1, 999, 1000, 84_500, 289_900_000]) {
      assert.equal(parseGrouped(groupDigits(String(value))), value);
    }
  });

  it("rechaza lo que no cabe en un entero seguro", () => {
    assert.equal(parseGrouped("9".repeat(20)), null);
  });
});

describe("formato de salida", () => {
  it("los precios llevan separador de miles", () => {
    assert.equal(formatCOP(289_900_000), "$ 289.900.000");
    assert.equal(formatCOP(0), "$ 0");
  });

  it("el kilometraje muestra cero kilómetros, no vacío", () => {
    assert.equal(formatMileage(0), "0 km");
    assert.equal(formatMileage(84_500), "84.500 km");
  });
});
