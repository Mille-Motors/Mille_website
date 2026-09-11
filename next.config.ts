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

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkOrigins(),
};

export default nextConfig;
