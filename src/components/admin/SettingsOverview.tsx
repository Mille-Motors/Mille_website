import { AlertTriangle, Check, ChevronDown, ExternalLink } from "lucide-react";
import { Panel, Pill } from "@/components/admin/kit";
import { site } from "@/data/site";
import {
  CONSUMER_AUTHORITY,
  LEGAL_CONTACT,
  LEGAL_DOCUMENTS,
  LEGAL_PATHS,
  LEGAL_RESPONSIBLES,
  LEGAL_TITLES,
  LEGAL_VERSIONS,
  formatLegalVersion,
  legalIdentityGaps,
} from "@/lib/legal";
import { DATA_PROCESSING_CONSENT } from "@/lib/consent";

/**
 * El estado REAL de la configuración, en solo lectura.
 *
 * Está separado de la página por una razón práctica: la página arrastra el
 * marco del Admin, y ese marco importa el logotipo, que es un PNG. Fuera del
 * empaquetador de Next eso no se puede cargar, así que la pantalla entera
 * quedaba imposible de renderizar en una prueba. Lo que hay que poder
 * comprobar —que los canales son los reales, que las versiones son las
 * vigentes, que lo que falta se dice y que no se filtra ningún secreto— vive
 * aquí, sin dependencias de presentación.
 *
 * No es un formulario, y es deliberado. Los canales viven en
 * `src/data/site.ts` y las versiones legales en `src/lib/legal.ts`, donde un
 * cambio pasa por revisión y queda en el historial. Un formulario que
 * permitiera escribir aquí el correo de contacto o la versión de la política
 * convertiría un dato legal en algo que se puede teclear mal a las once de la
 * noche, y el sitio público lo mostraría como si fuera cierto. Lo que esta
 * pantalla sí hace —y no hacía nada— es decir qué falta.
 *
 * Tampoco se muestra ningún secreto: ni claves de Supabase, ni tokens, ni
 * cabeceras internas. Solo valores que ya son públicos en el propio sitio.
 *
 * Se lee de arriba abajo por importancia: primero lo que falta, luego lo que
 * está activo, y al final —plegado— el porqué legal de cada cosa. Las
 * explicaciones largas siguen ahí, completas; solo dejaron de ser lo primero
 * que se lee.
 */

/** Un bloque de la pantalla. */
function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {intro ? <p className="mt-0.5 text-[0.9375rem] text-ink-muted">{intro}</p> : null}
      <Panel className="mt-3 divide-y divide-stone px-5">{children}</Panel>
    </section>
  );
}

/** Una línea de un bloque: qué es, y a la derecha su valor. */
function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-[0.9375rem] font-medium text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-[0.9375rem] text-ink-soft">{children}</dd>
    </div>
  );
}

function ChannelLine({
  label,
  value,
  href,
  active,
  note,
}: {
  label: string;
  value: string;
  href?: string | null;
  active: boolean;
  note?: string;
}) {
  return (
    <Line label={label}>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Pill
          tone={active ? "success" : "neutral"}
          icon={active ? <Check aria-hidden className="size-3.5" strokeWidth={2} /> : undefined}
        >
          {active ? "Activo" : "Sin configurar"}
        </Pill>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 break-all text-burgundy underline underline-offset-2"
          >
            {value}
            <ExternalLink aria-hidden className="size-3.5 shrink-0" strokeWidth={1.6} />
          </a>
        ) : (
          <span className="break-all">{value}</span>
        )}
      </span>
      {note ? (
        <span className="mt-1 block text-[0.8125rem] text-ink-muted">{note}</span>
      ) : null}
    </Line>
  );
}

/** El porqué, plegado: está completo, pero no estorba a quien solo mira. */
function Why({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group py-3.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-[0.9375rem] font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          aria-hidden
          strokeWidth={1.6}
          className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-muted">
        {children}
      </div>
    </details>
  );
}

