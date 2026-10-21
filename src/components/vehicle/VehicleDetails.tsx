"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { revealSection, toggleSection } from "@/lib/accordion-scroll";

/**
 * Los detalles de la ficha, en una sola pila de tarjetas.
 *
 * El problema que resuelve es de escritorio. En teléfono la ficha ya
 * funcionaba: los acordeones imponían un orden y se leía una cosa cada vez.
 * En escritorio, en cambio, se abrían dos columnas con TODO desplegado a la
 * vez y no había ninguna ruta evidente: la vista empezaba por dos sitios y no
 * terminaba en ninguno.
 *
 * Ahora el patrón es el mismo en los dos tamaños, que es lo que hace que la
 * página tenga un solo eje de lectura.
 *
 * TODAS las tarjetas se despliegan, incluida «Acerca de este vehículo»: cada
 * una se abre y se cierra por su cuenta, y pueden estar varias abiertas a la
 * vez. Hubo una versión en la que el relato era una tarjeta fija, siempre
 * abierta, pero quien mira la ficha quiere poder recoger también lo que ya
 * leyó y llegar rápido a las especificaciones.
 *
 * Los tres niveles se distinguen por el tono, no por el borde: el encabezado
 * de cada categoría va sombreado (arena), su cuerpo en papel, y las
 * subcategorías de dentro en un recuadro de un tono más. Antes todo era el
 * mismo fondo con líneas finas y no se veía qué era qué.
 */
export interface DetailSection {
  /** Estable: se usa como `key` y para el ancla. */
  id: string;
  title: string;
  /** Una señal corta a la derecha: "4 secciones", "6 datos". */
  hint?: string;
  children: React.ReactNode;
}

/** Lo que dura abrir o cerrar. Una animación de producto, no de escaparate. */
const DURATION = 340;
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** El título de una tarjeta. */
const titleClass =
  "text-[clamp(1.5rem,1.2vw+1.1rem,2.125rem)] leading-none text-ink";

/** El cuerpo de una tarjeta, bajo su encabezado. */
const bodyClass =
  "border-t border-ink/10 px-5 pt-7 pb-8 sm:px-7 lg:pt-8 lg:pb-10";

