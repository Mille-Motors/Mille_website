"use client";

import { useEffect } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";

/**
 * Lo que se ve cuando algo del sitio público falla de verdad —la base no
 * responde, una consulta revienta— en lugar de la pantalla genérica de
 * Next.js, que no tiene marca, ni navegación, ni salida.
 *
 * No hay inventario de respaldo: inventar vehículos escondería una caída de
 * producción. Solo se reconoce el fallo y se ofrece reintentar, que es lo
 * único honesto que se puede hacer desde aquí.
 *
 * El detalle del error no se muestra: puede contener la consulta, el nombre
 * de una tabla o la cadena de conexión. Va a la consola del servidor.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mille:public]", error);
  }, [error]);

  return (
    <section className="bg-cream">
      <Container width="wide">
        <div className="flex min-h-[60dvh] flex-col justify-center py-16 lg:py-24">
          <p className="eyebrow leading-[1.9] text-ink-muted/70">{site.tagline}</p>

          <h1 className="mt-7 max-w-2xl font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.1] text-ink uppercase">
            Algo se rompió de nuestro lado.
          </h1>

          <span aria-hidden className="mt-8 block h-px w-20 bg-burgundy/60" />

          <p className="mt-7 max-w-md font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
            No pudimos cargar esta página. No es culpa tuya y no hemos perdido
            nada: vuelve a intentarlo en un momento.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={reset}>
              <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
              Reintentar
            </Button>
            <ButtonLink href="/" variant="ghost" size="lg">
              Volver al inicio
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
            </ButtonLink>
          </div>

          {/* El digest es el único identificador que Next expone en cliente y
              no revela nada del error: sirve para cruzarlo con los registros
              del servidor si alguien reporta el fallo. */}
          {error.digest ? (
            <p className="mt-14 text-xs text-ink-muted/70 tabular">
              Referencia: {error.digest}
            </p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
