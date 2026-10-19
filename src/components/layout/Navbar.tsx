import { SiteHeader } from "@/components/layout/SiteHeader";
import { NAV_MEDIA_BY_HREF, type SiteMediaImage } from "@/lib/site-media";
import { getSiteMediaImage } from "@/server/site-media/service";

/**
 * La barra superior de cada página pública.
 *
 * Casi todo lo que hace vive en `SiteHeader` —necesita saber en qué ruta
 * está y si la página se ha movido—, así que este componente de servidor
 * solo la monta. Lo que sí resuelve aquí es la fotografía de cada enlace
 * del menú: son datos de la base y el menú es un componente de cliente, así
 * que tienen que llegarle ya resueltos.
 */
export async function Navbar() {
  const entries = await Promise.all(
    Object.entries(NAV_MEDIA_BY_HREF).map(
      async ([href, key]) => [href, await getSiteMediaImage(key)] as const,
    ),
  );

  return <SiteHeader previews={Object.fromEntries(entries)} />;
}

export type NavPreviews = Record<string, SiteMediaImage>;