export function VehicleDetails({ sections }: { sections: DetailSection[] }) {
  // La primera nace abierta: una pila de títulos cerrados parece una ficha
  // vacía. A partir de ahí manda quien lee, y se abren las que quiera, a la
  // vez.
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(sections[0] ? [sections[0].id] : []),
  );
  const base = useId();

  if (sections.length === 0) return null;

  return (
    <div className="grid gap-4">
      {sections.map((section) => {
        const panelId = `${base}-${section.id}`;
        const expanded = open.has(section.id);

        return (
          <section
            key={section.id}
            // Que el título no acabe debajo de la barra superior, que es
            // sticky. La altura sale de la misma variable que usa la barra,
            // así que no hay dos números que mantener de acuerdo.
            className={cn(
              "scroll-mt-header overflow-hidden rounded-2xl border bg-paper transition-colors duration-300",
              expanded ? "border-ink/25" : "border-ink/15",
            )}
          >
            <h3>
              <button
                type="button"
                id={`${panelId}-trigger`}
                aria-expanded={expanded}
                aria-controls={panelId}
                // Cada una se abre y se cierra por su cuenta. Nada más se
                // mueve: lo que hay encima del título pulsado no cambia de
                // alto, así que la pantalla se queda donde está.
                onClick={() =>
                  setOpen((current) => toggleSection(current, section.id))
                }
                className={cn(
                  "group flex min-h-20 w-full cursor-pointer items-center justify-between gap-6 bg-sand px-5 py-4 text-left transition-colors duration-200 sm:px-7 lg:py-5",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-burgundy",
                  "[@media(hover:hover)]:hover:bg-stone/45",
                )}
              >
                <span className={titleClass}>{section.title}</span>
                <span className="flex shrink-0 items-center gap-4">
                  {section.hint ? (
                    <span className="hidden text-base text-ink-muted sm:inline">
                      {section.hint}
                    </span>
                  ) : null}
                  <span
                    aria-hidden
                    className={cn(
                      "relative grid size-11 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                      expanded
                        ? "border-burgundy bg-burgundy text-cream"
                        : "border-ink/30 bg-paper text-ink [@media(hover:hover)]:group-hover:border-ink/60",
                    )}
                  >
                    <i className="absolute block h-px w-4 bg-current" />
                    <i
                      className={cn(
                        "absolute block h-px w-4 bg-current transition-transform duration-300 ease-out",
                        expanded ? "rotate-0" : "rotate-90",
                      )}
                    />
                  </span>
                </span>
              </button>
            </h3>

            <DetailPanel
              id={panelId}
              labelledBy={`${panelId}-trigger`}
              expanded={expanded}
              onReveal={() =>
                setOpen((current) => revealSection(current, section.id))
              }
            >
              <div className={bodyClass}>{section.children}</div>
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
 *
 * Abrir y cerrar se anima en la altura, y por eso `hidden` ya no lo gobierna
 * React: si lo hiciera, el panel dejaría de existir en el mismo instante en
 * que empieza a cerrarse y no habría nada que animar. React solo pone el
 * estado inicial —lo que se sirve en el HTML— y desde ahí lo escribe esta
 * función sobre el nodo: se quita al empezar a abrir y se pone al terminar de
 * cerrar.
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
  // El estado con el que se sirvió el HTML. No cambia nunca: así React no
  // vuelve a escribir `hidden` por encima de lo que hace la animación.
  const [initiallyHidden] = useState(!expanded);
  const mounted = useRef(false);
  const running = useRef<Animation | null>(null);

  // En una ref para que cambiar el callback no vuelva a montar el efecto
  // que registra el listener. Se actualiza en su propio efecto, nunca
  // durante el render.
  const reveal = useRef(onReveal);
  useEffect(() => {
    reveal.current = onReveal;
  }, [onReveal]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    // La primera vez el HTML ya viene en su estado: nada que animar.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const hide = () =>
      node.setAttribute("hidden", "onbeforematch" in node ? "until-found" : "");

    // Desde la altura que tenga ahora, no desde la del reposo: si se pulsa a
    // media animación, la nueva parte de donde va y no da un salto.
    const from = node.getBoundingClientRect().height;
    running.current?.cancel();
    running.current = null;

    if (expanded) {
      node.removeAttribute("hidden");
      if (prefersReducedMotion()) return;
      const to = node.scrollHeight;
      if (from === to) return;
      node.style.overflow = "hidden";
      const animation = node.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: DURATION, easing: EASE },
      );
      running.current = animation;
      const done = () => {
        node.style.overflow = "";
        if (running.current === animation) running.current = null;
      };
      animation.onfinish = done;
      animation.oncancel = done;
      return;
    }

    if (prefersReducedMotion() || from === 0) {
      hide();
      return;
    }
    node.style.overflow = "hidden";
    const animation = node.animate(
      [{ height: `${from}px` }, { height: "0px" }],
      // `forwards`: entre que termina y se oculta, no debe volver a su
      // altura natural ni por un fotograma.
      { duration: DURATION, easing: EASE, fill: "forwards" },
    );
    running.current = animation;
    animation.onfinish = () => {
      hide();
      node.style.overflow = "";
      animation.cancel();
      if (running.current === animation) running.current = null;
    };
    // Cancelada porque se volvió a abrir: no hay que ocultar nada.
    animation.oncancel = () => {
      node.style.overflow = "";
    };
  }, [expanded]);

  // Lo que se sirvió cerrado pasa de `hidden` a `hidden="until-found"` una vez,
  // al montar. Cada cierre posterior lo hace la animación al terminar: si se
  // hiciera aquí, el contenido dejaría de dibujarse en el primer fotograma y no
  // habría nada que ver encogerse.
  useEffect(() => {
    const node = ref.current;
    if (!node || !("onbeforematch" in node)) return;
    if (node.hasAttribute("hidden")) node.setAttribute("hidden", "until-found");
  }, []);

  // Buscar texto en la página revela la sección que lo contiene.
  useEffect(() => {
    const node = ref.current;
    if (!node || expanded || !("onbeforematch" in node)) return;
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
      hidden={initiallyHidden}
    >
      {children}
    </div>
  );
}
