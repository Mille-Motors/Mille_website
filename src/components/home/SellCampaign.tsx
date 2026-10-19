import { SiteMediaPicture } from "@/components/media/SiteMediaPicture";
import { ButtonArrow, ButtonLink, ExternalButtonLink } from "@/components/ui/Button";
import { intentWhatsappUrl } from "@/lib/whatsapp";
import { getSiteMediaImage } from "@/server/site-media/service";
import { REVEAL } from "@/lib/reveal";

/**
 * Para quien quiere vender: una fotografía a todo el ancho con una sola frase
 * y, debajo, lo que MILLE hace por el vehículo en tres pasos.
 *
 * El botón abre WhatsApp con el mensaje de "quiero hablar de mi vehículo" ya
 * escrito, que es el camino más corto para un vendedor; mientras no haya
 * línea provisionada lleva a la página de contacto.
 *
 * La fotografía se administra desde /admin/contenido.
 */
const steps = [
  {
    title: "Conocer el vehículo",
    body: "Cuéntanos qué tienes, cómo lo has cuidado y qué deberíamos saber antes de presentarlo.",
  },
  {
    title: "Mostrarlo bien",
    body: "Buenas fotografías y la información que tú también pedirías antes de comprar.",
  },
  {
    title: "Acompañar la conversación",
    body: "Conectar a las personas, resolver preguntas y mantener claro el siguiente paso.",
  },
] as const;

export async function SellCampaign() {
  const image = await getSiteMediaImage("home.about.house");
  const whatsapp = intentWhatsappUrl("vender");

  return (
    <section id="vender" className="scroll-mt-header bg-dark text-cream">
      <div className="relative isolate flex min-h-[clamp(32rem,82svh,58rem)] items-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="drift absolute inset-0"
          >
            {/* A todo el ancho en los dos tamaños, pero con composiciones
                muy distintas: 1.95 apaisada arriba, casi cuadrada en el
                teléfono. Por eso tiene variante propia. */}
            <SiteMediaPicture
              image={image}
              sizes="100vw"
              quality={75}
              className="photo-grade object-cover"
            />
          </div>
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-r from-dark/85 via-dark/45 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-dark/70 via-transparent to-transparent"
        />

        <div className="wrap py-20">
          <h2
            className="max-w-[16ch] text-[clamp(2rem,2.55vw+1.1rem,5rem)] leading-[1.08] tracking-[-0.01em]"
            {...REVEAL}
          >
            Tu carro merece una buena presentación.
          </h2>
          <div
            className="mt-9"
            {...REVEAL}
            style={{ "--d": "140ms" } as React.CSSProperties}
          >
            {whatsapp ? (
              <ExternalButtonLink
                href={whatsapp}
                variant="onDark"
                size="lg"
                data-wa-source="home"
                data-wa-intent="vender"
                className="w-full justify-between gap-10 sm:w-auto"
              >
                Vende con MILLE
                <ButtonArrow />
              </ExternalButtonLink>
            ) : (
              <ButtonLink
                href="/contacto"
                variant="onDark"
                size="lg"
                className="w-full justify-between gap-10 sm:w-auto"
              >
                Vende con MILLE
                <ButtonArrow />
              </ButtonLink>
            )}
          </div>
        </div>
      </div>

      <div className="wrap grid gap-8 py-[clamp(3.5rem,6vw,6rem)] lg:grid-cols-[0.8fr_1fr] lg:gap-[12vw]">
        <p
          className="max-w-[18ch] text-[clamp(1.5rem,1.2vw+1.1rem,2.375rem)] leading-[1.25]"
          {...REVEAL}
        >
          Si lo vas a vender, empecemos por conocerlo.
        </p>

        <div className="border-t border-cream/25" {...REVEAL} style={{ "--d": "100ms" } as React.CSSProperties}>
          {steps.map((step, index) => (
            <details
              key={step.title}
              name="sell-steps"
              open={index === 0}
              className="accordion border-b border-cream/25"
            >
              <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-6 py-5 text-[1.375rem] leading-snug">
                {step.title}
                <span aria-hidden className="plus relative size-4 shrink-0">
                  <i className="absolute top-[7px] left-0 block h-px w-4 bg-current" />
                  <i className="absolute top-[7px] left-0 block h-px w-4 rotate-90 bg-current transition-transform duration-300 ease-out" />
                </span>
              </summary>
              <p className="max-w-144 pr-10 pb-6 text-[1.125rem] leading-[1.55] text-cream/75">
                {step.body}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
