import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { forbidden, unauthenticated } from "@/server/http/errors";
import type { AdminSession } from "@/types/admin";

/**
 * El único sitio donde se decide si alguien puede hacer algo privado.
 *
 * La identidad la da Supabase Auth; el permiso lo da la tabla AdminUser. Las
 * dos condiciones se comprueban siempre juntas: tener una sesión válida de
 * Supabase no convierte a nadie en Superadmin, porque el directorio de auth
 * es de todo el proyecto y la autorización es nuestra.
 *
 * Ninguna ruta privada consulta Supabase o AdminUser por su cuenta: todas
 * pasan por aquí.
 */
export type { AdminSession };

/**
 * Resuelve la sesión administrativa de la petición actual, o null.
 *
 * `cache` la memoiza dentro de una misma petición: el layout, la página y
 * cualquier servicio pueden pedirla sin que eso signifique varias consultas.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  // Por authUserId cuando ya está enlazado, y por email la primera vez: así
  // conceder el rol funciona aunque la persona todavía no haya entrado nunca.
  const admin = await prisma.adminUser.findFirst({
    where: {
      OR: [{ authUserId: user.id }, { email: user.email.toLowerCase() }],
    },
  });

  if (!admin || !admin.active || admin.role !== "SUPERADMIN") return null;

  // Enlaza la fila con la identidad de Supabase la primera vez, y deja
  // constancia de la última visita. No es crítico: si falla, la sesión sigue
  // siendo válida.
  if (admin.authUserId !== user.id) {
    try {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { authUserId: user.id, lastSeenAt: new Date() },
      });
    } catch (error) {
      console.error("[mille:auth] no se pudo enlazar authUserId", error);
    }
  }

  return {
    authUserId: user.id,
    email: admin.email,
    adminUserId: admin.id,
    name: admin.name,
  };
});

/**
 * Para los route handlers: lanza en vez de redirigir, porque una API debe
 * responder 401/403 y no un 307 a una pantalla de login.
 */
export async function requireSuperadmin(): Promise<AdminSession> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw unauthenticated();

  const session = await getAdminSession();
  if (!session) throw forbidden("Esta cuenta no tiene acceso de administración.");

  return session;
}

/**
 * Para las páginas del admin: manda al login si no hay sesión utilizable.
 * `reason=denied` distingue "no has entrado" de "entraste pero no tienes
 * permiso", que es lo que el login necesita para decir algo honesto.
 */
export async function requireSuperadminPage(): Promise<AdminSession> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const session = await getAdminSession();
  if (!session) redirect("/admin/login?reason=denied");

  return session;
}
