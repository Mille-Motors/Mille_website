import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { assertSupabaseConfig } from "@/server/auth/config";

/**
 * Cliente de Supabase para el servidor, ligado a las cookies de la petición.
 *
 * Se crea uno nuevo por petición a propósito: compartirlo entre peticiones
 * mezclaría sesiones. La sesión la mantiene Supabase en cookies httpOnly; la
 * aplicación nunca toca el token a mano.
 */
export async function createSupabaseServerClient() {
  const { url, key } = assertSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies. El refresco de
          // sesión lo hace proxy.ts, que sí puede, así que aquí se ignora.
        }
      },
    },
  });
}
