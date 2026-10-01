"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Los detalles de la ficha, en una sola pila desplegable.
 *
 * El problema que resuelve es de escritorio. En teléfono la ficha ya
 * funcionaba: los acordeones imponían un orden y se leía una cosa cada vez.
 * En escritorio, en cambio, se abrían dos columnas con TODO desplegado a la
 * vez —especificaciones enormes a la izquierda; descripción, equipamiento y
 * documentación a la derecha— y no había ninguna ruta evidente: la vista
 * empezaba por dos sitios y no terminaba en ninguno.
 *
 * Ahora el patrón es el mismo en los dos tamaños, que es lo que hace que
 * la página tenga un solo eje de lectura. Lo que cambia con el ancho es
 * cuánto cabe DENTRO de cada sección abierta, no cuántas hay abiertas.
 *
 * No son tarjetas: son filetes horizontales sobre el mismo fondo crema, que
 * es como el resto del sitio separa secciones.
 */
export interface DetailSection {
  /** Estable: se usa como `key` y para el ancla. */
  id: string;
  title: string;
  /** Una señal corta a la derecha: "4 secciones", "6 datos". */
  hint?: string;
  children: React.ReactNode;
}

export function VehicleDetails({ sections }: { sections: DetailSection[] }) {
  // La primera nace abierta: una pila de cuatro títulos cerrados parece una
  // ficha vacía. A partir de ahí manda quien lee.
  const [open, setOpen] = useState<string | null>(sections[0]?.id ?? null);
  const base = useId();

  if (sections.length === 0) return null;

  return (
    <div className="border-t border-stone">
      {sections.map((section) => {
        const expanded = open === section.id;
        const panelId = `${base}-${section.id}`;

        return (
          <section key={section.id} className="border-b border-stone">
            <h3>
              <button
                type="button"
                id={`${panelId}-trigger`}
                aria-expanded={expanded}
                aria-controls={panelId}
                // Abrir una cierra la anterior: la pantalla no se convierte
                // en el muro que este componente existe para evitar.
                onClick={() => setOpen(expanded ? null : section.id)}
                className={cn(
                  "group flex w-full items-baseline justify-between gap-6 py-6 text-left transition-colors lg:py-7",
                  "hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy",
                  expanded ? "text-ink" : "text-ink-soft",
                )}
              >
                <span className="font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-none">
                  {section.title}
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  {section.hint ? (
                    <span className="label-caps hidden text-[10px] text-ink-muted sm:inline">
                      {section.hint}
                    </span>
                  ) : null}
                  <ChevronDown
                    aria-hidden
                    strokeWidth={1.2}
                    className={cn(
                      "size-5 text-ink-muted transition-transform duration-300",
                      expanded && "rotate-180",
                    )}
                  />
                </span>
              </button>
            </h3>

            <DetailPanel
              id={panelId}
              labelledBy={`${panelId}-trigger`}
              expanded={expanded}
              onReveal={() => setOpen(section.id)}
            >
              {section.children}
            </DetailPanel>
          </section>
        );
      })}
    </div>
  );
}

/**
 * El panel de una sección, que SIEMPRE está en el DOM.
 *
 * Desmontarlo al cerrar dejaba la ficha dependiendo de que alguien hiciera
 * clic: el texto no estaba en el HTML, así que no existía para un buscador,
 * ni para buscar dentro de la página, ni al imprimir. En una ficha de
 * vehículo eso es justo el contenido que importa.
 *
 * `hidden` resuelve lo demás de una sola vez: lo saca del árbol accesible y
 * del orden de tabulación —ni un enlace de dentro queda alcanzable con el
 * teclado— y lo oculta de verdad, que es lo que no garantiza esconderlo con
 * `opacity` o `height`.
 *
 * Y luego está `hidden="until-found"`, que además deja que buscar en la
 * página lo encuentre y lo revele. No se puede poner desde JSX porque React
 * trata `hidden` como atributo booleano y lo colapsa a `hidden=""`, así que
 * se asciende aquí sobre el nodo real. Donde el navegador no lo soporta,
 * cualquier valor sigue significando oculto: el comportamiento base no
 * cambia.
 */
function DetailPanel({
  id,
  labelledBy,
  expanded,
  onReveal,
  children,
}: {
  id: string;
  labelledBy: string;
  expanded: boolean;
  /** El navegador reveló la sección al buscar texto: hay que sincronizar. */
  onReveal: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // En una ref para que cambiar el callback no vuelva a montar el efecto
  // que registra el listener. Se actualiza en su propio efecto, nunca
  // durante el render.
  const reveal = useRef(onReveal);
  useEffect(() => {
    reveal.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    const node = ref.current;
    if (!node || expanded) return;
    if (!("onbeforematch" in node)) return;

    node.setAttribute("hidden", "until-found");
    const handle = () => reveal.current();
    node.addEventListener("beforematch", handle);
    return () => node.removeEventListener("beforematch", handle);
  }, [expanded]);

  return (
    <div
      ref={ref}
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      hidden={!expanded}
      className="pb-10 lg:pb-12"
    >
      {children}
    </div>
  );
}
