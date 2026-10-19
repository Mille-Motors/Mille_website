/**
 * La IP del cliente, obtenida en el SERVIDOR.
 *
 * Vive en `src/server` pero NO lleva el marcador `server-only` de sus
 * vecinos, y la excepción es deliberada: es una función pura de las cabeceras
 * de una `Request` a una cadena —sin base de datos, sin secretos, sin
 * sesión— y lo que garantiza es precisamente que NO se confía en un dato que
 * manda el cliente. Eso es lo que más falta hace poder fijar en una prueba,
 * y `server-only` impediría cargarlo desde una.
 *
 * Nunca de un campo del formulario ni de nada que escriba el navegador: una
 * IP que manda el propio cliente no prueba de dónde vino una autorización,
 * prueba qué quiso escribir el cliente. Esto lee cabeceras que pone el proxy
 * de la plataforma, y además deja constancia de CUÁL, porque de eso depende
 * cuánto vale el dato.
 *
 * El orden de preferencia no es arbitrario; sale de la documentación de
 * Vercel sobre cabeceras de petición:
 *
 *   1. `x-vercel-forwarded-for` — Vercel la documenta como idéntica a
 *      `x-forwarded-for`, y advierte que es esta última la que «podría
 *      sobrescribirse si usas un proxy por encima de Vercel». Por eso va
 *      primero.
 *   2. `x-forwarded-for` — la IP pública del cliente. Vercel declara que,
 *      cuando hay un proxy por delante, SOBRESCRIBE esta cabecera y no
 *      reenvía IPs externas, precisamente para evitar suplantación. Un
 *      `X-Forwarded-For` propio solo se admite con el Trusted Proxy de plan
 *      Enterprise, que MILLE no usa.
 *   3. `x-real-ip` — también documentada como idéntica. Último recurso.
 *
 * HASTA DÓNDE LLEGA LA GARANTÍA, dicho sin adornos. Que estas cabeceras no
 * las pueda falsear el cliente es una propiedad de la PLATAFORMA, no algo
 * que este código pueda verificar: lo único que se ve desde aquí es una
 * cadena de texto. La evidencia vale, por tanto, lo que valga el despliegue:
 *
 *   - Detrás del edge de Vercel, que es cómo se sirve el sitio, la IP la
 *     pone Vercel y la cabecera entrante del cliente se descarta.
 *   - Si la aplicación quedara accesible SIN pasar por ese edge, o detrás de
 *     un proxy que no reescriba la cabecera, lo que llegue aquí sería lo que
 *     quiera el cliente. Pasar una cabecera a mano con `curl` en local
 *     demuestra que el parseo funciona; NO demuestra autenticidad.
 *
 * Así que la IP se guarda como un indicio corroborante —junto a la hora de
 * servidor, el origen del formulario y la huella del texto—, no como una
 * identificación fuerte de nadie. Ninguna decisión depende solo de ella, y
 * `ipSource` queda registrado para poder valorar después cuánto vale.
 *
 * En desarrollo local no existe ninguna: devuelve `null`, que es lo honesto.
 * Un evento de consentimiento sin IP sigue siendo válido —la ley no exige
 * registrar la IP, exige poder consultar la autorización después—, y escribir
 * "127.0.0.1" o "desconocida" en la columna sería ensuciar la evidencia con
 * un valor que parece un dato.
 *
 * Si el despliegue cambia —Cloudflare delante, un balanceador propio—, este
 * archivo es el único sitio que hay que revisar, y habría que revisarlo: con
 * un proxy intermedio el primer salto de la cadena deja de ser el cliente.
 */

/** En qué orden se consultan las cabeceras, de más a menos fiable. */
const IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-real-ip",
] as const;

export interface ClientIp {
  /** La dirección, o `null` si ninguna cabecera trajo una válida. */
  address: string | null;
  /** De qué cabecera salió, para poder valorar el dato después. */
  header: string | null;
}

/**
 * IPv4 en notación decimal, o algo con la forma de una IPv6.
 *
 * No pretende ser un validador completo de IPv6 —eso son cuarenta líneas de
 * expresión regular— sino un filtro que descarta lo que claramente no es una
 * dirección: una cabecera vacía, un `unknown`, un nombre de host o un
 * intento de inyectar texto en la columna.
 */
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_SHAPE = /^[0-9a-f:]+(?:\.\d{1,3}){0,3}$/i;

function looksLikeIp(value: string): boolean {
  if (value.length === 0 || value.length > 45) return false;
  if (IPV4.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  return value.includes(":") && IPV6_SHAPE.test(value);
}

export function clientIp(request: Request): ClientIp {
  for (const header of IP_HEADERS) {
    const raw = request.headers.get(header);
    if (!raw) continue;
    // La cabecera puede traer una cadena de proxies. El PRIMERO es el
    // cliente; los siguientes son los saltos intermedios.
    const first = raw.split(",")[0]!.trim();
    if (looksLikeIp(first)) return { address: first, header };
  }
  return { address: null, header: null };
}

/**
 * El identificador de la petición en la plataforma.
 *
 * `x-vercel-id` lista las regiones por las que pasó y la que ejecutó la
 * función. Guardarlo junto al evento permite cruzar una autorización con la
 * traza de su propia petición en los logs, que es lo más cerca que se puede
 * estar de "aquí está la petición exacta" sin almacenar la petición.
 */
export function requestId(request: Request): string | null {
  const value = request.headers.get("x-vercel-id");
  if (!value) return null;
  return value.slice(0, 200);
}

/**
 * El agente de usuario, acotado.
 *
 * Aporta a la valoración probatoria del art. 11 de la Ley 527 de 1999 —la
 * fiabilidad de cómo se generó el mensaje— y no identifica a nadie por sí
 * solo. Se recorta porque es texto que escribe el cliente y no tiene por qué
 * tener trescientos caracteres.
 */
export function clientUserAgent(request: Request): string | null {
  const value = request.headers.get("user-agent");
  if (!value) return null;
  return value.slice(0, 300);
}

/**
 * Lo que identifica a quien envía, para el freno antispam.
 *
 * Reutiliza la misma resolución de IP en vez de leer `x-forwarded-for` por su
 * cuenta: tener dos formas de averiguar la IP en el mismo proyecto es tener
 * dos respuestas distintas a la misma pregunta. Sin IP devuelve una clave
 * compartida, que es lo que ya hacía: un cubo común es un freno peor, pero
 * es el único posible cuando no se puede distinguir a nadie.
 */
export function clientRateLimitKey(request: Request): string {
  return clientIp(request).address ?? "unknown";
}
