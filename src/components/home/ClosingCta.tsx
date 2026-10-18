import { ButtonArrow, ButtonLink } from "@/components/ui/Button";
import { REVEAL } from "@/lib/reveal";

/**
 * El último campo antes del pie: vinotinto a todo el ancho, una pregunta y un
 * botón. Se repite en las páginas donde la visita termina sin una acción
 * clara, para que nunca acabe en un callejón.
 */
export function ClosingCta({
  title = "¿Qué tienes en mente?",
  body = "Vender el tuyo. Buscar el siguiente. O hablar de carros un rato.",
  action = "Hablemos",
  href = "/contacto",
}: {
  title?: string;
  body?: string;
  action?: string;
  href?: string;
}) {
  return (
    <section className="bg-burgundy py-[clamp(4rem,8vw,8.5rem)] text-cream">
      <div className="wrap grid items-center gap-9 lg:grid-cols-[1.4fr_1fr] lg:gap-[8vw]">
        <h2 className="text-title" {...REVEAL}>
          {title}
        </h2>
        <div
          className="max-w-88 lg:justify-self-end"
          {...REVEAL}
          style={{ "--d": "120ms" } as React.CSSProperties}
        >
          <p className="text-[1.375rem] leading-snug">{body}</p>
          <ButtonLink
            href={href}
            variant="cream"
            size="lg"
            className="mt-8 w-full justify-between gap-10 sm:w-auto"
          >
            {action}
            <ButtonArrow />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
