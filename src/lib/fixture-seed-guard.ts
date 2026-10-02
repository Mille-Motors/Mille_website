/**
 * Quién puede sembrar los fixtures.
 *
 * `prisma/seed.ts` contiene veinticuatro vehículos de ficción. Nacieron para
 * migrar el sitio de datos de demostración a PostgreSQL y siguen sirviendo
 * para montar un entorno de desarrollo, pero el proyecto tiene una sola base
 * y `.env.local` apunta a la de verdad: `npm run db:seed` escrito de memoria,
 * o copiado de un README, publicaba inventario inventado en el sitio.
 *
 * Por eso hacen falta DOS cosas a la vez, y ninguna se teclea sin querer:
 * una bandera en la línea de comandos y una variable de entorno con un valor
 * exacto. Cada una por su lado no basta.
 *
 * `NODE_ENV !== "production"` no habría servido: el riesgo era precisamente
 * ejecutarlo desde una máquina local contra las credenciales de la base viva,
 * y ahí `NODE_ENV` no vale "production".
 *
 * La decisión vive aquí, separada del script, para poder probarla sin
 * escribir una sola fila.
 */
export const FIXTURE_SEED_FLAG = "--force-fixtures";
export const FIXTURE_SEED_ENV = "MILLE_ALLOW_FIXTURE_SEED";
export const FIXTURE_SEED_ENV_VALUE = "YES";

export const FIXTURE_SEED_BLOCKED_MESSAGE =
  "Seed de fixtures bloqueado. Este script contiene inventario de prueba y " +
  "no debe ejecutarse contra la base real por accidente.\n" +
  `Para ejecutarlo a propósito: ${FIXTURE_SEED_ENV}=${FIXTURE_SEED_ENV_VALUE} ` +
  `npm run db:seed -- ${FIXTURE_SEED_FLAG}`;

/**
 * `true` solo con la bandera Y la variable exacta. El valor de la variable se
 * compara tal cual: "yes", "1" o "true" no abren la puerta, porque la gracia
 * es que haya que escribir algo deliberado.
 */
export function fixtureSeedAllowed(
  argv: readonly string[],
  env: Record<string, string | undefined>,
): boolean {
  return (
    argv.includes(FIXTURE_SEED_FLAG) &&
    env[FIXTURE_SEED_ENV] === FIXTURE_SEED_ENV_VALUE
  );
}
