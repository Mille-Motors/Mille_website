import "server-only";

import { ApiError } from "@/server/http/errors";

/**
 * Freno básico para el único endpoint que acepta escrituras anónimas.
 *
 * Es deliberadamente en memoria y por instancia: en Vercel cada función
 * puede tener su propio proceso, así que esto no es un límite global y no
 * pretende serlo. Frena el envío repetido y el script casero sin meter Redis
 * ni otra dependencia de infraestructura en una V1 de 22 vehículos. Un
 * límite realmente distribuido queda documentado como pendiente en
 * docs/backend.md.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

/** La IP del cliente según el proxy que tenga Vercel delante. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function enforceRateLimit(key: string): void {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    throw new ApiError(
      "RATE_LIMITED",
      "Recibimos varios mensajes tuyos. Espera unos minutos antes de enviar otro.",
    );
  }

  recent.push(now);
  hits.set(key, recent);

  // El mapa no puede crecer sin fin en un proceso de vida larga.
  if (hits.size > 5000) {
    for (const [entryKey, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(entryKey);
    }
  }
}
