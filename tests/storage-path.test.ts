import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeStoragePrefix } from "@/lib/storage-path";

/**
 * La barra separa carpetas; todo lo demás dentro de un segmento es
 * contenido. Sanear la cadena entera de golpe convertía vehicles/<id> en
 * vehicles-<id> y dejaba dos convenciones conviviendo en el bucket.
 */
describe("prefijo de Storage", () => {
  it("conserva la barra de vehicles/<id>", () => {
    const id = "56ad66ce-dcbb-4b86-bab7-b33ee4d7d448";
    assert.equal(sanitizeStoragePrefix(`vehicles/${id}`), `vehicles/${id}`);
  });

  it("sanea cada segmento pero mantiene la estructura", () => {
    assert.equal(
      sanitizeStoragePrefix("carpeta con espacios/sub@carpeta"),
      "carpeta-con-espacios/sub-carpeta",
    );
    assert.equal(sanitizeStoragePrefix("a b/c d/e f"), "a-b/c-d/e-f");
  });

  it("conserva los caracteres que ya eran válidos", () => {
    assert.equal(sanitizeStoragePrefix("home.about.future"), "home.about.future");
    assert.equal(sanitizeStoragePrefix("a_b-c.d/e_f"), "a_b-c.d/e_f");
  });

  it("no permite recorrer hacia arriba", () => {
    assert.equal(sanitizeStoragePrefix("../foo"), "foo");
    assert.equal(sanitizeStoragePrefix("../../etc/passwd"), "etc/passwd");
    assert.equal(sanitizeStoragePrefix("vehicles/../../secreto"), "vehicles/secreto");
    assert.equal(sanitizeStoragePrefix("./foo"), "foo");
  });

  it("el resultado nunca contiene un segmento .. ni .", () => {
    for (const input of ["../foo", "a/../b", "./a/./b", "..", "a/.."]) {
      let out: string;
      try {
        out = sanitizeStoragePrefix(input);
      } catch {
        continue; // un prefijo que no deja nada utilizable lanza, y eso vale
      }
      const segments = out.split("/");
      assert.ok(!segments.includes(".."), `${input} -> ${out}`);
      assert.ok(!segments.includes("."), `${input} -> ${out}`);
    }
  });

  it("una doble barra no produce segmentos vacíos", () => {
    assert.equal(sanitizeStoragePrefix("vehicles//abc"), "vehicles/abc");
    assert.equal(sanitizeStoragePrefix("/vehicles/abc"), "vehicles/abc");
    assert.equal(sanitizeStoragePrefix("vehicles/abc/"), "vehicles/abc");
    assert.ok(!sanitizeStoragePrefix("a///b").includes("//"));
  });

  it("un prefijo simple de site-media sigue funcionando", () => {
    assert.equal(sanitizeStoragePrefix("home.hero"), "home.hero");
    assert.equal(sanitizeStoragePrefix("home.about.origin"), "home.about.origin");
    assert.equal(sanitizeStoragePrefix("site-media"), "site-media");
  });

  it("lanza si no queda nada utilizable, en vez de escribir en la raíz", () => {
    for (const input of ["", "/", "..", "../..", "///", "."]) {
      assert.throws(() => sanitizeStoragePrefix(input), Error, `"${input}"`);
    }
  });
});