export function SettingsOverview() {
  const gaps = legalIdentityGaps();
  const whatsapp = site.phone;

  return (
    <div className="grid max-w-4xl gap-8">
      {/* Lo primero: lo que falta, o la tranquilidad de que no falta nada. */}
      {gaps.length > 0 ? (
        <section className="rounded-xl border border-status-sold/30 bg-status-sold/10 px-5 py-4">
          <p className="flex items-center gap-2 text-base font-semibold text-status-sold">
            <AlertTriangle aria-hidden className="size-5 shrink-0" strokeWidth={1.7} />
            Falta por confirmar antes de cerrar la política.
          </p>
          <ul className="mt-3 grid gap-1.5 pl-7">
            {gaps.map((gap) => (
              <li key={gap} className="list-disc text-[0.9375rem] text-ink-soft">
                {gap}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
            Lo exigen el art. 12, lit. d) de la Ley 1581 de 2012 y el art. 13,
            num. 1 del Decreto 1377 de 2013, compilado en el Decreto 1074 de
            2015. Hasta que estén confirmados, la Política de Tratamiento lo
            dice en su primera sección en vez de publicar una identificación
            deducida: un nombre legal completo no se infiere de un nombre
            abreviado, y la dirección de residencia de nadie se publica como
            dirección de una marca. Se rellenan en{" "}
            <code className="text-ink-soft">src/lib/legal.ts</code> y eso sube
            la versión de la política.
          </p>
        </section>
      ) : (
        <p className="flex items-center gap-2 text-[0.9375rem] font-medium text-status-available">
          <Check aria-hidden className="size-5 shrink-0" strokeWidth={2} />
          Identificación legal completa. No hay nada pendiente.
        </p>
      )}

      <Section
        title="Canales oficiales"
        intro="Lo que el sitio público muestra hoy."
      >
        <dl className="divide-y divide-stone">
          <ChannelLine
            label="Dominio oficial"
            value={site.url}
            href={site.url}
            active
            note="Autoridad canónica del sitio: de aquí salen canonical, Open Graph, robots, sitemap y JSON-LD."
          />
          <ChannelLine
            label="Correo oficial"
            value={LEGAL_CONTACT.email}
            href={`mailto:${LEGAL_CONTACT.email}`}
            active
            note="Canal general y, mientras no exista uno especializado, canal electrónico para consultas y reclamos de protección de datos."
          />
          <ChannelLine
            label="Instagram"
            value={site.instagram?.handle ?? "Sin configurar"}
            href={site.instagram?.url ?? null}
            active={Boolean(site.instagram)}
          />
          <ChannelLine
            label="WhatsApp"
            value={whatsapp?.display ?? "Sin configurar"}
            href={whatsapp ? `https://wa.me/${whatsapp.number}` : null}
            active={Boolean(whatsapp)}
            note={whatsapp ? `Atención: ${whatsapp.hours.label}.` : undefined}
          />
          <ChannelLine label="Domicilio" value={LEGAL_CONTACT.domicile} active />
          <ChannelLine
            label="Dirección de notificaciones"
            value={
              LEGAL_CONTACT.physicalAddress ?? "Pendiente de confirmar por MILLE"
            }
            active={Boolean(LEGAL_CONTACT.physicalAddress)}
            note="No se publica ninguna dirección mientras no exista una confirmada para el proyecto."
          />
        </dl>
        <p className="py-3.5 text-[0.8125rem] text-ink-muted">
          Un canal se cambia en{" "}
          <code className="text-ink-soft">src/data/site.ts</code>, no escribiéndolo
          aquí: así el cambio queda revisado y en el historial.
        </p>
      </Section>

      <Section
        title="Documentos legales"
        intro="La versión es la fecha. Los consentimientos ya registrados siguen apuntando a la versión que estaba vigente cuando se otorgaron."
      >
        <dl className="divide-y divide-stone">
          {LEGAL_DOCUMENTS.map((document) => (
            <Line key={document} label={LEGAL_TITLES[document]}>
              Versión <span className="tabular">{LEGAL_VERSIONS[document]}</span> ·{" "}
              {formatLegalVersion(LEGAL_VERSIONS[document])} ·{" "}
              <a
                href={LEGAL_PATHS[document]}
                target="_blank"
                rel="noreferrer"
                className="text-burgundy underline underline-offset-2"
              >
                ver página
              </a>
            </Line>
          ))}
          <Line label="Texto de autorización">
            <span className="tabular">{DATA_PROCESSING_CONSENT.id}</span>
            <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-muted">
              {DATA_PROCESSING_CONSENT.text}
            </span>
          </Line>
          <Line label="Autoridad del consumidor">
            <a
              href={CONSUMER_AUTHORITY.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-burgundy underline underline-offset-2"
            >
              {CONSUMER_AUTHORITY.name}
            </a>
            <span className="mt-1 block text-[0.8125rem] text-ink-muted">
              Enlazada desde el pie del sitio, como pide el art. 50, parágrafo, de
              la Ley 1480 de 2011.
            </span>
          </Line>
        </dl>
      </Section>

      <Section title="Responsable del Tratamiento">
        <div className="py-3.5 text-[0.9375rem]">
          {LEGAL_RESPONSIBLES.length > 0 ? (
            <ul className="grid gap-2">
              {LEGAL_RESPONSIBLES.map((responsible) => (
                <li key={responsible.identification} className="text-ink-soft">
                  {responsible.legalName} ·{" "}
                  <span className="tabular">{responsible.identification}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="leading-relaxed text-ink-muted">
              MILLE Motor Culture es una marca operada por personas naturales en
              asocio. La Ley 1581 de 2012 (art. 3, lit. e) admite esa figura
              expresamente, así que no hace falta constituir una sociedad para
              tener una política válida — pero sí identificar a quien responde.
            </p>
          )}
        </div>
      </Section>

      <Section title="Pagos y cookies">
        <Why summary="El sitio no procesa pagos">
          El sitio <strong className="text-ink">no procesa pagos</strong>: no hay
          checkout, ni reservas pagadas, ni anticipos, ni pasarela, ni tarjetas.
          Una negociación económica por un vehículo ocurre fuera del sitio. Por
          eso no hay política de reembolsos —no hay pago que reembolsar— ni
          reversión del pago del art. 51 de la Ley 1480 de 2011, que exige un
          pago hecho con instrumento electrónico en el mecanismo de comercio
          electrónico. El derecho de retracto del art. 47 es una figura distinta
          y no depende del pago: lo que lo deja fuera aquí es que en el sitio no
          se celebra ninguna compraventa. Si una venta concreta queda cubierta
          depende de cómo se formalice y de quién venda, no del sitio.
        </Why>
        <Why summary="Cookies y tecnologías de seguimiento: no hay banner">
          El sitio público no carga analítica, píxeles ni almacenamiento de
          seguimiento, y no usa <code className="text-ink-soft">localStorage</code>{" "}
          ni <code className="text-ink-soft">sessionStorage</code>. Las únicas
          cookies son las de sesión de Supabase Auth, y solo aparecen al entrar a
          este panel. Por eso no hay banner: construir uno para pedir permiso por
          almacenamiento estrictamente necesario sería pedir un permiso que no
          hace falta. Si algún día se añade una tecnología opcional, hará falta
          banner, preferencias reutilizables y bloqueo previo del script.
        </Why>
      </Section>
    </div>
  );
}
