import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_SEED_BLOCKED_MESSAGE,
  FIXTURE_SEED_ENV,
  FIXTURE_SEED_ENV_VALUE,
  FIXTURE_SEED_FLAG,
  fixtureSeedAllowed,
} from "@/lib/fixture-seed-guard";

/**
 * La barrera del seed de fixtures.
 *
 * `prisma/seed.ts` escribe veinticuatro vehículos de ficción, y el proyecto
 * tiene una sola base: `.env.local` apunta a la de verdad. `npm run db:seed`
 * a secas publicaba inventario inventado en el sitio.
 *
 * Estas pruebas no ejecutan el seed ni escriben una sola fila: comprueban la
 * decisión, que es lo único que hay que poder garantizar.
 */
const ALLOWED = { [FIXTURE_SEED_ENV]: FIXTURE_SEED_ENV_VALUE };

describe("hacen falta las dos cosas a la vez", () => {
  it("sin nada, bloqueado", () => {
    assert.equal(fixtureSeedAllowed([], {}), false);
  });

  it("solo la bandera, bloqueado", () => {
    assert.equal(fixtureSeedAllowed([FIXTURE_SEED_FLAG], {}), false);
  });

  it("solo la variable, bloqueado", () => {
    assert.equal(fixtureSeedAllowed([], ALLOWED), false);
  });

  it("las dos exactas, permitido", () => {
    assert.equal(fixtureSeedAllowed([FIXTURE_SEED_FLAG], ALLOWED), true);
  });

  it("la bandera entre otros argumentos sigue contando", () => {
    assert.equal(
      fixtureSeedAllowed(["--algo", FIXTURE_SEED_FLAG, "--otro"], ALLOWED),
      true,
    );
  });
});

describe("el valor de la variable se compara tal cual", () => {
  // La gracia de la barrera es que haya que escribir algo deliberado. Un
  // "yes" de memoria no puede valer.
  for (const value of ["yes", "Yes", "1", "true", "", "NO"]) {
    it(`"${value}" no abre la puerta`, () => {
      assert.equal(
        fixtureSeedAllowed([FIXTURE_SEED_FLAG], { [FIXTURE_SEED_ENV]: value }),
        false,
      );
    });
  }

  it("una variable parecida tampoco", () => {
    assert.equal(
      fixtureSeedAllowed([FIXTURE_SEED_FLAG], {
        MILLE_ALLOW_SEED: FIXTURE_SEED_ENV_VALUE,
      }),
      false,
    );
  });

  it("una bandera parecida tampoco", () => {
    assert.equal(fixtureSeedAllowed(["--force"], ALLOWED), false);
    assert.equal(fixtureSeedAllowed(["--fixtures"], ALLOWED), false);
  });
});

describe("el mensaje dice qué hacer", () => {
  it("explica por qué está bloqueado y cómo autorizarlo", () => {
    assert.match(FIXTURE_SEED_BLOCKED_MESSAGE, /Seed de fixtures bloqueado/);
    assert.match(FIXTURE_SEED_BLOCKED_MESSAGE, /inventario de prueba/);
    assert.ok(FIXTURE_SEED_BLOCKED_MESSAGE.includes(FIXTURE_SEED_FLAG));
    assert.ok(FIXTURE_SEED_BLOCKED_MESSAGE.includes(FIXTURE_SEED_ENV));
  });
});
