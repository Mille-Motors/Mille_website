import "../prisma/env";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Concede el rol de Superadmin a una cuenta.
 *
 *   npm run admin:grant -- persona@ejemplo.com
 *   npm run admin:grant -- persona@ejemplo.com --revoke
 *
 * No crea credenciales ni las pide: la contraseña vive en Supabase Auth y
 * este script nunca la ve. El flujo es crear la persona en Supabase
 * (Authentication → Users → Add user) y después autorizarla aquí.
 *
 * Funciona aunque el usuario de Supabase todavía no exista: en ese caso la
 * fila queda con `authUserId` en null y se enlaza sola la primera vez que
 * esa persona entra, porque la sesión también se resuelve por correo.
 *
 * El vínculo con auth.users se busca por SQL directo contra el esquema de
 * Supabase. Es lo que evita necesitar una service role key para esto.
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Falta DIRECT_URL (o DATABASE_URL). Defínelas en .env.local — ver .env.example.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Uso: npm run admin:grant -- correo@ejemplo.com [--revoke]");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function findAuthUserId(target: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id::text AS id FROM auth.users WHERE lower(email) = ${target} LIMIT 1
    `;
    return rows[0]?.id ?? null;
  } catch {
    // auth.users no es accesible con este rol. No es fatal: la fila se
    // enlaza sola en el primer inicio de sesión.
    return null;
  }
}

async function main() {
  const authUserId = await findAuthUserId(email!);

  if (revoke) {
    const existing = await prisma.adminUser.findUnique({ where: { email: email! } });
    if (!existing) {
      console.log(`No hay ningún administrador con el correo ${email}.`);
      return;
    }
    await prisma.adminUser.update({
      where: { email: email! },
      data: { active: false },
    });
    console.log(`Acceso revocado para ${email}. La fila se conserva desactivada.`);
    return;
  }

  const admin = await prisma.adminUser.upsert({
    where: { email: email! },
    create: {
      email: email!,
      authUserId,
      role: "SUPERADMIN",
      active: true,
    },
    update: {
      role: "SUPERADMIN",
      active: true,
      // Solo se escribe si lo encontramos: null no debe borrar un vínculo ya hecho.
      ...(authUserId ? { authUserId } : {}),
    },
  });

  console.log(`Superadmin activo: ${admin.email}`);
  console.log(
    authUserId
      ? "  Vinculado con su usuario de Supabase Auth."
      : "  Todavía sin usuario en Supabase Auth: créalo en Authentication → Users.\n" +
          "  El vínculo se hará solo en su primer inicio de sesión.",
  );
  console.log("  Entra en /admin/login con ese correo y su contraseña.");
}

main()
  .catch((error) => {
    console.error("No se pudo completar:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
