"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseConfig } from "@/server/auth/config";

/**
 * Cliente de Supabase del navegador. Solo lo usa /admin/login para hacer
 * signInWithPassword y el botón de cerrar sesión: todo lo demás decide
 * permisos en el servidor.
 */
export function createSupabaseBrowserClient() {
  const { url, key } = assertSupabaseConfig();
  return createBrowserClient(url, key);
}
