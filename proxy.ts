import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/server/auth/config";

/**
 * En Next.js 16 el antiguo `middleware.ts` se llama `proxy.ts`.
 *
 * Hace dos cosas, y ninguna de ellas es autorización de verdad:
 *
 * 1. Refresca la sesión de Supabase y escribe las cookies renovadas. Los
 *    Server Components no pueden escribir cookies, así que si esto no
 *    ocurriera aquí la sesión se caducaría sola.
 * 2. Manda al login a quien entre a /admin sin sesión, que es una comodidad
 *    de navegación.
 *
 * Aquí solo se comprueba que exista una sesión. Si esa cuenta tiene rol de
 * Superadmin lo deciden `requireSuperadminPage` y `requireSuperadmin`, en el
 * servidor, sobre la base de datos — cada página y cada endpoint privado
 * vuelve a comprobarlo por su cuenta. Un redirect nunca es una defensa.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sin configuración de Supabase no hay sesión que refrescar. Se deja pasar
  // para que el sitio público siga funcionando y el admin falle con un
  // mensaje claro en vez de un 500 opaco desde el proxy.
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Una respuesta que escribe cookies de sesión no puede quedar
        // cacheada por un CDN: serviría el token de una persona a otra.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname !== "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Solo el admin. El sitio público no pasa por aquí: no necesita sesión y
  // no debe pagar una llamada a Supabase por petición.
  matcher: ["/admin/:path*"],
};
