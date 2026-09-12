/**
 * Prisma 7 no carga archivos .env por su cuenta, y Next usa .env.local para
 * los secretos locales. Este módulo los carga en el mismo orden que Next
 * (.env.local gana sobre .env) y lo importan tanto prisma7.config.ts como
 * los scripts de seed y de administración.
 *
 * En Vercel las variables ya vienen del entorno: dotenv no sobrescribe lo
 * que ya está definido, así que importar esto es inofensivo en producción.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

config({ path: path.join(root, ".env.local"), quiet: true });
config({ path: path.join(root, ".env"), quiet: true });

/** Lee una variable obligatoria sin revelar su valor si falta. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Defínela en .env.local (ver .env.example).`,
    );
  }
  return value;
}
