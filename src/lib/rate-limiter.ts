/**
 * Un limitador de tasa con su propio tope y su propia memoria.
 *
 * Vive aparte de `server/http/rate-limit.ts` —el del formulario de contacto,
 * que conserva su comportamiento— por una razón práctica: aquel módulo es
 * `server-only` y este no tiene por qué serlo, así que las pruebas pueden
 * ejercitarlo sin levantar nada.
 *
 * `take` consume una unidad y devuelve `true` si todavía había cupo; con el
 * cupo agotado devuelve `false` sin consumir nada. Es en memoria y por
 * instancia: en Vercel cada función puede tener su propio proceso, así que no
 * es un límite global ni pretende serlo. Frena el script casero, no un ataque
 * distribuido.
 */
export function createRateLimiter({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}): { take(key: string): boolean } {
  const store = new Map<string, number[]>();

  return {
    take(key) {
      const now = Date.now();
      const times = (store.get(key) ?? []).filter((at) => now - at < windowMs);
      if (times.length >= max) {
        store.set(key, times);
        return false;
      }
      times.push(now);
      store.set(key, times);

      // El mapa no puede crecer sin fin en un proceso de vida larga.
      if (store.size > 5000) {
        for (const [entryKey, stamps] of store) {
          if (stamps.every((at) => now - at >= windowMs)) store.delete(entryKey);
        }
      }
      return true;
    },
  };
}
