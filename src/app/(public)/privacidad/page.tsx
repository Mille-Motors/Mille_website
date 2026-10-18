import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal-versions";
import { generalWhatsappUrl } from "@/lib/whatsapp";

const TITLE = "Política de Privacidad y Tratamiento de Datos";
const DESCRIPTION = "Conoce qué datos trata MILLE Motor Culture, para qué los usa y cómo ejercer tus derechos en Colombia.";
const UPDATED = "17 de octubre de 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonical("/privacidad"),
  ...socialMetadata({ title: `${TITLE} | ${site.name}`, description: DESCRIPTION, path: "/privacidad" }),
};

export default function PrivacyPage() {
  const whatsapp = generalWhatsappUrl();
  return (
    <LegalDocument title={TITLE} updated={UPDATED} version={PRIVACY_POLICY_VERSION}>
      <LegalSection number="01" title="Responsable del tratamiento">
        <p><strong className="text-ink">MILLE Motor Culture</strong> identifica la marca de este sitio. La identidad legal del responsable del tratamiento y sus datos de contacto deben confirmarse antes de publicar esta política como versión definitiva.</p>
        <p>Para una consulta sobre tus datos puedes usar el WhatsApp de atención: {site.phone && whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer noopener">{site.phone.display}</a> : "canal de WhatsApp"}, o el <a href="/contacto">formulario de contacto</a>. Para ejercer derechos no necesitas enviar información adicional a la necesaria para ubicar tu solicitud.</p>
      </LegalSection>

      <LegalSection number="02" title="Datos que tratamos y de dónde vienen">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-ink">Consultas y solicitudes de cita o información:</strong> nombre y al menos un canal de respuesta (teléfono o correo); el otro canal es opcional. También recibimos el mensaje opcional, vehículo consultado y página desde la que se envió. Los entregas en el formulario de contacto o en el formulario de una ficha de vehículo. Se guardan en la base de datos de la aplicación.</li>
          <li><strong className="text-ink">Autorización de privacidad:</strong> versión de esta política, tipo de autorización, origen y hora generada por el servidor, asociadas al registro de la consulta. No almacenamos la IP ni el agente del navegador como prueba de autorización.</li>
          <li><strong className="text-ink">Clics en enlaces de WhatsApp:</strong> página de origen, tipo de enlace, vehículo relacionado si aplica y hora del evento. Se guardan en la base de datos para contar interacciones; el sitio no añade nombre, correo ni teléfono al evento.</li>
          <li><strong className="text-ink">Panel interno:</strong> correo de la cuenta autorizada y datos técnicos de sesión necesarios para iniciar sesión y proteger la administración del inventario.</li>
          <li><strong className="text-ink">Control antispam:</strong> la dirección IP recibida en la solicitud se usa como clave en memoria del servidor para limitar envíos repetidos dentro de una ventana de diez minutos. El código no la escribe en la base de datos; su permanencia depende de la memoria temporal de la instancia.</li>
        </ul>
        <p>No hay campos para datos sensibles ni para datos de niñas, niños o adolescentes. No envíes esa información en el campo de mensaje.</p>
      </LegalSection>

      <LegalSection number="03" title="Finalidades y autorización">
        <p>Usamos los datos del formulario para recibir, revisar y responder la consulta que la persona inicia; identificar el vehículo por el que pregunta; y coordinar, cuando se solicite, una visita. Usamos los datos de autorización para conservar evidencia de la autorización previa e informada. Los conteos de WhatsApp sirven para conocer qué páginas y fichas generan interés. Las credenciales internas sirven para autenticar al equipo autorizado.</p>
        <p>Antes de enviar un formulario público, la persona debe marcar una casilla sin seleccionar previamente que autoriza el tratamiento descrito aquí. La autorización se solicita por separado de los Términos y de cualquier comunicación comercial. El sitio no ofrece suscripciones comerciales ni registra consentimiento de mercadeo. Si no autorizas, el formulario no se envía; puedes comunicarte por los canales que aparecen en contacto para consultar alternativas.</p>
        <p>El tratamiento se rige por la Ley 1581 de 2012 y sus normas reglamentarias, incluida la autorización previa e informada cuando sea exigible. La base de este registro concreto es la autorización expresa otorgada al enviar el formulario.</p>
      </LegalSection>

      <LegalSection number="04" title="Almacenamiento, encargados y circulación">
        <p>La configuración de la base de datos de la aplicación apunta a Supabase en East US (North Virginia, AWS us-east-1). Esto acredita la ubicación configurada para el almacenamiento de la base, pero por sí solo no determina si la operación constituye transferencia o transmisión internacional ni el rol jurídico de Supabase. Esa clasificación requiere revisar el contrato, el DPA, las instrucciones sobre fines y medios, y los subencargados que puedan acceder o tratar los datos. También deben confirmarse por separado las regiones aplicables a Auth y Storage. El proveedor de alojamiento de la aplicación debe confirmarse en la configuración del despliegue.</p>
        <p>En términos generales, hay transmisión cuando un encargado trata los datos por cuenta del responsable; hay transferencia cuando se comunican a otro responsable que decide sus propios fines y medios. El almacenamiento o procesamiento técnico fuera de Colombia describe la ubicación del tratamiento, pero no basta para escoger entre esas figuras. La relación concreta con Supabase requiere confirmación contractual y jurídica. Al elegir un enlace de WhatsApp o Instagram, el navegador abre el servicio correspondiente y la información que compartas allí queda sujeta a las políticas de ese proveedor; el enlace no envía automáticamente el contenido de esta consulta.</p>
      </LegalSection>

      <LegalSection number="05" title="Conservación y seguridad">
        <p>El proyecto no implementa una fecha automática de eliminación para las consultas ni una tabla de plazos de conservación. La pauta publicada es conservarlas mientras se atiende la solicitud y luego revisarlas para eliminarlas cuando dejen de ser necesarias, salvo deber legal o necesidad de atender una reclamación. La autorización vinculada a la consulta se elimina con ella. MILLE debe aprobar y aplicar un calendario concreto de conservación.</p>
        <p>El acceso a consultas está limitado al panel autenticado y autorizado; la base de datos tiene controles de acceso, y el servidor valida los datos recibidos. Estas medidas reducen el riesgo, pero ningún sistema conectado a internet puede prometer seguridad absoluta.</p>
      </LegalSection>

      <LegalSection number="06" title="Derechos y solicitudes">
        <p>Puedes conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización y conocer el uso dado; presentar consultas o reclamos; y solicitar la revocatoria o supresión cuando proceda. También puedes acudir a la Superintendencia de Industria y Comercio después de agotar el trámite ante el responsable, según las reglas aplicables.</p>
        <p>Envía tu solicitud por {site.phone && whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer noopener">WhatsApp ({site.phone.display})</a> : "WhatsApp"} e indica “datos personales”, cómo podemos ubicar tu consulta y el derecho que deseas ejercer. Las consultas se atienden en diez (10) días hábiles; si no es posible responder en ese plazo, se informará el motivo y el nuevo plazo, que no excederá cinco (5) días hábiles adicionales. Los reclamos se atienden en quince (15) días hábiles; la ampliación, cuando aplique, no excederá ocho (8) días hábiles adicionales.</p>
      </LegalSection>

      <LegalSection number="07" title="Menores de edad y cambios">
        <p>El sitio no está dirigido a niñas, niños o adolescentes y no solicita deliberadamente sus datos personales. Si se reciben por error, contáctanos para revisar el caso y aplicar las reglas legales pertinentes, siempre con prevalencia de sus derechos.</p>
        <p>Si cambia el tratamiento, se actualizará esta política y su versión. Si un cambio requiere una nueva autorización, se solicitará antes de realizar el tratamiento nuevo.</p>
      </LegalSection>
    </LegalDocument>
  );
}
