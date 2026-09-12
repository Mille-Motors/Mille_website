import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma del runtime.
 *
 * Prisma 7 no lleva motor nativo: la conexión la abre `pg` a través del
 * driver adapter, y por eso la URL se pasa aquí y no en el schema. Apunta al
 * *session pooler* de Supabase, que es el que aguanta el patrón de muchas
 * conexiones cortas de las funciones serverless. Las migraciones usan la
 * conexión directa (DIRECT_URL) desde prisma7.config.ts.
 *
 * Se construye de forma perezosa, en el primer uso real, por dos razones:
 * `next build` evalúa los módulos de cada ruta para recoger su
 * configuración, y compilar no debería exigir una cadena de conexión; y una
 * función serverless que nunca llega a tocar la base no tiene por qué abrir
 * una piscina de conexiones.
 *
 * Faltar DATABASE_URL sigue siendo un error ruidoso: se lanza en la primera
 * consulta, no se devuelve un inventario vacío ni de demostración.
 */
function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Defínela en .env.local (ver .env.example).",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      // El pooler cierra las conexiones ociosas por su cuenta; soltarlas
      // antes desde aquí evita quedarse con sockets muertos entre invocaciones.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      max: 5,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// En desarrollo se guarda en globalThis para que el hot reload no deje una
// piscina de conexiones nueva en cada recarga.
const globalForPrisma = globalThis as unknown as {
  millePrisma?: PrismaClient;
};

function client(): PrismaClient {
  if (!globalForPrisma.millePrisma) {
    globalForPrisma.millePrisma = createClient();
  }
  return globalForPrisma.millePrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(client(), property, receiver);
  },
  has(_target, property) {
    return Reflect.has(client(), property);
  },
});
