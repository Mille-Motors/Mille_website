import os from "node:os";
import type { NextConfig } from "next";

/**
 * Next blocks cross-origin requests to dev-only assets by default, so opening
 * the dev server from a phone on the same network gets a 403 on every client
 * chunk: the HTML renders but nothing hydrates.
 *
 * Derived from the machine's own private interfaces instead of a hardcoded
 * address, because the LAN IP changes. Nothing wider than this host's own
 * addresses is allowed, and the option only applies in development.
 */
function localNetworkOrigins(): string[] {
  const origins = new Set<string>();
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      origins.add(address.address);
    }
  }
  return [...origins];
}

/**
 * Las fotos subidas desde el admin viven en Supabase Storage, así que
 * next/image tiene que poder optimizarlas desde ese host. El patrón se
 * deriva de NEXT_PUBLIC_SUPABASE_URL en vez de estar escrito a mano: abrir
 * "cualquier host" sería convertir nuestro optimizador en un proxy de
 * imágenes ajeno. Las fotos heredadas siguen sirviéndose desde /public y no
 * necesitan nada de esto.
 */
function supabaseImagePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { hostname } = new URL(url);
    return [
      {
        protocol: "https" as const,
        hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

/**
 * Endurecimiento conservador de cabeceras.
 *
 * Deliberadamente SIN Content-Security-Policy: una CSP improvisada rompería
 * los scripts inline de Next, las fuentes de Google, el optimizador de
 * imágenes o las llamadas a Supabase, y depurarla en producción es su propia
 * fase. Estas cuatro no tienen ese riesgo.
 *
 * `DENY` en el framing: ni el sitio público ni el Admin se embeben en ningún
 * sitio, y un Admin enmarcable es la puerta de un clickjacking.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/**
 * Lo que no es contenido no se indexa, y eso incluye lo que no pasa por la
 * Metadata API: una respuesta de la API no tiene `<head>` donde poner un
 * `<meta name="robots">`, así que se dice por cabecera. `/robots.txt` pide
 * además que ni siquiera se rastreen; esto cubre el caso de que alguien
 * llegue a una de esas URLs por un enlace, donde el `Disallow` no basta.
 */
const noIndexHeader = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkOrigins(),
  images: {
    remotePatterns: supabaseImagePatterns(),
    /**
     * Next 16 ya no acepta cualquier `quality`: solo los valores listados
     * aquí, y por defecto la lista es `[75]` —pedir 90 devuelve un 400, no
     * una imagen mejor—. Las fotografías estructurales de la home son la
     * mitad de la percepción del sitio, así que se habilita 90 para ellas.
     * El 75 se conserva porque es lo que usa todo lo demás: las fichas de
     * vehículo no necesitan gastar ese peso.
     */
    qualities: [75, 90],
    /**
     * Los anchos por defecto saltan de 2048 a 3840 sin nada en medio, así que
     * un hueco que necesita ~2160 px en una pantalla Retina se lleva el de
     * 3840: casi el doble de píxeles de los que caben. El escalón de 2560
     * cierra ese hueco y es lo que separa "nítido" de "nítido y pesado".
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [...securityHeaders, noIndexHeader] },
      { source: "/api/:path*", headers: [...securityHeaders, noIndexHeader] },
      {
        // Una respuesta de la API privada no debe poder quedarse en ninguna
        // caché compartida. Por defecto salían como `public, max-age=0`.
        source: "/api/admin/:path*",
        headers: [
          ...securityHeaders,
          noIndexHeader,
          { key: "Cache-Control", value: "no-store, private" },
        ],
      },
    ];
  },
};

export default nextConfig;
