import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma del runtime.
 *
 * Prisma 7 no lleva motor nativo: la conexión la abre `pg` a través del
 * driver adapter, y por eso la URL se pasa aquí y no en el schema.
 *
 * DATABASE_URL apunta al *transaction pooler* de Supavisor (6543). Es el
 * modo que corresponde a un despliegue serverless: devuelve la conexión de
 * servidor al terminar cada transacción, de modo que muchas instancias
 * efímeras comparten pocas conexiones reales de Postgres. El modo sesión
 * (5432) dedica una conexión por cliente y se agota en cuanto Vercel escala.
 *
 * Las migraciones NO pueden ir por aquí: necesitan DDL, advisory locks y
 * estado de sesión. Usan DIRECT_URL desde prisma7.config.ts.
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

      // NO se define `statementNameGenerator`, y es una decisión, no un
      // olvido: sin él el adaptador manda las sentencias sin nombre y no las
      // cachea, que es justo lo que exige un pooler en modo transacción.
      // Activarlo daría "prepared statement already exists" en cuanto dos
      // peticiones cayeran en la misma conexión de servidor.
      //
      // Tampoco hace falta `?pgbouncer=true` en la URL: ese parámetro era
      // del motor Rust de Prisma 5/6. En Prisma 7 está en la lista de
      // parámetros heredados que el CLI ignora, y el adaptador no lo mira.

      // Piscina pequeña a propósito. Cada instancia serverless tiene la
      // suya, así que el número se multiplica por cuantas Vercel levante; y
      // `next build` arranca siete workers que prerenderizan en paralelo.
      // Con el pooler en modo transacción dos conexiones por proceso cubren
      // los pares de consultas que las páginas lanzan con Promise.all, sin
      // acumular conexiones ociosas.
      max: 2,
      idleTimeoutMillis: 10_000,
      // Margen para esperar turno en un pico en vez de rendirse.
      connectionTimeoutMillis: 20_000,
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
