import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";
import {
  LEGAL_CONTACT,
  LEGAL_RESPONSIBLES,
  LEGAL_VERSIONS,
  formatLegalVersion,
  responsibleIdentified,
} from "@/lib/legal";
import { DATA_PROCESSING_CONSENT } from "@/lib/consent";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { defaultOgImages } from "@/server/site-media/og";

/**
 * La Política de Tratamiento de Datos Personales.
 *
 * Describe el tratamiento REAL y nada más. Cada categoría de datos que
 * aparece aquí existe en una tabla o en una cabecera concreta, y lo que el
 * proyecto NO hace —analítica, píxeles, mercadeo, pagos, perfilado— se dice
 * en voz alta en vez de callarse: una política que enumera herramientas que
 * no existen es tan falsa como una que esconde las que sí.
 *
 * El contenido mínimo sale del art. 13 del Decreto 1377 de 2013, compilado en
 * el Decreto 1074 de 2015: identificación del Responsable, tratamiento y
 * finalidad, derechos del Titular, área que atiende las solicitudes,
 * procedimiento para ejercerlas, y fecha de entrada en vigencia junto con el
 * período de vigencia de la base.
 *
 * La identificación del Responsable NO está escrita aquí: se lee de
 * `LEGAL_RESPONSIBLES`, que hoy está vacío. Mientras lo esté, la sección 01
 * lo dice. Es el mismo patrón que `site.phone` y `site.email` siguieron
 * mientras no existían, y por el mismo motivo: el sitio no publica un dato
 * que nadie ha confirmado.
 */
const TITLE = "Política de Tratamiento de Datos Personales";
const DESCRIPTION =
  "Qué datos personales trata MILLE Motor Culture, con qué finalidad, por cuánto tiempo y cómo ejercer tus derechos como titular en Colombia.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: canonical("/privacidad"),
    ...socialMetadata({
      images: await defaultOgImages(),
      title: `${TITLE} | ${site.name}`,
      description: DESCRIPTION,
      path: "/privacidad",
    }),
  };
}

