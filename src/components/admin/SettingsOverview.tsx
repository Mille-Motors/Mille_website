import { AlertTriangle, Check, ExternalLink } from "lucide-react";
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
import { cn } from "@/lib/cn";

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
 */

function StatusRow({
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
    <div className="grid gap-1 border-b border-stone py-4 last:border-b-0 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="eyebrow text-ink-muted/80">{label}</dt>
      <dd className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "label-caps inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-[10px]",
              active
                ? "border-status-available/30 bg-status-available/10 text-status-available"
                : "border-stone-strong/40 bg-sand text-ink-muted",
            )}
          >
            {active ? (
              <Check aria-hidden className="size-3" strokeWidth={2} />
            ) : null}
            {active ? "Activo" : "Sin configurar"}
          </span>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-serif text-sm break-all text-burgundy underline underline-offset-2"
            >
              {value}
              <ExternalLink aria-hidden className="size-3 shrink-0" strokeWidth={1.6} />
            </a>
          ) : (
            <span className="font-serif text-sm break-all text-ink-soft">
              {value}
            </span>
          )}
        </span>
        {note ? (
          <span className="mt-1 block font-serif text-xs text-ink-muted">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

export function SettingsOverview() {
  const gaps = legalIdentityGaps();
  const whatsapp = site.phone;

  return (
    <div className="grid max-w-4xl gap-6">
        <section className="border border-stone bg-paper px-5 py-5 sm:px-7">
          <h2 className="font-display text-xl text-ink">Canales oficiales</h2>
          <p className="mt-1.5 font-serif text-sm text-ink-muted">
            Lo que el sitio público muestra hoy. Se definen en{" "}
            <code className="font-serif text-ink-soft">src/data/site.ts</code>:
            un canal se activa cambiando ese archivo, no escribiéndolo aquí.
          </p>

          <dl className="mt-5">
            <StatusRow
              label="Dominio oficial"
              value={site.url}
              href={site.url}
              active
              note="Autoridad canónica del sitio: de aquí salen canonical, Open Graph, robots, sitemap y JSON-LD."
            />
            <StatusRow
              label="Correo oficial"
              value={LEGAL_CONTACT.email}
              href={`mailto:${LEGAL_CONTACT.email}`}
              active
              note="Canal general y, mientras no exista uno especializado, canal electrónico para consultas y reclamos de protección de datos."
            />
            <StatusRow
              label="Instagram"
              value={site.instagram?.handle ?? "Sin configurar"}
              href={site.instagram?.url ?? null}
              active={Boolean(site.instagram)}
            />
            <StatusRow
              label="WhatsApp"
              value={whatsapp?.display ?? "Sin configurar"}
              href={whatsapp ? `https://wa.me/${whatsapp.number}` : null}
              active={Boolean(whatsapp)}
              note={whatsapp ? `Atención: ${whatsapp.hours.label}.` : undefined}
            />
            <StatusRow
              label="Domicilio"
              value={LEGAL_CONTACT.domicile}
              active
            />
            <StatusRow
              label="Dirección de notificaciones"
              value={
                LEGAL_CONTACT.physicalAddress ??
                "Pendiente de confirmar por MILLE"
              }
              active={Boolean(LEGAL_CONTACT.physicalAddress)}
              note="No se publica ninguna dirección mientras no exista una confirmada para el proyecto."
            />
          </dl>
        </section>

        <section className="border border-stone bg-paper px-5 py-5 sm:px-7">
          <h2 className="font-display text-xl text-ink">Pagos en línea</h2>
          <p className="mt-1.5 font-serif text-sm leading-relaxed text-ink-muted">
            El sitio <strong className="text-ink">no procesa pagos</strong>:
            no hay checkout, ni reservas pagadas, ni anticipos, ni pasarela, ni
            tarjetas. Una negociación económica por un vehículo ocurre fuera
            del sitio. Por eso no hay política de reembolsos —no hay pago que
            reembolsar— ni reversión del pago del art. 51 de la Ley 1480 de
            2011, que exige un pago hecho con instrumento electrónico en el
            mecanismo de comercio electrónico. El derecho de retracto del art.
            47 es una figura distinta y no depende del pago: lo que lo deja
            fuera aquí es que en el sitio no se celebra ninguna compraventa.
            Si una venta concreta queda cubierta depende de cómo se formalice
            y de quién venda, no del sitio.
          </p>
        </section>

        <section className="border border-stone bg-paper px-5 py-5 sm:px-7">
          <h2 className="font-display text-xl text-ink">Documentos legales</h2>
          <p className="mt-1.5 font-serif text-sm text-ink-muted">
            La versión es la fecha, y es fuente única: vive en{" "}
            <code className="font-serif text-ink-soft">src/lib/legal.ts</code>.
            Los consentimientos ya registrados siguen apuntando a la versión
            que estaba vigente cuando se otorgaron.
          </p>

          <dl className="mt-5">
            {LEGAL_DOCUMENTS.map((document) => (
              <div
                key={document}
                className="grid gap-1 border-b border-stone py-4 last:border-b-0 sm:grid-cols-[14rem_1fr] sm:gap-4"
              >
                <dt className="eyebrow text-ink-muted/80">
                  {LEGAL_TITLES[document]}
                </dt>
                <dd className="font-serif text-sm text-ink-soft">
                  Versión{" "}
                  <span className="tabular">{LEGAL_VERSIONS[document]}</span> ·{" "}
                  {formatLegalVersion(LEGAL_VERSIONS[document])} ·{" "}
                  <a
                    href={LEGAL_PATHS[document]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-burgundy underline underline-offset-2"
                  >
                    ver página
                  </a>
                </dd>
              </div>
            ))}
            <div className="grid gap-1 border-b border-stone py-4 last:border-b-0 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="eyebrow text-ink-muted/80">
                Texto de autorización
              </dt>
              <dd className="font-serif text-sm text-ink-soft">
                <span className="tabular">{DATA_PROCESSING_CONSENT.id}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  {DATA_PROCESSING_CONSENT.text}
                </span>
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="eyebrow text-ink-muted/80">
                Autoridad del consumidor
              </dt>
              <dd className="font-serif text-sm text-ink-soft">
                <a
                  href={CONSUMER_AUTHORITY.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-burgundy underline underline-offset-2"
                >
                  {CONSUMER_AUTHORITY.name}
                </a>
                <span className="mt-1 block text-xs text-ink-muted">
                  Enlazada desde el pie del sitio, como pide el art. 50,
                  parágrafo, de la Ley 1480 de 2011.
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="border border-stone bg-paper px-5 py-5 sm:px-7">
          <h2 className="font-display text-xl text-ink">
            Responsable del Tratamiento
          </h2>

          {LEGAL_RESPONSIBLES.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {LEGAL_RESPONSIBLES.map((responsible) => (
                <li
                  key={responsible.identification}
                  className="font-serif text-sm text-ink-soft"
                >
                  {responsible.legalName} ·{" "}
                  <span className="tabular">{responsible.identification}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 font-serif text-sm leading-relaxed text-ink-muted">
              MILLE Motor Culture es una marca operada por personas naturales en
              asocio. La Ley 1581 de 2012 (art. 3, lit. e) admite esa figura
              expresamente, así que no hace falta constituir una sociedad para
              tener una política válida — pero sí identificar a quien responde.
            </p>
          )}

          {gaps.length > 0 ? (
            <div className="mt-5 border border-status-reserved/30 bg-status-reserved/10 px-4 py-4">
              <p className="inline-flex items-center gap-2 font-serif text-sm text-status-reserved">
                <AlertTriangle
                  aria-hidden
                  className="size-4 shrink-0"
                  strokeWidth={1.7}
                />
                <strong>Falta por confirmar antes de cerrar la política.</strong>
              </p>
              <ul className="mt-3 grid gap-1.5 pl-6">
                {gaps.map((gap) => (
                  <li
                    key={gap}
                    className="list-disc font-serif text-sm text-ink-soft"
                  >
                    {gap}
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-serif text-xs leading-relaxed text-ink-muted">
                Lo exigen el art. 12, lit. d) de la Ley 1581 de 2012 y el art.
                13, num. 1 del Decreto 1377 de 2013, compilado en el Decreto
                1074 de 2015. Hasta que estén confirmados, la Política de
                Tratamiento lo dice en su primera sección en vez de publicar una
                identificación deducida: un nombre legal completo no se infiere
                de un nombre abreviado, y la dirección de residencia de nadie se
                publica como dirección de una marca. Se rellenan en{" "}
                <code className="font-serif text-ink-soft">src/lib/legal.ts</code>{" "}
                y eso sube la versión de la política.
              </p>
            </div>
          ) : (
            <p className="mt-4 inline-flex items-center gap-2 font-serif text-sm text-status-available">
              <Check aria-hidden className="size-4 shrink-0" strokeWidth={2} />
              Identificación completa.
            </p>
          )}
        </section>

        <section className="border border-stone bg-paper px-5 py-5 sm:px-7">
          <h2 className="font-display text-xl text-ink">
            Cookies y tecnologías de seguimiento
          </h2>
          <p className="mt-1.5 font-serif text-sm leading-relaxed text-ink-muted">
            El sitio público no carga analítica, píxeles ni almacenamiento de
            seguimiento, y no usa <code className="text-ink-soft">localStorage</code>{" "}
            ni <code className="text-ink-soft">sessionStorage</code>. Las únicas
            cookies son las de sesión de Supabase Auth, y solo aparecen al
            entrar a este panel. Por eso no hay banner: construir uno para
            pedir permiso por almacenamiento estrictamente necesario sería
            pedir un permiso que no hace falta. Si algún día se añade una
            tecnología opcional, hará falta banner, preferencias reutilizables
            y bloqueo previo del script.
          </p>
        </section>
    </div>
  );
}
