"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, ButtonArrow, ButtonLink } from "@/components/ui/Button";

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
      <div className="wrap flex min-h-[70dvh] flex-col justify-center py-[clamp(3.5rem,7vw,8rem)]">
        <h1 className="text-title hero-rise max-w-[16ch]" style={{ "--i": 0 } as React.CSSProperties}>
          Algo se rompió de nuestro lado.
        </h1>

        <p
          className="hero-rise mt-7 max-w-md text-[1.25rem] leading-snug text-ink-soft"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          No pudimos cargar esta página. No es culpa tuya y no hemos perdido
          nada: vuelve a intentarlo en un momento.
        </p>

        <div
          className="hero-rise mt-10 flex flex-wrap items-center gap-3"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          <Button size="lg" onClick={reset} className="gap-4">
            <RotateCcw aria-hidden className="size-5" strokeWidth={1.4} />
            Reintentar
          </Button>
          <ButtonLink href="/" variant="ghost" size="lg" className="gap-8">
            Volver al inicio
            <ButtonArrow />
          </ButtonLink>
        </div>

        {/* El digest es el único identificador que Next expone en cliente y
            no revela nada del error: sirve para cruzarlo con los registros
            del servidor si alguien reporta el fallo. */}
        {error.digest ? (
          <p className="mt-14 text-sm text-ink-muted tabular">
            Referencia: {error.digest}
          </p>
        ) : null}
      </div>
    </section>
  );
}
