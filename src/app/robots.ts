import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/**
 * Se sirve en /robots.txt.
 *
 * El sitio público se rastrea entero. Lo que queda fuera es lo que no es
 * contenido: el panel de administración y la API. `Disallow: /admin` sin
 * barra final cubre también `/admin` a secas, no solo lo que cuelga de él.
 *
 * Bloquear aquí no es proteger: quien entre a `/admin` sin sesión sigue
 * yendo al login, y cada endpoint privado vuelve a comprobar el rol en el
 * servidor. Esto solo evita que aparezcan en una búsqueda.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
