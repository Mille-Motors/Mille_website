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

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkOrigins(),
  images: {
    remotePatterns: supabaseImagePatterns(),
  },
};

export default nextConfig;
