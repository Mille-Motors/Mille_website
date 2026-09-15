import type { MetadataRoute } from "next";

import { buildSitemap } from "@/lib/seo";
import { getVehicleSitemapEntries } from "@/lib/vehicles";

/**
 * Se sirve en /sitemap.xml.
 *
 * Se calcula en cada petición, no en el build, por la misma razón por la que
 * la ficha de vehículo no usa `generateStaticParams`: la base es la fuente de
 * verdad y publicar desde el admin tiene que verse de inmediato. Un sitemap
 * congelado en el último despliegue le estaría enseñando a Google el
 * inventario de entonces, y ataría además cada build a que la base responda.
 * Google lo pide de vez en cuando; el coste es una consulta.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await getVehicleSitemapEntries());
}
