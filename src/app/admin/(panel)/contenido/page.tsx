import { SiteMediaAdmin } from "@/components/admin/SiteMediaAdmin";
import { listSiteMedia } from "@/server/site-media/service";

export const metadata = { title: "Imágenes del sitio" };

/**
 * Las fotografías estructurales del sitio. No es un CMS: los slots
 * están definidos en el código y aquí solo se cambia la imagen de cada uno.
 */
export default async function AdminContentPage() {
  const media = await listSiteMedia();
  return <SiteMediaAdmin media={media} />;
}
