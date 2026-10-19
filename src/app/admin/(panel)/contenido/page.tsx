import { FormSection } from "@/components/admin/FormSection";
import { SiteMediaAdmin } from "@/components/admin/SiteMediaAdmin";
import { SiteMediaProvenancePanel } from "@/components/admin/SiteMediaProvenancePanel";
import { listSiteMedia } from "@/server/site-media/service";
import { listSiteMediaProvenance } from "@/server/provenance/service";

export const metadata = { title: "Imágenes del sitio" };

/**
 * Las fotografías estructurales del sitio. No es un CMS: los slots
 * están definidos en el código y aquí solo se cambia la imagen de cada uno.
 */
export default async function AdminContentPage() {
  const [media, provenance] = await Promise.all([
    listSiteMedia(),
    listSiteMediaProvenance(),
  ]);

  return (
    <>
      <SiteMediaAdmin media={media} />

      {/* En su propia sección, plegada.
          Subir, encuadrar y revisar el recorte es el trabajo diario de esta
          pantalla; los derechos se rellenan una vez. Añadir once campos a
          cada tarjeta enterraría lo primero debajo de lo segundo. */}
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <FormSection
          title="Procedencia de las fotografías"
          description="De dónde salió la fotografía de cada espacio y por qué podemos usarla. No se muestra en el sitio público."
        >
          <SiteMediaProvenancePanel initial={provenance} />
        </FormSection>
      </div>
    </>
  );
}
