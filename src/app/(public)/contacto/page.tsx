import { SiteMediaPicture } from "@/components/media/SiteMediaPicture";
import type { Metadata } from "next";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { ButtonArrow, ButtonLink, WhatsappButtonLink } from "@/components/ui/Button";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/BrandIcons";
import { ContactPanel } from "@/components/brand/ContactPanel";
import { ContactForm } from "@/components/forms/ContactForm";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { getSiteMediaImage } from "@/server/site-media/service";
import { getVehicles } from "@/lib/vehicles";
import { REVEAL } from "@/lib/reveal";
import { defaultOgImages } from "@/server/site-media/og";

const CONTACT_TITLE = "Contacto";
const CONTACT_DESCRIPTION =
  "Escríbenos. MILLE es una House of Motor Culture en Bogotá: cuéntanos qué estás buscando y coordinamos el siguiente paso.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
    alternates: canonical("/contacto"),
    ...socialMetadata({
      images: await defaultOgImages(),
      title: `${CONTACT_TITLE} | ${site.name}`,
      description: CONTACT_DESCRIPTION,
      path: "/contacto",
    }),
  };
}

const channels = [
  {
    icon: InstagramIcon,
    label: "Instagram",
    detail: site.instagram ? site.instagram.handle : "Disponible al lanzamiento",
    href: site.instagram?.url ?? null,
    external: true,
    whatsapp: false,
  },
  {
    icon: Mail,
    label: "Correo",
    detail: site.email ?? "Disponible al lanzamiento",
    href: site.email ? `mailto:${site.email}` : null,
    external: false,
    whatsapp: false,
  },
  {
    icon: MapPin,
    label: site.cityShort,
    detail: "Solo con cita previa",
    href: null,
    external: false,
    whatsapp: false,
  },
] as const;

export default async function ContactPage() {
  const vehicles = await getVehicles();
  // La fotografía se administra desde /admin/contenido, igual que las de la
  // home. Sin fila —o sin base— cae a la original del repositorio.
  const heroImage = await getSiteMediaImage("contact.hero");

  return (
    <>
      <section className="bg-cream pt-[clamp(2.5rem,5vw,5rem)] pb-[clamp(3rem,6vw,6rem)]">
        <div className="wrap grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-[7vw]">
          <div>
            <h1 className="text-display hero-rise" style={{ "--i": 0 } as React.CSSProperties}>
              Hablemos<span className="text-burgundy">.</span>
            </h1>

            <p
              className="hero-rise mt-8 max-w-120 text-[1.25rem] leading-[1.5] text-ink-soft"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Cuéntanos qué estás buscando. Si está en nuestro inventario,
              coordinamos el siguiente paso; si todavía no, podemos ayudarte a
              encontrarlo.
            </p>

            {/* La acción de la página: escribir ya. Sin línea de WhatsApp, lo
                que queda es dejar un mensaje en el formulario, que sí funciona. */}
            <div
              className="hero-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              {site.phone ? (
                <WhatsappButtonLink
                  href={generalWhatsappUrl()}
                  size="lg"
                  className="justify-between gap-8"
                  data-wa-source="contact"
                  data-wa-intent="general"
                >
                  <span className="inline-flex items-center gap-3">
                    <WhatsappIcon className="size-5" />
                    Escribir por WhatsApp
                  </span>
                  <ButtonArrow />
                </WhatsappButtonLink>
              ) : null}
              <ButtonLink
                href="#mensaje"
                variant={site.phone ? "ghost" : "primary"}
                size="lg"
                className="justify-between gap-8"
              >
                Dejar un mensaje
                <ButtonArrow />
              </ButtonLink>
            </div>
            {site.phone ? (
              <p
                className="hero-rise mt-3 text-base text-ink-muted"
                style={{ "--i": 3 } as React.CSSProperties}
              >
                {site.phone.hours.label}
              </p>
            ) : null}

            <ul
              className="hero-rise mt-10 max-w-120 divide-y divide-ink/12 border-y border-ink/12"
              style={{ "--i": 4 } as React.CSSProperties}
            >
              {channels.map(({ icon: Icon, label, detail, href, external, whatsapp }) => {
                const inner = (
                  <>
                    <Icon
                      className="size-6 shrink-0 text-burgundy"
                      strokeWidth={1.3}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.25rem] leading-tight text-ink">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-base text-ink-muted">
                        {detail}
                      </span>
                    </span>
                    {href ? (
                      <ArrowRight
                        aria-hidden
                        strokeWidth={1.3}
                        className="arrow-slide-icon size-5 shrink-0 text-ink-muted"
                      />
                    ) : null}
                  </>
                );
                return (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        {...(external
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                        {...(whatsapp
                          ? { "data-wa-source": "contact", "data-wa-intent": "general" }
                          : {})}
                        className="group flex min-h-20 items-center gap-5 py-4 transition-colors hover:text-burgundy"
                      >
                        {inner}
                      </a>
                    ) : (
                      <span className="flex min-h-20 items-center gap-5 py-4">
                        {inner}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-charcoal">
            <SiteMediaPicture
              image={heroImage}
              priority
              sizes="(min-width: 1024px) 45vw, 92vw"
              quality={90}
              className="photo-grade hero-settle object-cover"
            />
          </div>
        </div>
      </section>

      <section id="mensaje" className="scroll-mt-header bg-cream pb-(--space)">
        <div className="wrap grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-10">
          <div {...REVEAL}>
            <ContactForm vehicles={vehicles} />
          </div>
          <div {...REVEAL} style={{ "--d": "120ms" } as React.CSSProperties}>
            <ContactPanel />
          </div>
        </div>
      </section>

      {/* Este bloque promete respuesta por WhatsApp. Mientras no exista la
          línea, prometerlo y rematar con un botón inerte sería exactamente el
          placeholder falso que el proyecto viene evitando: se oculta entero.
          El formulario de arriba sí funciona. Cuando site.phone tenga valor,
          vuelve solo. */}
      {site.phone ? (
        <section className="bg-dark py-[clamp(4rem,8vw,8rem)] text-cream">
          <div className="wrap grid items-center gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-[8vw]">
            <h2 className="text-title" {...REVEAL}>
              ¿Prefieres
              <br className="hidden sm:block" /> hablar ahora?
            </h2>
            <div
              className="max-w-96 lg:justify-self-end"
              {...REVEAL}
              style={{ "--d": "120ms" } as React.CSSProperties}
            >
              <p className="text-[1.375rem] leading-snug">
                Escríbenos por WhatsApp y te respondemos directamente, sin
                intermediarios.
              </p>
              <WhatsappButtonLink
                href={generalWhatsappUrl()}
                variant="cream"
                size="lg"
                className="mt-8 w-full justify-between gap-10 sm:w-auto"
                data-wa-source="contact"
                data-wa-intent="general"
              >
                <span className="inline-flex items-center gap-3">
                  <WhatsappIcon className="size-5" />
                  Hablar por WhatsApp
                </span>
                <ButtonArrow />
              </WhatsappButtonLink>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
