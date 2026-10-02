"use client";

import { useEffect } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/**
 * Lo que se ve cuando algo del panel falla de verdad.
 *
 * Va en `/admin` y no en el grupo `(panel)` a propósito: un `error.tsx`
 * captura lo que renderizan sus hijos, no su propio layout hermano. Lo que
 * más probablemente reviente aquí es justamente el layout de `(panel)`,
 * porque empieza comprobando la sesión contra la base; puesto dentro, ese
 * fallo se le escaparía y acabaría en la pantalla desnuda de Next. Puesto
 * aquí cubre las dos cosas.
 *
 * El precio es que no se dibuja la barra lateral —el armazón es
 * precisamente lo que puede haber fallado—, así que esta pantalla se vale
 * por sí misma y ofrece la vuelta al panel como un enlace normal.
 *
 * No se enseña el detalle del error: puede traer la consulta, el nombre de
 * una tabla o la cadena de conexión. Va a la consola. El `digest` sí, que
 * es un identificador opaco y es lo que permite cruzarlo con los registros
 * del servidor.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mille:admin]", error);
  }, [error]);

  return (
    <section className="bg-cream">
      <Container width="wide">
        <div className="flex min-h-[70dvh] flex-col justify-center py-16">
          <p className="eyebrow leading-[1.9] text-ink-muted/70">
            MILLE · Administración
          </p>

          <h1 className="mt-7 max-w-2xl font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] text-ink uppercase">
            Algo salió mal en el panel.
          </h1>

          <span aria-hidden className="mt-8 block h-px w-20 bg-burgundy/60" />

          <p className="mt-7 max-w-md font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
            No pudimos cargar esta pantalla. Nada de lo que ya estaba guardado
            se ha perdido: vuelve a intentarlo en un momento.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={reset}>
              <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
              Reintentar
            </Button>
            <ButtonLink href="/admin" variant="ghost" size="lg">
              Volver al panel
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
            </ButtonLink>
          </div>

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
