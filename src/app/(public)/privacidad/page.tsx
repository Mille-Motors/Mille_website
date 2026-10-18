import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";
import { generalWhatsappUrl } from "@/lib/whatsapp";

const TITLE = "Política de tratamiento de datos";
const DESCRIPTION =
  "Cómo MILLE recoge, usa y protege tus datos personales cuando nos escribes por el sitio o por WhatsApp, y cómo ejercer tus derechos.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonical("/privacidad"),
  ...socialMetadata({
    title: `${TITLE} | ${site.name}`,
    description: DESCRIPTION,
    path: "/privacidad",
  }),
};

/** Última vez que se revisó el texto. Cambia cuando cambie lo que se hace con los datos. */
const UPDATED = "17 de octubre de 2026";

const linkClass =
  "text-burgundy underline decoration-burgundy/40 underline-offset-4 transition-colors hover:decoration-burgundy";

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-stone py-9 lg:py-11">
      <div className="grid gap-4 lg:grid-cols-[4rem_minmax(0,1fr)] lg:gap-8">
        <span className="font-display text-base text-burgundy tabular">
          {number}
        </span>
        <div>
          <h2 className="font-display text-[1.625rem] leading-tight text-ink">
            {title}
          </h2>
          <div className="mt-4 space-y-4 font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span
            aria-hidden
            className="mt-[0.85em] h-px w-4 shrink-0 bg-burgundy/60"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  const whatsapp = generalWhatsappUrl();

  return (
    <>
      <section className="border-b border-stone bg-cream">
        <Container width="narrow">
          <div className="py-14 lg:py-20">
            <Eyebrow>{site.tagline}</Eyebrow>
            <h1 className="mt-7 font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] text-ink">
              Política de tratamiento
              <br />
              de datos personales
            </h1>
            <Rule className="mt-8" />
            <p className="mt-7 font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
              Cuando nos escribes nos das tus datos. Aquí te contamos cuáles
              son, para qué los usamos y cómo puedes pedirnos que los
              corrijamos o los borremos. Está escrito conforme a la Ley 1581
              de 2012 y sus decretos reglamentarios.
            </p>
            <p className="label-caps mt-6 text-ink-muted">
              Última actualización · {UPDATED}
            </p>
          </div>
        </Container>
      </section>

      <Container width="narrow">
        <div className="pb-16 lg:pb-24">
          <Section number="01" title="Quién es el responsable">
            <p>
              MILLE — House of Motor Culture es un proyecto de David
              Hernández y Nicolás Henao, con sede en {site.city},{" "}
              {site.country}. Somos los responsables del tratamiento de los
              datos personales que recogemos en este sitio y por nuestra
              línea de WhatsApp.
            </p>
            <p>
              Puedes escribirnos para cualquier asunto sobre tus datos por{" "}
              {site.phone && whatsapp ? (
                <>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={linkClass}
                  >
                    WhatsApp ({site.phone.display})
                  </a>{" "}
                  — {site.phone.hours.label.toLowerCase()} —
                </>
              ) : (
                "WhatsApp"
              )}{" "}
              o desde el{" "}
              <Link href="/contacto" className={linkClass}>
                formulario de contacto
              </Link>
              .
            </p>
          </Section>

          <Section number="02" title="Qué datos recogemos y cómo">
            <Bullets
              items={[
                <>
                  <strong className="font-medium text-ink">
                    Formularios del sitio
                  </strong>{" "}
                  (contacto y solicitudes de información o de cita): tu
                  nombre, teléfono, correo, el mensaje que escribas y, si
                  aplica, el vehículo por el que preguntas.
                </>,
                <>
                  <strong className="font-medium text-ink">WhatsApp</strong>:
                  tu número de teléfono, el nombre de tu perfil y lo que nos
                  escribas. WhatsApp es un servicio de Meta Platforms, que
                  trata esos datos según sus propias condiciones.
                </>,
                <>
                  <strong className="font-medium text-ink">
                    Clics al botón de WhatsApp
                  </strong>
                  : contamos cuántas veces se toca, desde qué página y por qué
                  vehículo. Ese conteo no guarda tu IP, tu dispositivo ni
                  nada que te identifique.
                </>,
              ]}
            />
            <p>
              No usamos cookies de publicidad ni herramientas de analítica de
              terceros en el sitio público. No pedimos datos sensibles ni
              datos de menores de edad.
            </p>
          </Section>

          <Section number="03" title="Para qué los usamos">
            <Bullets
              items={[
                "Responder tu consulta y escribirte de vuelta.",
                "Coordinar una visita o una cita para ver un vehículo.",
                "Contarte de vehículos que encajen con lo que buscas.",
                "Hablar contigo sobre el vehículo que quieres presentar con nosotros.",
                "Entender si el sitio y la atención funcionan, con cifras agregadas que no te identifican.",
              ]}
            />
            <p>No vendemos ni cedemos tus datos a terceros.</p>
          </Section>

          <Section number="04" title="Con quién los compartimos">
            <p>
              Solo con los proveedores que hacen posible el sitio y la
              atención, bajo sus propias condiciones: el alojamiento y la base
              de datos (Vercel y Supabase) y WhatsApp (Meta). Algunos de ellos
              procesan información en servidores fuera de Colombia. Fuera de
              eso, solo compartiremos tus datos si una autoridad competente
              nos lo exige conforme a la ley.
            </p>
          </Section>

          <Section number="05" title="Tu autorización">
            <p>
              Al enviarnos un formulario o escribirnos por WhatsApp nos
              autorizas a tratar tus datos para las finalidades de esta
              política. Puedes revocar esa autorización o pedir que
              eliminemos tus datos cuando quieras, escribiéndonos por
              cualquiera de los canales de arriba.
            </p>
          </Section>

          <Section number="06" title="Tus derechos">
            <p>Como titular de tus datos, tienes derecho a:</p>
            <Bullets
              items={[
                "Conocer, actualizar y rectificar tus datos.",
                "Pedir prueba de la autorización que nos diste.",
                "Saber el uso que le hemos dado a tus datos.",
                "Revocar la autorización y pedir la supresión de tus datos.",
                "Acceder de forma gratuita a tus datos personales.",
                "Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.",
              ]}
            />
          </Section>

          <Section number="07" title="Cómo ejercer tus derechos">
            <p>
              Escríbenos por WhatsApp o por el formulario de contacto,
              indicando «datos personales» y qué quieres hacer: consultar,
              corregir, revocar o eliminar. Responderemos las consultas en un
              máximo de diez (10) días hábiles, prorrogables cinco (5) más, y
              los reclamos en un máximo de quince (15) días hábiles,
              prorrogables ocho (8) más, como establece la ley.
            </p>
          </Section>

          <Section number="08" title="Cuánto tiempo y con qué cuidado">
            <p>
              Conservamos tus datos mientras sean necesarios para atender tu
              solicitud y durante el tiempo que la ley exija, o hasta que nos
              pidas eliminarlos. El acceso a las solicitudes que recibimos
              está limitado al equipo de MILLE mediante inicio de sesión, y
              las conexiones a este sitio van cifradas.
            </p>
          </Section>

          <Section number="09" title="Cambios a esta política">
            <p>
              Si cambia lo que hacemos con tus datos, actualizaremos esta
              página y la fecha de arriba. Te recomendamos revisarla de vez en
              cuando.
            </p>
          </Section>
        </div>
      </Container>
    </>
  );
}
