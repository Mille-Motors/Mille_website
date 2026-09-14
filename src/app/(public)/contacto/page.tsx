import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { WhatsappButtonLink } from "@/components/ui/Button";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/BrandIcons";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { ContactPanel } from "@/components/brand/ContactPanel";
import { ContactForm } from "@/components/forms/ContactForm";
import { site } from "@/data/site";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { getVehicles } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contáctanos. MILLE está en Bogotá, Colombia.",
};

const channels = [
  {
    icon: WhatsappIcon,
    label: "WhatsApp",
    detail: site.phone ? "Respuesta inmediata" : "Disponible al lanzamiento",
    href: generalWhatsappUrl(),
    external: true,
  },
  {
    icon: InstagramIcon,
    label: "Instagram",
    detail: site.instagram ? "Síguenos" : "Disponible al lanzamiento",
    href: site.instagram?.url ?? null,
    external: true,
  },
  {
    icon: Mail,
    label: "Correo",
    detail: site.email ?? "Disponible al lanzamiento",
    href: site.email ? `mailto:${site.email}` : null,
    external: false,
  },
  {
    icon: MapPin,
    label: site.cityShort,
    detail: "Solo con cita previa",
    href: null,
    external: false,
  },
] as const;

export default async function ContactPage() {
  const vehicles = await getVehicles();

  return (
    <>
      <section className="border-b border-stone bg-cream">
        <Container width="wide" className="lg:px-0">
          <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="py-14 lg:py-20 lg:pr-14 lg:pl-12">
              <Eyebrow className="leading-[1.9]">{site.tagline}</Eyebrow>

              <h1 className="mt-7 font-display text-[clamp(3rem,7vw,5rem)] leading-[1] text-ink">
                Hablemos<span className="text-burgundy">.</span>
              </h1>

              <Rule className="mt-8" />

              <p className="mt-7 max-w-md font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
                Cuéntanos qué estás buscando. Si está en nuestro inventario,
                coordinamos el siguiente paso; si todavía no, podemos
                ayudarte a encontrarlo.
              </p>

              <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
                {channels.map(({ icon: Icon, label, detail, href, external }) => {
                  const inner = (
                    <>
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-sand text-burgundy transition-colors group-hover:bg-burgundy group-hover:text-cream">
                        <Icon className="size-5" strokeWidth={1.4} />
                      </span>
                      <span className="mt-3.5 block font-serif text-[0.9375rem] text-ink">
                        {label}
                      </span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {detail}
                      </span>
                    </>
                  );
                  return (
                    <li key={label} className="text-center">
                      {href ? (
                        <a
                          href={href}
                          {...(external
                            ? { target: "_blank", rel: "noreferrer noopener" }
                            : {})}
                          className="group inline-block"
                        >
                          {inner}
                        </a>
                      ) : (
                        <span className="group inline-block">{inner}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="relative order-first aspect-[4/3] w-full overflow-hidden bg-charcoal sm:aspect-[16/9] lg:order-none lg:aspect-auto lg:min-h-[34rem]">
              <Image
                src="/images/brand/night.jpg"
                alt="Vehículo de MILLE fotografiado de noche"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-cream py-14 lg:py-20">
        <Container width="wide">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-14">
            <ContactForm vehicles={vehicles} />

            <ContactPanel />
          </div>
        </Container>
      </section>

      {/* Este bloque promete respuesta inmediata por WhatsApp. Mientras no
          exista la línea, prometerlo y rematar con un botón inerte sería
          exactamente el placeholder falso que el proyecto viene evitando: se
          oculta entero. El formulario de arriba sí funciona. Cuando
          site.phone tenga valor, vuelve solo. */}
      {site.phone ? (
      <section className="bg-cream pb-16 lg:pb-24">
        <Container width="wide">
          <div className="relative overflow-hidden bg-black">
            <Image
              src="/images/vehicles/mercedes-benz-c-300/02.jpg"
              alt=""
              fill
              sizes="(min-width: 1280px) 1280px, 100vw"
              className="object-cover opacity-45"
            />
            <div className="relative flex flex-col gap-7 px-8 py-12 sm:px-12 lg:flex-row lg:items-center lg:justify-between lg:py-14">
              <div>
                <h2 className="font-display text-[clamp(1.6rem,3vw,2.125rem)] leading-tight text-cream">
                  ¿Prefieres hablar ahora?
                </h2>
                <p className="mt-3 max-w-md font-serif text-[0.9375rem] leading-relaxed text-cream/70">
                  Escríbenos por WhatsApp y te respondemos directamente,
                  sin intermediarios.
                </p>
              </div>
              <WhatsappButtonLink
                href={generalWhatsappUrl()}
                variant="onDark"
                size="lg"
                className="shrink-0"
              >
                <WhatsappIcon className="size-4" />
                Hablar por WhatsApp
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </WhatsappButtonLink>
            </div>
          </div>
        </Container>
      </section>
      ) : null}
    </>
  );
}
