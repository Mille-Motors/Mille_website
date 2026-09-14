/**
 * Configuración pública de Supabase.
 *
 * Los proyectos nuevos llaman "publishable key" a lo que los antiguos
 * llamaban "anon key". Se aceptan las dos para no obligar a renombrar una
 * variable ya configurada; ambas son públicas por diseño y van al navegador.
 * La service role key no se usa en ninguna parte del proyecto.
 *
 * Las referencias a process.env son literales a propósito: Next sustituye
 * NEXT_PUBLIC_* en tiempo de compilación y no puede hacerlo si el nombre es
 * dinámico.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * El panel de Supabase enseña varias URLs y la que hace falta aquí es la
 * base del proyecto — `https://<ref>.supabase.co` — no la de la Data API
 * (`.../rest/v1`), que es la que aparece más a mano. Pegar la segunda deja
 * la aplicación pidiendo `/rest/v1/auth/v1/token`, que responde 404 con un
 * error de PostgREST y no se parece en nada al problema real.
 *
 * Por eso se valida la forma y no solo la presencia: es un fallo fácil de
 * cometer y muy caro de diagnosticar. Se normaliza la barra final, que sí es
 * inofensiva.
 */
export function assertSupabaseConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error(
      "Falta la configuración de Supabase: define NEXT_PUBLIC_SUPABASE_URL y " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local (ver .env.example).",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(SUPABASE_URL);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL no es una URL válida. Debe ser la URL base " +
        "del proyecto, por ejemplo https://tu-proyecto.supabase.co",
    );
  }

  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL debe ser la URL base del proyecto " +
        `(https://${parsed.host}), sin ruta. Recibida una con "${parsed.pathname}": ` +
        "esa es la URL de la Data API y con ella Auth y Storage no funcionan.",
    );
  }

  return { url: parsed.origin, key: SUPABASE_PUBLIC_KEY };
}

/** Bucket de imágenes de vehículos. Lectura pública, escritura autenticada. */
export const VEHICLE_IMAGE_BUCKET = "vehicle-images";

/**
 * Bucket de las imágenes estructurales del sitio. Separado del de vehículos
 * a propósito: son dos ciclos de vida distintos, y una limpieza de uno nunca
 * debe poder alcanzar al otro.
 */
export const SITE_MEDIA_BUCKET = "site-media";
