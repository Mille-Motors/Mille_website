import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { ExternalButtonLink } from "@/components/ui/Button";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/BrandIcons";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { ContactForm } from "@/components/forms/ContactForm";
import { site } from "@/data/site";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { getVehicles } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escríbenos por WhatsApp, Instagram o correo. Estamos en Bogotá, Colombia.",
};

const channels = [
  {
    icon: WhatsappIcon,
    label: "WhatsApp",
    detail: "Respuesta inmediata",
    href: generalWhatsappUrl(),
    external: true,
  },
  {
    icon: InstagramIcon,
    label: "Instagram",
    detail: "Síguenos",
    href: site.instagram.url,
    external: true,
  },
  {
    icon: Mail,
    label: "Correo",
    detail: site.email,
    href: `mailto:${site.email}`,
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
              <Eyebrow className="leading-[1.9]">
                Autos extraordinarios
                <br />
                para personas extraordinarias
              </Eyebrow>

              <h1 className="mt-7 font-display text-[clamp(3rem,7vw,5rem)] leading-[1] text-ink">
                Hablemos<span className="text-burgundy">.</span>
              </h1>

              <Rule className="mt-8" />

              <p className="mt-7 max-w-md font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
                Estamos aquí para asesorarte en la búsqueda de tu próximo
                vehículo. Cuéntanos lo que necesitas y nuestro equipo te
                contactará a la brevedad.
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

            <div className="relative hidden min-h-[32rem] overflow-hidden bg-charcoal lg:block">
              <Image
                src="/images/brand/interior.jpg"
                alt="Interior en cuero de un vehículo de MILLE"
                fill
                sizes="40vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-10">
                <p className="font-display text-2xl leading-[1.2] text-cream uppercase">
                  Más que carros,
                  <br />
                  es un estilo de vida.
                </p>
                <p className="eyebrow mt-6 leading-[1.9] text-cream/60">
                  Autos extraordinarios
                  <br />
                  para personas extraordinarias
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

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
                  Escríbenos por WhatsApp y recibe atención inmediata de un
                  asesor especializado.
                </p>
              </div>
              <ExternalButtonLink
                href={generalWhatsappUrl()}
                variant="onDark"
                size="lg"
                className="shrink-0"
              >
                <WhatsappIcon className="size-4" />
                Hablar por WhatsApp
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </ExternalButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
