import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatLegalVersion } from "@/lib/legal";

/**
 * El marco de un documento legal: titular grande, fecha y versión, los otros
 * dos documentos a un clic y el texto en una medida de lectura. Es la página
 * más larga y menos mirada del sitio, y por eso la más sobria: sin imagen ni
 * movimiento, solo tipografía que se pueda leer una hora.
 *
 * La fecha se DERIVA de la versión y ya no llega como prop. Antes cada página
 * traía las dos —`version="2026-10-17"` y `updated="17 de octubre de 2026"`—
 * y nada garantizaba que coincidieran: una corrección podía mover el texto
 * legible y dejar la versión quieta, y entonces un consentimiento guardado
 * contra esa versión dejaba de poder demostrar qué se mostró.
 */
export function LegalDocument({
  title,
  version,
  children,
}: {
  title: string;
  /** `AAAA-MM-DD`, desde `LEGAL_VERSIONS`. */
  version: string;
  children: React.ReactNode;
}) {
  const updated = formatLegalVersion(version);
  return (
    <>
      <section className="bg-cream pt-[clamp(2.5rem,5vw,5rem)] pb-[clamp(2rem,4vw,3.5rem)]">
        <div className="wrap">
          <h1 className="text-title hero-rise max-w-[18ch]" style={{ "--i": 0 } as React.CSSProperties}>
            {title}
          </h1>
          <p
            className="hero-rise mt-6 flex flex-wrap gap-x-6 gap-y-1 text-[1.125rem] text-ink-muted"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            <span>Actualizado: {updated}</span>
            <span>Versión: {version}</span>
          </p>
        </div>
      </section>

      <div className="wrap">
        <article className="max-w-208 pb-(--space)">
          <nav
            aria-label="Documentos legales"
            className="flex flex-wrap gap-2 pb-8"
          >
            {[
              { href: "/terminos", label: "Términos" },
              { href: "/privacidad", label: "Tratamiento de datos" },
              { href: "/cookies", label: "Cookies" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="press inline-flex min-h-10 items-center rounded-full border border-ink/25 px-4 text-base text-ink-soft hover:border-burgundy hover:text-burgundy"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {children}
        </article>
      </div>
    </>
  );
}

/**
 * Una sección del documento. El número es parte del texto —los documentos
 * legales se citan por sección—, así que va delante del título, en el mismo
 * peso, y no como adorno en una columna aparte.
 */
export function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink/15 py-9 lg:py-11">
      <h2 className="text-[clamp(1.5rem,1vw+1.2rem,2.125rem)] leading-[1.15]">
        <span className="tabular text-burgundy">{number}.</span> {title}
      </h2>
      <div
        className={cn(
          "mt-5 space-y-4 text-[1.25rem] leading-[1.65] text-ink-soft",
          "[&_a]:text-burgundy [&_a]:underline [&_a]:underline-offset-4",
          "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        )}
      >
        {children}
      </div>
    </section>
  );
}
