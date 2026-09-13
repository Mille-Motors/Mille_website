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

/**
 * Busca la cuenta en el directorio de Supabase.
 *
 * Distingue tres situaciones que conviene no confundir: la encontramos, no
 * existe ninguna con ese correo, o no pudimos ni mirar. La segunda es casi
 * siempre una errata en el correo, y avisar de ello ahorra el rato de
 * intentar entrar con una cuenta que nunca va a autenticar.
 */
type AuthLookup =
  | { state: "found"; id: string }
  | { state: "absent" }
  | { state: "unreadable" };

async function findAuthUser(target: string): Promise<AuthLookup> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id::text AS id FROM auth.users WHERE lower(email) = ${target} LIMIT 1
    `;
    const id = rows[0]?.id;
    return id ? { state: "found", id } : { state: "absent" };
  } catch {
    // auth.users no es accesible con este rol: se enlazará en el primer
    // inicio de sesión, que también resuelve por correo.
    return { state: "unreadable" };
  }
}

/** Los correos que sí existen, para poder señalar la errata. */
async function listAuthEmails(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<{ email: string }[]>`
      SELECT email FROM auth.users WHERE email IS NOT NULL ORDER BY created_at
    `;
    return rows.map((row) => row.email);
  } catch {
    return [];
  }
}

async function main() {
  const lookup = await findAuthUser(email!);
  const authUserId = lookup.state === "found" ? lookup.id : null;

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

  if (lookup.state === "found") {
    console.log("  Vinculado con su usuario de Supabase Auth.");
    console.log("  Entra en /admin/login con ese correo y su contraseña.");
    return;
  }

  if (lookup.state === "unreadable") {
    console.log(
      "  No se pudo consultar auth.users con este rol. Si la cuenta existe,\n" +
        "  el vínculo se hará solo en su primer inicio de sesión.",
    );
    return;
  }

  // No hay ninguna cuenta con ese correo. Es lo más parecido a una errata, y
  // callarlo dejaría una fila que nunca podrá autenticar.
  console.warn(
    `\n  AVISO: no existe ninguna cuenta en Supabase Auth con ${email}.\n` +
      "  Esta fila no podrá iniciar sesión hasta que exista.",
  );
  const existing = await listAuthEmails();
  if (existing.length > 0) {
    console.warn("\n  Cuentas que sí existen en Supabase Auth:");
    for (const found of existing) console.warn(`    · ${found}`);
    console.warn(
      "\n  Si te equivocaste de correo, revoca esta fila y concede la correcta:\n" +
        `    npm run admin:grant -- ${email} --revoke`,
    );
  } else {
    console.warn(
      "\n  Crea la cuenta en Supabase → Authentication → Users → Add user.",
    );
  }
}

main()
  .catch((error) => {
    console.error("No se pudo completar:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
