import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseId } from "@/server/http/params";
import { ApiError } from "@/server/http/errors";

/**
 * Un identificador malformado no identifica nada. Antes llegaba tal cual a
 * Prisma y Postgres lo convertía en un 500, que dice "se rompió algo
 * nuestro" cuando lo que pasa es que el recurso no puede existir.
 */
describe("identificadores de la API privada", () => {
  it("acepta un uuid bien formado", () => {
    const id = "2f1c9d4e-6b3a-4c1d-9e8f-0a1b2c3d4e5f";
    assert.equal(parseId(id), id);
  });

  it("acepta mayúsculas", () => {
    const id = "2F1C9D4E-6B3A-4C1D-9E8F-0A1B2C3D4E5F";
    assert.equal(parseId(id), id);
  });

  it("responde 404 ante cualquier cosa que no sea un uuid", () => {
    for (const bad of ["", "abc", "123", "no-es-uuid", "../../etc", "2f1c9d4e-6b3a-4c1d-9e8f", `${"a".repeat(36)}`]) {
      assert.throws(
        () => parseId(bad),
        (error: unknown) =>
          error instanceof ApiError &&
          error.code === "NOT_FOUND" &&
          error.status === 404,
        `"${bad}"`,
      );
    }
  });

  it("el mensaje usa la etiqueta del recurso", () => {
    assert.throws(
      () => parseId("roto", "Ese vehículo"),
      (error: unknown) =>
        error instanceof ApiError && error.message === "Ese vehículo no existe.",
    );
  });
});