export default function PrivacyPage() {
  const whatsapp = generalWhatsappUrl();
  const identified = responsibleIdentified();

  /** El canal electrónico, escrito igual en todas las secciones. */
  const mailLink = (
    <a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a>
  );

  return (
    <LegalDocument title={TITLE} version={LEGAL_VERSIONS.privacy}>
      <LegalSection number="01" title="Quién responde por tus datos">
        <p>
          <strong className="text-ink">MILLE Motor Culture</strong> es una marca
          dedicada a la cultura automotriz que opera el sitio{" "}
          <a href={site.url}>millemotorculture.com</a> desde{" "}
          {LEGAL_CONTACT.domicile}. No es una sociedad constituida: la operan
          personas naturales en asocio, figura que el artículo 3, literal e), de
          la Ley 1581 de 2012 prevé expresamente al definir al Responsable del
          Tratamiento como la persona natural o jurídica que, «por sí misma o en
          asocio con otros», decide sobre la base de datos o su tratamiento.
        </p>

        {identified ? (
          <ul>
            {LEGAL_RESPONSIBLES.map((responsible) => (
              <li key={responsible.identification}>
                <strong className="text-ink">{responsible.legalName}</strong> —{" "}
                {responsible.identification}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            <strong className="text-ink">
              Identificación pendiente de publicación.
            </strong>{" "}
            El artículo 12, literal d), de la Ley 1581 de 2012 y el artículo 13,
            numeral 1, del Decreto 1377 de 2013 exigen informar el nombre, el
            domicilio, la dirección, el correo y el teléfono del Responsable.
            Los canales de contacto de esta política son reales y están
            operativos, y el domicilio es {LEGAL_CONTACT.domicile}; lo que no
            podemos publicar todavía es el nombre legal completo de las personas
            responsables ni una dirección física de notificaciones, porque no
            hay ninguna confirmada para el proyecto. No las deducimos de un
            nombre abreviado ni publicamos la dirección de residencia de nadie
            como si fuera la de una marca. Esta política se actualizará con esa
            identificación, con una versión nueva, en cuanto esté confirmada.
            Mientras tanto, nada de lo que sigue deja de aplicarse: los derechos
            que se describen aquí se pueden ejercer hoy por los canales de la
            sección 07.
          </p>
        )}

        <p>
          Contacto para asuntos de datos personales: {mailLink}
          {site.phone && whatsapp ? (
            <>
              {" "}
              y WhatsApp{" "}
              <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                {site.phone.display}
              </a>
            </>
          ) : null}
          . Ese correo es hoy el canal general de MILLE y, a la vez, el canal
          electrónico habilitado para consultas y reclamos de protección de
          datos; si más adelante existe un buzón especializado, se anunciará
          aquí.
        </p>
      </LegalSection>

      <LegalSection number="02" title="Qué datos tratamos y de dónde salen">
        <p>
          Todo lo que sigue existe de verdad en el sistema. No hay más
          categorías que estas.
        </p>
        <ul>
          <li>
            <strong className="text-ink">
              Datos de contacto de una consulta.
            </strong>{" "}
            Nombre y, como mínimo, un canal de respuesta: teléfono o correo. El
            otro queda opcional. También el mensaje —si lo escribes—, el
            vehículo por el que preguntas y la página desde la que enviaste el
            formulario. Los entregas tú, en el formulario de contacto o en el de
            una ficha de vehículo.
          </li>
          <li>
            <strong className="text-ink">Prueba de tu autorización.</strong> La
            fecha y hora que genera nuestro servidor, el origen del formulario,
            la versión de esta política, el identificador y el texto exacto de
            la autorización que marcaste, una huella criptográfica de ese texto,
            la dirección IP desde la que se envió y el agente de tu navegador.
            La IP y el agente los lee el servidor de las cabeceras de la
            petición; el formulario no tiene ningún campo de IP ni de hora,
            porque un dato que envía el navegador no probaría nada. Esto existe
            para poder demostrar <em>qué autorizaste y cuándo</em>, que es lo
            que exigen el artículo 9 y el artículo 17, literal b), de la Ley 1581
            de 2012.
          </li>
          <li>
            <strong className="text-ink">
              Solicitudes sobre tus propios datos.
            </strong>{" "}
            Si escribes para ejercer un derecho, registramos tu nombre, el canal
            por el que llegaste, al menos una forma de responderte, qué pediste,
            si acreditaste tu identidad, el estado del trámite, nuestra
            respuesta y la fecha de cierre. Sin esto no podríamos demostrar que
            te atendimos.
          </li>
          <li>
            <strong className="text-ink">
              Clics en los enlaces de WhatsApp.
            </strong>{" "}
            De qué enlace salió, qué intención tenía, el vehículo relacionado si
            lo había y la página, sin parámetros. Sirve para saber si el botón se
            usa.{" "}
            <strong className="text-ink">
              No guarda IP, ni agente de navegador, ni ningún identificador de
              persona
            </strong>
            : es un conteo, no un seguimiento, y no se puede vincular contigo.
          </li>
          <li>
            <strong className="text-ink">
              Datos de quien ofrece un vehículo o una fotografía.
            </strong>{" "}
            Cuando un propietario, un dealer o un fotógrafo nos entrega
            material, registramos de dónde salió: la fuente, el nombre de quien
            lo entregó, el autor de la fotografía, la licencia o autorización,
            quién la dio y dónde está la prueba. Es trazabilidad de derechos:
            nos permite responder por qué podemos usar una imagen. No se muestra
            en el sitio público.
          </li>
          <li>
            <strong className="text-ink">Acceso del equipo interno.</strong>{" "}
            Correo y nombre de las cuentas autorizadas, su último acceso y un
            registro de las acciones administrativas relevantes —quién cambió
            qué y cuándo—. La contraseña nunca está en nuestra base de datos: la
            gestiona Supabase Auth.
          </li>
          <li>
            <strong className="text-ink">Control antispam.</strong> La IP de la
            petición se usa como clave en la memoria del servidor para limitar
            envíos repetidos en una ventana de diez minutos. No se escribe en la
            base de datos y desaparece con la memoria temporal de la instancia.
          </li>
        </ul>
        <p>
          <strong className="text-ink">
            No pedimos ni queremos datos sensibles
          </strong>{" "}
          —salud, origen étnico, convicciones, datos biométricos, vida sexual,
          orientación política— y ningún formulario tiene un campo para ellos.
          Tampoco tratamos deliberadamente datos de niñas, niños o adolescentes.
          Responder cualquier pregunta sobre esas categorías es facultativo, y
          lo mejor es simplemente no escribirlas en el campo de mensaje. Si nos
          llegan por error, se eliminan.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Para qué los usamos">
        <p>
          Cada finalidad es específica, y ninguna sirve de comodín para otra
          cosa:
        </p>
        <ul>
          <li>
            Recibir, revisar y responder la consulta que tú inicias; identificar
            el vehículo por el que preguntas; y coordinar una visita cuando la
            pides.
          </li>
          <li>
            Conservar la prueba de tu autorización, para poder acreditarla ante
            ti o ante la autoridad.
          </li>
          <li>Atender, tramitar y responder las solicitudes sobre tus datos.</li>
          <li>
            Saber qué páginas y fichas generan interés, con conteos que no se
            vinculan a ninguna persona.
          </li>
          <li>
            Acreditar que podemos usar el material fotográfico que publicamos.
          </li>
          <li>
            Autenticar al equipo interno y dejar constancia de las acciones
            administrativas.
          </li>
          <li>Frenar el envío automatizado y abusivo de formularios.</li>
        </ul>
        <p>
          <strong className="text-ink">
            No hacemos perfilado, no hacemos publicidad, no vendemos ni
            alquilamos datos
          </strong>{" "}
          y no los cedemos a terceros para sus propias finalidades. Tampoco hay
          decisiones automatizadas sobre nada que te afecte.
        </p>
      </LegalSection>

      <LegalSection number="04" title="Tu autorización, y cuándo no hace falta">
        <p>
          Antes de enviar un formulario público tienes que marcar una casilla
          que <strong className="text-ink">no viene preseleccionada</strong> y
          cuyo texto es exactamente este:
        </p>
        <p>
          <em>«{DATA_PROCESSING_CONSENT.text}»</em>
        </p>
        <p>
          Esa casilla es una autorización de tratamiento, no la aceptación de un
          documento: por eso enumera las finalidades en vez de remitirte a
          leerlas. Va <strong className="text-ink">separada</strong> de los{" "}
          <a href="/terminos">Términos y Condiciones</a>, que no se te piden
          para enviar una consulta porque enviarla no celebra ningún contrato, y
          separada de cualquier comunicación comercial. El silencio nunca
          equivale a autorizar: el artículo 7 del Decreto 1377 de 2013 lo dice
          expresamente. Guardamos el texto literal que viste, su versión y su
          huella, de modo que después se puede comprobar carácter por carácter
          qué autorizaste.
        </p>
        <p>
          Si no autorizas, el formulario no se envía. Puedes escribirnos por
          WhatsApp o al correo de la sección 01, y en ese caso el tratamiento se
          limita a responderte lo que preguntaste.
        </p>
        <p>
          Hay casos en que la ley no exige autorización —el artículo 10 de la
          Ley 1581 de 2012 los enumera: requerimientos de autoridad en ejercicio
          de sus funciones legales u orden judicial, datos de naturaleza
          pública, urgencia médica, fines históricos, estadísticos o
          científicos, y registro civil—. Si alguno llegara a aplicarse, seguimos
          obligados por el resto de la ley.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Quién más los trata, y dónde">
        <p>
          Hay tratamiento fuera de Colombia y lo decimos sin rodeos. Las figuras
          del artículo 3 del Decreto 1377 de 2013 no son intercambiables: hay{" "}
          <em>transmisión</em> cuando un encargado trata los datos por cuenta
          del responsable, y <em>transferencia</em> cuando se comunican a otro
          responsable que decide sus propios fines. No todos los proveedores
          encajan en la misma casilla, así que no los metemos todos en una:
        </p>
        <ul>
          <li>
            <strong className="text-ink">Supabase</strong> — base de datos,
            autenticación del panel y almacenamiento de las fotografías. Trata
            los datos por cuenta de MILLE y conforme a nuestra configuración, lo
            que corresponde a un <em>encargado</em> y a una transmisión
            internacional. La base de datos de esta aplicación está alojada en
            la región de Amazon Web Services <em>us-east-1</em> (Norte de
            Virginia, Estados Unidos); las regiones aplicables a autenticación y
            almacenamiento deben confirmarse por separado.
          </li>
          <li>
            <strong className="text-ink">Vercel</strong> — alojamiento y entrega
            del sitio. Procesa las peticiones por cuenta de MILLE —misma figura
            de encargado— y de sus cabeceras lee el servidor la IP que queda en
            la prueba de autorización.
          </li>
          <li>
            <strong className="text-ink">Google</strong> — el correo oficial de
            MILLE es una cuenta de Gmail, así que lo que escribas a ese buzón se
            trata en la infraestructura de Google, bajo los términos y la
            política de privacidad de Google aplicables a ese servicio. Siendo
            una cuenta de uso general y no un servicio corporativo contratado,{" "}
            <strong className="text-ink">
              no afirmamos que Google actúe como encargado por cuenta de MILLE
            </strong>
            : Google determina aspectos propios de la operación de su servicio.
            Lo que sí es nuestro, y de lo que respondemos, es el contenido de
            los mensajes que conservamos y lo que hacemos con ellos.
          </li>
          <li>
            <strong className="text-ink">Meta (WhatsApp)</strong> — la línea de
            atención es WhatsApp. Meta <em>no</em> trata esos datos por cuenta
            de MILLE: opera su propio servicio con sus propias finalidades y
            políticas, así que respecto de ellas actúa por su cuenta y no bajo
            nuestras instrucciones. MILLE responde por la conversación que
            mantiene contigo y por lo que registre de ella.
          </li>
        </ul>
        <p>
          Dos precisiones honestas. La primera: que un servidor esté en Estados
          Unidos describe dónde ocurre el tratamiento, no por sí solo su
          calificación jurídica, que depende del rol real del proveedor y del
          contrato aplicable. La segunda: el artículo 24, numeral 2, del Decreto
          1377 de 2013 exime de informar y de pedir autorización aparte para las
          transmisiones internacionales{" "}
          <em>cuando existe el contrato de su artículo 25</em>. Esta política no
          se apoya en esa exención: te informa aquí quiénes son los proveedores
          y qué hace cada uno, que es más de lo que la exención exigiría.
        </p>
        <p>
          Al tocar un enlace a WhatsApp o Instagram, tu navegador abre ese
          servicio y lo que compartas allí se rige por las políticas de su
          operador. El enlace <strong className="text-ink">no</strong> envía
          automáticamente el contenido de ninguna consulta. Fuera de esto, no
          entregamos tus datos a nadie, salvo a ti —o a tus causahabientes o
          representantes debidamente acreditados— y a las autoridades que los
          soliciten en ejercicio de sus funciones legales o por orden judicial,
          como prevé el artículo 13 de la Ley 1581 de 2012.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Cuánto tiempo los guardamos">
        <p>
          El artículo 11 del Decreto 1377 de 2013 permite conservar los datos
          «durante el tiempo que sea razonable y necesario» para la finalidad
          que los justificó, y obliga a suprimirlos cuando esa finalidad se
          cumple. Ninguna norma colombiana fija un número de meses para lo que
          trata este sitio, así que los plazos que siguen son decisiones{" "}
          <strong className="text-ink">internas de MILLE</strong>, y los
          distinguimos de los deberes legales a propósito:
        </p>
        <ul>
          <li>
            <strong className="text-ink">
              Consultas y datos de contacto — 24 meses
            </strong>{" "}
            desde que la conversación se cierra, y antes si nos lo pides.{" "}
            <em>Plazo interno.</em>
          </li>
          <li>
            <strong className="text-ink">
              Prueba de la autorización — 5 años
            </strong>{" "}
            desde el evento.{" "}
            <em>
              Plazo interno, pero con un deber legal detrás: el artículo 17,
              literal b), de la Ley 1581 de 2012 obliga a conservar copia de la
              autorización, y no fija cuánto. Cinco años cubren con holgura el
              tiempo en que alguien podría reclamarnos o la autoridad
              preguntarnos. Por eso una prueba de autorización no se borra
              cuando se borra la consulta: se desvincula de ti y queda
              acreditando que hubo una autorización de esa versión, a esa hora y
              desde ese formulario, sin conservar a quién se refería.
            </em>
          </li>
          <li>
            <strong className="text-ink">
              Trámites sobre tus datos — 5 años
            </strong>{" "}
            desde el cierre, para poder demostrar que los atendimos.{" "}
            <em>Plazo interno.</em>
          </li>
          <li>
            <strong className="text-ink">Conteos de WhatsApp — 24 meses.</strong>{" "}
            <em>Plazo interno.</em> No contienen datos de contacto.
          </li>
          <li>
            <strong className="text-ink">
              Registro de acciones del equipo — 5 años.
            </strong>{" "}
            <em>Plazo interno.</em>
          </li>
          <li>
            <strong className="text-ink">
              Trazabilidad de derechos de fotografías
            </strong>{" "}
            — mientras la fotografía se use y mientras duren las obligaciones de
            su licencia o autorización. <em>Plazo interno.</em>
          </li>
          <li>
            <strong className="text-ink">
              IP del control antispam — 10 minutos
            </strong>
            , en memoria del servidor y sin pasar por la base de datos.
          </li>
        </ul>
        <p>
          La revisión y supresión se hacen de forma controlada, no con un
          proceso automático que borre solo: preferimos que la eliminación de
          datos de personas sea una decisión verificada antes que un trabajo
          desatendido que una madrugada borre lo que no debía.
        </p>
        <p>
          <strong className="text-ink">
            Período de vigencia de la base de datos:
          </strong>{" "}
          indefinido mientras MILLE opere y mantenga las finalidades descritas
          aquí; los datos de cada persona, en cambio, no son indefinidos y se
          conservan solo los plazos de arriba. Si MILLE dejara de operar, las
          bases se suprimen salvo lo que haya que conservar por un deber legal.
        </p>
      </LegalSection>

      <LegalSection number="07" title="Tus derechos y cómo ejercerlos">
        <p>
          Como titular, el artículo 8 de la Ley 1581 de 2012 te reconoce el
          derecho a <strong className="text-ink">conocer</strong>,{" "}
          <strong className="text-ink">actualizar</strong> y{" "}
          <strong className="text-ink">rectificar</strong> tus datos;{" "}
          <strong className="text-ink">
            solicitar prueba de la autorización
          </strong>{" "}
          que otorgaste; ser informado, previa solicitud, del{" "}
          <strong className="text-ink">uso</strong> que les hemos dado;{" "}
          <strong className="text-ink">acceder gratuitamente</strong> a ellos;{" "}
          <strong className="text-ink">revocar la autorización</strong> y{" "}
          <strong className="text-ink">solicitar su supresión</strong> cuando
          proceda; y presentar quejas ante la Superintendencia de Industria y
          Comercio.
        </p>
        <p>
          Puedes consultar tus datos gratis al menos una vez al mes y cada vez
          que esta política cambie de forma sustancial, como señala el artículo
          21 del Decreto 1377 de 2013.
        </p>
        <p>
          <strong className="text-ink">Cómo pedirlo.</strong> Escribe a{" "}
          {mailLink}
          {site.phone && whatsapp ? (
            <>
              {" "}
              o al WhatsApp{" "}
              <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                {site.phone.display}
              </a>
            </>
          ) : null}
          , indica «datos personales», dinos qué derecho quieres ejercer y
          danos algo con lo que podamos encontrar tu solicitud —el correo o el
          teléfono que dejaste—. De las solicitudes se encarga directamente el
          equipo de MILLE, que es quien atiende ese buzón; no necesitas enviar
          más información que la necesaria para ubicarte.
        </p>
        <p>
          <strong className="text-ink">Acreditación.</strong> Antes de
          entregarte datos o borrarlos te pediremos verificar que eres tú, o que
          representas al titular, como exige el artículo 20 del Decreto 1377 de
          2013. No es burocracia: atender una supresión sin comprobarlo sería
          borrarle los datos a alguien a petición de un tercero.
        </p>
        <p>
          <strong className="text-ink">Plazos.</strong> Las{" "}
          <em>consultas</em> se atienden en un máximo de diez (10) días hábiles;
          si no es posible, te informamos el motivo y la nueva fecha, que no
          pasará de cinco (5) días hábiles más (artículo 14 de la Ley 1581 de
          2012). Los <em>reclamos</em> —corrección, actualización, supresión,
          revocatoria, o el presunto incumplimiento de un deber— se atienden en
          quince (15) días hábiles, prorrogables como máximo ocho (8) días
          hábiles más (artículo 15). Si el reclamo llega incompleto, te lo
          pediremos dentro de los cinco (5) días siguientes.
        </p>
        <p>
          <strong className="text-ink">Límites, dichos con claridad.</strong>{" "}
          Revocar la autorización o pedir la supresión procede en los términos
          de la ley, y hay datos que no podemos borrar mientras exista un deber
          legal de conservarlos o sean necesarios para atender una reclamación
          en curso. Cuando sea el caso, te diremos cuál es el motivo en vez de
          dejar la solicitud sin respuesta.
        </p>
        <p>
          <strong className="text-ink">Ante la autoridad.</strong> Puedes
          presentar queja ante la{" "}
          <a
            href="https://www.sic.gov.co/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Superintendencia de Industria y Comercio
          </a>
          . El artículo 16 de la Ley 1581 de 2012 pide agotar antes el trámite
          de consulta o reclamo ante nosotros.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Comunicaciones comerciales">
        <p>
          <strong className="text-ink">
            Hoy MILLE no envía comunicaciones comerciales ni publicitarias.
          </strong>{" "}
          No hay boletín, ni campañas, ni listas de difusión, ni mensajes
          automáticos. Si escribes preguntando por un carro, te respondemos esa
          pregunta: responder a tu propia solicitud no es publicidad, y el
          artículo 8 de la Ley 2300 de 2023 exceptúa expresamente el envío de
          «información solicitada por el consumidor».
        </p>
        <p>
          Haber preguntado por un vehículo{" "}
          <strong className="text-ink">no te suscribe a nada</strong>. Si algún
          día MILLE quiere enviar novedades, hará falta tu consentimiento
          aparte, voluntario y sin preseleccionar, negarlo no te impedirá enviar
          una consulta, y esos envíos tendrán que respetar los canales que
          autorices, los horarios del artículo 3 de la Ley 2300 de 2023 —lunes a
          viernes de 7:00 a. m. a 7:00 p. m. y sábados de 8:00 a. m. a 3:00
          p. m., sin domingos ni festivos—, su periodicidad y un mecanismo
          sencillo para darse de baja en cualquier momento.
        </p>
      </LegalSection>

      <LegalSection number="09" title="Seguridad">
        <p>
          Las solicitudes, las pruebas de autorización, las IP registradas y los
          trámites sobre datos{" "}
          <strong className="text-ink">no son públicos en ninguna parte</strong>
          : viven detrás de sesión autenticada y rol autorizado, y solo los ve
          el equipo de MILLE. La API de datos de la base está cerrada para
          clientes anónimos y autenticados a nivel de la propia base, de modo
          que no basta con conocer una URL. El servidor valida todo lo que
          recibe, limita el tamaño de lo que acepta y frena los envíos
          repetidos. Las pruebas de autorización, además, están protegidas
          contra modificación y borrado por una restricción de la propia base
          de datos, y no solo por el código de la aplicación: la aplicación no
          puede alterarlas ni queriendo.
        </p>
        <p>
          Estas medidas reducen el riesgo. Ningún sistema conectado a internet
          puede prometer seguridad absoluta, y no se lo vamos a prometer. Si
          detectamos un incidente que afecte tus datos, actuaremos conforme al
          artículo 17, literal n), de la Ley 1581 de 2012, que obliga a informar
          a la autoridad de protección de datos.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Cookies, menores y cambios">
        <p>
          El sitio público no usa cookies de analítica ni de publicidad, ni
          almacenamiento local de seguimiento. El detalle está en la{" "}
          <a href="/cookies">Política de Cookies</a>.
        </p>
        <p>
          El sitio no está dirigido a niñas, niños o adolescentes y no solicita
          deliberadamente sus datos. Si llegan por error, escríbenos para
          revisarlo y aplicar las reglas del artículo 7 de la Ley 1581 de 2012 y
          del artículo 12 del Decreto 1377 de 2013, con prevalencia de sus
          derechos.
        </p>
        <p>
          Esta política puede cambiar. La versión y la fecha vigentes están al
          principio de la página, y cada versión queda vinculada a las
          autorizaciones que se otorgaron mientras estaba en vigor: una versión
          ya publicada no se reescribe. Un cambio sustancial —por ejemplo en la
          identificación del Responsable o en las finalidades— se comunicará de
          forma oportuna antes de aplicarlo, como pide el artículo 13 del
          Decreto 1377 de 2013, y si cambia la finalidad del tratamiento
          pediremos una autorización nueva antes de tratar los datos para ella.
        </p>
        <p>
          Esta política se rige por la Constitución Política de Colombia
          (artículo 15), la Ley 1581 de 2012, el Decreto 1377 de 2013 compilado
          en el Decreto 1074 de 2015 y las demás normas que las modifiquen,
          adicionen o reglamenten. Entra en vigencia el{" "}
          {formatLegalVersion(LEGAL_VERSIONS.privacy)}.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
