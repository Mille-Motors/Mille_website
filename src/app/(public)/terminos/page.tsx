import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";
import {
  CONSUMER_AUTHORITY,
  LEGAL_CONTACT,
  LEGAL_VERSIONS,
  formatLegalVersion,
  responsibleIdentified,
} from "@/lib/legal";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { defaultOgImages } from "@/server/site-media/og";

/**
 * Los Términos y Condiciones.
 *
 * Describen el sitio tal como funciona y no un marketplace que MILLE no es:
 * las fichas las publica MILLE, no terceros, y quien se interesa escribe a
 * MILLE y no a un vendedor a través de una plataforma. Esa distinción importa
 * —el art. 53 de la Ley 1480 de 2011 regula los «portales de contacto», que es
 * otra figura— y por eso se dice explícitamente.
 *
 * Nada de lo que el producto no hace aparece aquí: no hay compra, reserva
 * pagada, financiación, escrow, garantía de venta ni comisión. Y ninguna
 * cláusula pretende quitar derechos irrenunciables del consumidor, porque no
 * se puede: el art. 4 de esa misma ley hace ineficaz la estipulación que
 * contravenga sus normas.
 */
const TITLE = "Términos y Condiciones";
const DESCRIPTION =
  "Reglas de uso del sitio de MILLE Motor Culture: qué hace y qué no hace, cómo se publican los vehículos y qué responsabilidad asume MILLE.";

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
    <LegalDocument title={TITLE} version={LEGAL_VERSIONS.terms}>
      <LegalSection number="01" title="Qué es este sitio y quién lo opera">
        <p>
          <a href={site.url}>millemotorculture.com</a> es el sitio de{" "}
          <strong className="text-ink">MILLE Motor Culture</strong>, una marca
          de cultura automotriz con base en {site.city}, {site.country}. El
          sitio publica contenido sobre vehículos y fichas de inventario, y
          permite enviarnos una consulta, manifestar interés en vender un
          vehículo o pedir que coordinemos una visita.
        </p>
        <p>
          MILLE no es una sociedad constituida: la operan personas naturales en
          asocio.{" "}
          {responsibleIdentified()
            ? "Su identificación completa está en la Política de Tratamiento de Datos Personales."
            : "Su identificación legal completa se publicará en la Política de Tratamiento de Datos Personales en cuanto esté confirmada; los canales de contacto de la sección 09 son reales y están operativos."}
        </p>
        <p>
          Usar el sitio implica aceptar estos términos. Si no estás de acuerdo
          con ellos, no lo uses.
        </p>
      </LegalSection>

      <LegalSection number="02" title="Qué NO hace el sitio">
        <p>
          Decirlo por adelantado evita malentendidos que después cuestan dinero:
        </p>
        <ul>
          <li>
            <strong className="text-ink">No procesa pagos.</strong> No hay
            carrito, ni pasarela, ni tarjetas, ni billeteras, ni anticipos, ni
            reservas pagadas. Cualquier negociación económica sobre un vehículo
            ocurre fuera del sitio, directamente entre las partes. Si alguna vez
            se habilitara un pago en línea, estos términos cambiarían antes.
          </li>
          <li>
            <strong className="text-ink">No reserva vehículos.</strong> Enviar
            un formulario no aparta nada ni fija un precio.
          </li>
          <li>
            <strong className="text-ink">
              No ofrece financiación ni seguros
            </strong>{" "}
            ni permite contratarlos. Si necesitas financiar la compra, eso se
            gestiona por fuera y con quien corresponda.
          </li>
          <li>
            <strong className="text-ink">
              No otorga garantías mecánicas ni certifica el estado de un
              vehículo.
            </strong>{" "}
            Lo que publica una ficha es información, no una certificación. Esto
            no afecta las garantías legales que correspondan frente a quien
            efectivamente te venda el vehículo.
          </li>
          <li>
            <strong className="text-ink">
              No es un marketplace ni un portal de contacto.
            </strong>{" "}
            Los terceros no publican por su cuenta: las fichas las elabora y
            publica MILLE, y quien se interesa nos escribe a nosotros.
          </li>
          <li>
            <strong className="text-ink">No tiene cuentas de usuario.</strong>{" "}
            No hay registro ni área privada para el público; el panel de
            administración es solo para el equipo.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="03" title="La información de las fichas">
        <p>
          Las fichas reúnen lo que sabemos de cada vehículo para orientar una
          conversación: fotografías, características, precio, kilometraje,
          estado documental y disponibilidad, cuando esos datos existen. Lo que
          no sabemos no aparece: una ficha omite el dato que desconoce en vez de
          rellenarlo con una estimación.
        </p>
        <p>
          Parte de esa información la suministran los propietarios, dealers o
          terceros que ofrecen el vehículo, y la publicamos tal como la
          entregan. Puede haber errores, omisiones o cambios: un vehículo puede
          venderse, reservarse o cambiar de precio antes de que la ficha se
          actualice. Enviar una consulta no confirma disponibilidad, ni precio
          final, ni la aceptación de una oferta.
        </p>
        <p>
          Antes de comprar, verifica por tu cuenta la identidad de quien vende,
          la titularidad, los antecedentes, los documentos, el kilometraje y el
          estado mecánico, y pide una inspección independiente si quieres. Esta
          recomendación no limita ni sustituye los derechos que la ley te
          reconozca frente a quien efectivamente te venda el vehículo.
        </p>
        <p>
          Los vehículos usados se ofrecen en el estado en que se encuentran, lo
          que no excluye el deber de informar sus condiciones de forma veraz,
          suficiente y comprensible, como exige el artículo 23 de la Ley 1480 de
          2011.
        </p>
      </LegalSection>

      <LegalSection
        number="04"
        title="Retracto y reversión del pago: dos figuras distintas"
      >
        <p>
          Conviene no confundirlas, porque dependen de cosas diferentes y
          decirlo mal te perjudicaría.
        </p>
        <p>
          <strong className="text-ink">La reversión del pago</strong> del
          artículo 51 de la Ley 1480 de 2011 opera cuando la venta se hizo por
          un mecanismo de comercio electrónico y el pago se realizó con tarjeta
          u otro instrumento de pago electrónico, y obliga a los
          participantes del proceso de pago. Este sitio no ofrece ningún
          instrumento de pago ni participa en ningún proceso de pago, así que no
          hay aquí un pago que revertir. Si pagaste algo por otro medio
          —electrónico o no— y ese medio está cubierto por esa norma, tus
          derechos frente a quien recibió el pago y frente a los participantes
          de ese proceso no dependen de lo que diga esta página.
        </p>
        <p>
          <strong className="text-ink">El derecho de retracto</strong> del
          artículo 47 de la misma ley es otra cosa: no exige que haya habido un
          pago electrónico, sino que el contrato se haya celebrado mediante
          financiación del productor o proveedor, venta de tiempos compartidos,
          o métodos no tradicionales o a distancia. En este sitio{" "}
          <strong className="text-ink">
            no se celebra ninguna compraventa
          </strong>
          : no hay oferta que se pueda aceptar aquí, enviar un formulario no
          perfecciona ningún negocio y las visitas se coordinan con cita previa,
          con contacto directo con el vehículo. Por eso no hay un contrato
          formado en el sitio del que retractarse.
        </p>
        <p>
          Si una compraventa concreta se formaliza después y queda o no cubierta
          por el artículo 47 es algo que depende de cómo se celebre esa venta y
          de quién sea el vendedor, no de este sitio. Esta página no pretende
          resolverlo ni recortar ningún derecho: si crees que te corresponde,
          puedes ejercerlo frente a quien te vendió y acudir a la{" "}
          {CONSUMER_AUTHORITY.name}.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Consultas y visitas">
        <p>
          Cuando envías un formulario, tu solicitud queda registrada y nosotros
          la revisamos. Eso es todo lo que ocurre: no se celebra ningún
          contrato, no se aparta ningún vehículo y no queda confirmada ninguna
          cita. Una visita se confirma por un canal de atención, y se hace con
          cita previa.
        </p>
        <p>
          Para enviar un formulario pedimos tu nombre y al menos una forma de
          responderte, y tu autorización expresa para tratar esos datos con esa
          finalidad. Cómo los tratamos está en la{" "}
          <a href="/privacidad">Política de Tratamiento de Datos Personales</a>.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Si quieres vender tu vehículo con MILLE">
        <p>
          El sitio invita a los propietarios a escribirnos. Enviarnos los datos
          de un vehículo no garantiza que lo evaluemos, lo aceptemos ni lo
          publiquemos, y no crea ninguna obligación de compra por parte de
          MILLE.
        </p>
        <p>
          Al enviarnos información o fotografías de un vehículo declaras que
          estás autorizado para hacerlo, que lo que nos cuentas es cierto y que
          tienes los derechos necesarios sobre las imágenes que compartes. Nada
          de eso nos concede una licencia de publicación: el alcance de lo que
          podemos publicar y por cuánto tiempo se acuerda expresamente, y
          registramos de dónde salió cada fotografía precisamente para poder
          responder por ella.
        </p>
      </LegalSection>

      <LegalSection number="07" title="Uso del sitio y propiedad intelectual">
        <p>
          Puedes navegar el sitio, consultarlo y compartir sus enlaces para
          fines personales y lícitos.
        </p>
        <p>No puedes:</p>
        <ul>
          <li>
            interferir con el servicio, sobrecargarlo o intentar interrumpirlo;
          </li>
          <li>
            automatizar envíos de formularios ni esquivar los controles
            antispam;
          </li>
          <li>
            intentar acceder al panel de administración o a datos que no son
            tuyos;
          </li>
          <li>
            extraer contenido de forma masiva o automatizada para reutilizarlo;
          </li>
          <li>
            usar el contenido del sitio para engañar a alguien, suplantar a
            MILLE o vulnerar derechos de terceros.
          </li>
        </ul>
        <p>
          Los textos, el diseño, el nombre y los signos distintivos del sitio
          pertenecen a MILLE o se usan con la autorización correspondiente. Las
          fotografías pertenecen a sus autores o titulares y se usan conforme a
          la licencia o autorización que tengamos registrada para cada una. Las
          marcas de los vehículos identifican a sus respectivos titulares y su
          mención no implica vínculo, patrocinio ni representación. No reutilices
          imágenes del sitio sin verificar sus derechos.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Disponibilidad, enlaces y responsabilidad">
        <p>
          Procuramos mantener el sitio disponible y la información útil y
          actualizada, pero no garantizamos que el servicio esté libre de
          interrupciones ni que cada ficha esté vigente en todo momento.
        </p>
        <p>
          El sitio enlaza servicios externos —WhatsApp, Instagram y la página de
          la {CONSUMER_AUTHORITY.name}—. Su funcionamiento, su disponibilidad y
          sus políticas son responsabilidad de sus operadores, no nuestra.
        </p>
        <p>
          En la medida en que la ley lo permita, MILLE no responde por los daños
          que se deriven de una decisión tomada únicamente a partir de
          información desactualizada de una ficha sin haberla confirmado con
          nosotros, ni por el uso que terceros hagan de sus propios servicios.
        </p>
        <p>
          <strong className="text-ink">
            Lo que esta cláusula no hace, y conviene que quede claro:
          </strong>{" "}
          no excluye ni limita la responsabilidad por dolo o culpa grave, ni los
          derechos irrenunciables que la ley colombiana reconoce al consumidor,
          ni la responsabilidad por información engañosa. El artículo 4 de la Ley
          1480 de 2011 hace ineficaz cualquier estipulación que contravenga sus
          normas, así que una frase que pretendiera eximirnos de todo no tendría
          efecto y no la escribimos.
        </p>
      </LegalSection>

      <LegalSection number="09" title="Cambios, ley aplicable y contacto">
        <p>
          Estos términos pueden cambiar. La versión y la fecha vigentes están al
          principio de esta página; la versión actual es la{" "}
          {LEGAL_VERSIONS.terms}, en vigencia desde el{" "}
          {formatLegalVersion(LEGAL_VERSIONS.terms)}. Al publicarse una versión
          nueva, se aplica desde entonces al uso que hagas del sitio.
        </p>
        <p>
          Se aplica la ley colombiana, en particular la Ley 1480 de 2011 y la Ley
          1581 de 2012. Los jueces y autoridades competentes se determinan
          conforme a las reglas legales aplicables; nada aquí te obliga a
          renunciar al juez de tu domicilio ni te impide acudir a la{" "}
          <a
            href={CONSUMER_AUTHORITY.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {CONSUMER_AUTHORITY.name}
          </a>
          .
        </p>
        <p>
          Para cualquier asunto sobre el sitio: el{" "}
          <a href="/contacto">formulario de contacto</a>, el correo{" "}
          <a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a>
          {site.phone && whatsapp ? (
            <>
              {" "}
              o el WhatsApp{" "}
              <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                {site.phone.display}
              </a>
            </>
          ) : null}
          . Si se trata de tus datos personales, el procedimiento y los plazos
          están en la{" "}
          <a href="/privacidad">Política de Tratamiento de Datos Personales</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
