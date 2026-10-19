import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";
import { TERMS_VERSION } from "@/lib/legal-versions";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { defaultOgImages } from "@/server/site-media/og";

const TITLE = "Términos y Condiciones";
const DESCRIPTION = "Reglas de uso del sitio y de la información sobre vehículos de MILLE Motor Culture.";
const UPDATED = "17 de octubre de 2026";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: canonical("/terminos"),
    ...socialMetadata({
      images: await defaultOgImages(),
      title: `${TITLE} | ${site.name}`,
      description: DESCRIPTION,
      path: "/terminos",
    }),
  };
}

export default function TermsPage() {
  const whatsapp = generalWhatsappUrl();
  return (
    <LegalDocument title={TITLE} updated={UPDATED} version={TERMS_VERSION}>
      <LegalSection number="01" title="Qué es MILLE y qué ofrece este sitio">
        <p>El sitio de MILLE Motor Culture presenta contenido sobre cultura automotriz y fichas de vehículos, y permite enviar consultas, expresar interés en publicar un vehículo y solicitar coordinación de una visita. No hay compra, reserva pagada ni pago en línea disponible en el sitio.</p>
        <p>La presencia de un vehículo en una ficha no permite concluir que MILLE sea su propietario, vendedor, mandatario o intermediario. La relación de MILLE con cada vehículo y la identidad de quien ofrece venderlo deben confirmarse directamente antes de avanzar. La publicación tampoco convierte por sí sola al sitio en un marketplace de terceros.</p>
      </LegalSection>

      <LegalSection number="02" title="Información y disponibilidad de vehículos">
        <p>Las fichas reúnen información descriptiva para orientar una conversación: imágenes, características, precio, kilometraje, estado y disponibilidad, cuando esos datos estén publicados. Puede haber errores u omisiones y la información puede cambiar. Una consulta no confirma disponibilidad, precio final ni aceptación de una oferta. Confirma esos puntos con MILLE y con quien figure como vendedor antes de tomar una decisión.</p>
        <p>Algunas imágenes locales están identificadas en el proyecto como material de demostración; pueden no representar el vehículo real. Solicita fotografías actuales y documentos del vehículo que vas a evaluar.</p>
      </LegalSection>

      <LegalSection number="03" title="Consultas, visitas e inspecciones">
        <p>Enviar un formulario comunica interés y permite que MILLE revise la solicitud. No celebra un contrato de compraventa, no separa un vehículo y no garantiza que se concrete una visita. Cualquier fecha de visita debe confirmarse por un canal de atención.</p>
        <p>Antes de comprar, verifica personalmente la identidad del vendedor, titularidad, antecedentes, documentos, kilometraje, estado mecánico y demás características relevantes. Puedes solicitar una inspección independiente. Esta recomendación no elimina ni limita derechos irrenunciables que puedan corresponderte frente al productor o proveedor según la operación real.</p>
      </LegalSection>

      <LegalSection number="04" title="Vehículos de propietarios y terceros">
        <p>El sitio incluye una invitación para que propietarios interesados contacten a MILLE. Enviar los datos de un vehículo no garantiza su evaluación, aceptación ni publicación. Quien suministra la información debe estar autorizado para hacerlo, procurar que sea cierta y tener permiso para compartir las imágenes. No se concede una licencia de publicación hasta que las partes acuerden expresamente el alcance correspondiente.</p>
      </LegalSection>

      <LegalSection number="05" title="Uso permitido y propiedad intelectual">
        <p>Puedes navegar, consultar y compartir enlaces del sitio para fines personales y lícitos. No debes interferir con el servicio, automatizar envíos abusivos, intentar acceder al panel privado, extraer información de manera masiva ni usar el contenido para engañar o vulnerar derechos de terceros.</p>
        <p>Los nombres, textos, diseño y signos identificadores del sitio pertenecen a sus titulares o se usan con autorización según corresponda. Las marcas de vehículos identifican a sus respectivos titulares. No reutilices fotos o materiales sin verificar sus derechos y condiciones de uso.</p>
      </LegalSection>

      <LegalSection number="06" title="Enlaces externos, cambios y responsabilidad">
        <p>El sitio contiene enlaces a servicios externos, como WhatsApp e Instagram. Sus servicios y políticas son responsabilidad de sus respectivos operadores. MILLE no controla sus cambios ni su disponibilidad.</p>
        <p>MILLE procura mantener el sitio disponible y la información útil, pero no garantiza que el servicio esté libre de interrupciones o que cada ficha permanezca vigente. En la medida permitida por la ley, no responde por decisiones basadas únicamente en información desactualizada ni por el uso que terceros hagan de sus propios servicios. Nada de esta cláusula excluye responsabilidades o derechos que la ley colombiana no permita excluir.</p>
        <p>Estos términos pueden cambiar; la versión y fecha vigentes aparecen al inicio. Se aplica la ley colombiana. Las autoridades y jueces competentes se determinarán conforme a las reglas legales aplicables.</p>
      </LegalSection>

      <LegalSection number="07" title="Contacto">
        <p>Para consultas sobre el sitio, usa el <a href="/contacto">formulario de contacto</a> o escribe al WhatsApp {site.phone && whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer noopener">{site.phone.display}</a> : "de MILLE"}.</p>
      </LegalSection>
    </LegalDocument>
  );
}
