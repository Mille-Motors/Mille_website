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

export function assertSupabaseConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error(
      "Falta la configuración de Supabase: define NEXT_PUBLIC_SUPABASE_URL y " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local (ver .env.example).",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLIC_KEY };
}

/** Bucket de imágenes de vehículos. Lectura pública, escritura autenticada. */
export const VEHICLE_IMAGE_BUCKET = "vehicle-images";
