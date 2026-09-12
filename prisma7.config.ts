import "./prisma/env";
import { defineConfig } from "prisma/config";

/**
 * Configuración del CLI de Prisma (Prisma 7 la lee de aquí, ya no del
 * bloque `datasource` del schema).
 *
 * `url` apunta al pooler de sesión y `directUrl` a la conexión directa:
 * Prisma Migrate necesita la directa para DDL y advisory locks, mientras que
 * el runtime de la aplicación usa el pooler a través del driver adapter.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // El CLI usa una sola URL y aquí la correcta es la directa: `migrate`
    // necesita DDL y advisory locks que el pooler no ofrece. El runtime de
    // la aplicación va por el pooler (DATABASE_URL) desde el driver adapter.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
