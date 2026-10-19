import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";
import { LEGAL_VERSIONS } from "@/lib/legal";
import { defaultOgImages } from "@/server/site-media/og";

/**
 * La Política de Cookies.
 *
 * Describe lo que una auditoría del código encuentra, que es poco: una sola
 * llamada a `cookies()` en todo el proyecto —la del cliente de servidor de
 * Supabase, que solo corre en rutas de administración— y ni un uso de
 * `localStorage`, `sessionStorage` o `document.cookie`.
 *
 * Por eso NO hay banner. Un gestor de consentimiento para almacenamiento
 * estrictamente necesario pide un permiso que no hace falta, y acostumbra a la
 * gente a aceptar sin leer para quitárselo de encima. El día que exista una
 * tecnología opcional habrá banner, preferencias reabribles y bloqueo del
 * script antes de la decisión; hoy sería teatro.
 *
 * La versión NO sube en esta ronda: la redacción se reorganizó, pero ninguna
 * respuesta cambió —el sitio sigue usando solo lo necesario—, y subir la
 * versión sin cambio material haría creer que algo cambió.
 */
const TITLE = "Política de Cookies";
const DESCRIPTION =
  "Qué cookies y qué almacenamiento usa realmente el sitio de MILLE Motor Culture: solo lo estrictamente necesario, y por eso no hay banner.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: canonical("/cookies"),
    ...socialMetadata({
      images: await defaultOgImages(),
      title: `${TITLE} | ${site.name}`,
      description: DESCRIPTION,
      path: "/cookies",
    }),
  };
}

export default function CookiesPage() {
  return (
    <LegalDocument title={TITLE} version={LEGAL_VERSIONS.cookies}>
      <LegalSection number="01" title="Lo que el sitio público NO usa">
        <p>
          Esta lista sale de revisar el código, no de una plantilla. En el sitio
          público <strong className="text-ink">no hay</strong>:
        </p>
        <ul>
          <li>cookies de analítica ni de publicidad;</li>
          <li>
            Google Analytics, Google Tag Manager, Meta Pixel, TikTok Pixel,
            Hotjar, Clarity ni analítica de la plataforma de alojamiento;
          </li>
          <li>
            uso de <code>localStorage</code>, <code>sessionStorage</code> ni{" "}
            <code>document.cookie</code>;
          </li>
          <li>
            mapas, vídeos ni ningún contenido incrustado de un tercero —no hay
            iframes de YouTube, Maps ni Spotify—;
          </li>
          <li>
            proveedores externos de tipografías: las fuentes se sirven desde los
            archivos que genera el propio sitio, así que tu navegador no pide
            nada a un tercero para leerlo;
          </li>
          <li>huellas de navegador ni identificadores publicitarios.</li>
        </ul>
        <p>
          Puedes comprobarlo: abre las herramientas de desarrollo de tu
          navegador, mira las pestañas de red y de almacenamiento y navega el
          sitio.
        </p>
      </LegalSection>

      <LegalSection number="02" title="Lo que sí existe">
        <p>
          <strong className="text-ink">
            Cookies de sesión de Supabase Auth
          </strong>{" "}
          — estrictamente necesarias, primera parte, gestionadas por Supabase.
        </p>
        <ul>
          <li>
            <strong className="text-ink">Para qué:</strong> mantener la sesión
            del equipo de MILLE dentro del panel de administración y proteger
            esas rutas.
          </li>
          <li>
            <strong className="text-ink">Cuándo aparecen:</strong> solo al
            iniciar sesión en <code>/admin</code>. Si nunca entras ahí —y no
            puedes, salvo que seas del equipo—, tu navegador no recibe ninguna
            cookie de este sitio.
          </li>
          <li>
            <strong className="text-ink">Duración:</strong> la que fija la
            configuración de sesión de Supabase. El proyecto no define una
            propia, así que no vamos a escribir aquí un número que no
            controlamos.
          </li>
          <li>
            <strong className="text-ink">Cómo se quitan:</strong> cerrando
            sesión desde el panel, que borra la sesión y con ella las cookies.
          </li>
        </ul>
        <p>
          No requieren consentimiento: sin ellas el inicio de sesión no
          funciona, y es el propio usuario quien pide ese servicio al entrar.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Lo que medimos sin cookies">
        <p>
          Contamos los clics en los enlaces de WhatsApp con una petición al
          servidor que guarda de qué enlace salió, qué intención tenía, el
          vehículo relacionado si lo había y la página. No usa cookies, ni
          almacenamiento del navegador, ni identificadores:{" "}
          <strong className="text-ink">
            no guarda IP, ni agente de navegador, ni nada que te señale
          </strong>
          . Es un contador, y por eso no se puede vincular a ninguna persona.
        </p>
        <p>
          El control antispam de los formularios usa la IP de la petición como
          clave temporal en la memoria del servidor durante diez minutos. No es
          una cookie, no toca tu navegador y no se escribe en la base de datos.
        </p>
        <p>
          Cuando envías un formulario sí queda registrada la IP, dentro de la
          prueba de tu autorización, y eso está explicado en la{" "}
          <a href="/privacidad">
            Política de Tratamiento de Datos Personales
          </a>
          . Tampoco es una cookie: la lee el servidor de las cabeceras de esa
          petición concreta.
        </p>
      </LegalSection>

      <LegalSection number="04" title="Por qué no hay banner">
        <p>
          Porque no hay nada opcional que autorizar. Un banner existe para
          pedirte permiso antes de cargar tecnologías que no son necesarias, y
          aquí no se carga ninguna. Montar uno de todas formas pediría un
          permiso que no hace falta y empujaría a aceptar sin leer para
          quitárselo de encima, que es el hábito contrario al que la protección
          de datos busca.
        </p>
        <p>
          Si algún día el sitio incorpora analítica, publicidad o contenido
          incrustado de un tercero, entonces sí hará falta: un aviso con
          opciones equivalentes —aceptar, rechazar y configurar, sin casillas
          preseleccionadas y sin que rechazar cueste más clics que aceptar—, un
          sitio donde volver a cambiar la decisión, y el bloqueo real de esos
          scripts hasta que la decisión exista. Y esta política se actualizaría
          antes, con una versión nueva.
        </p>
        <p>
          Para cualquier duda sobre datos personales, el procedimiento y los
          plazos están en la{" "}
          <a href="/privacidad">Política de Tratamiento de Datos Personales</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
