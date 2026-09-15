import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { inventoryHref } from "@/lib/filters";

/**
 * A curated shortcut into the inventory, not a mirror of the taxonomy: five
 * car categories plus motos as a whole universe. Each one lands on a real
 * filtered view.
 *
 * Los slugs están escritos aquí a propósito: esta banda es una decisión
 * editorial sobre qué destacar, no un reflejo de la tabla de categorías. Si
 * una de ellas se renombra o se desactiva, el enlace sigue siendo válido y
 * cae en el estado vacío honesto del inventario.
 */
type Entry = {
  label: string;
  href: string;
  mark: React.ReactNode;
};

const entries: Entry[] = [
  {
    label: "SUV",
    href: inventoryHref({ tipo: "auto", categoria: "suv" }),
    mark: (
      <>
        {/* Techo alto y plano, voladizos cortos: lo que separa una SUV de un
            sedán a esta escala es la altura del habitáculo, no los detalles. */}
        <path d="M3.8 26V20.8c0-3.8 1.4-5.4 4.6-6l14.4-1.4c2.8-.2 4.2.8 5.8 3.4l4.4 1.1c2.6.6 3.6 2.1 3.7 4.6V26h-3.1a4.2 4.2 0 0 1-8.4 0H15a4.2 4.2 0 0 1-8.4 0Z" />
        <path d="M9.4 18.8c.1-2 .8-2.7 2.4-2.9l10-.9c1.8-.1 2.6.4 3.8 2l1.4 1.8Z" />
        <path d="M17.2 15.4v3.4" />
        <circle cx="29.4" cy="26" r="3.6" />
        <circle cx="29.4" cy="26" r="1.3" />
        <circle cx="10.8" cy="26" r="3.6" />
        <circle cx="10.8" cy="26" r="1.3" />
      </>
    ),
  },
  {
    label: "Sedanes",
    href: inventoryHref({ tipo: "auto", categoria: "sedan" }),
    mark: (
      <>
        {/* Tres volúmenes: maletero, habitáculo y capó se leen como tres
            tramos distintos de la misma línea de cintura. */}
        <path d="M3 26.8l.2-3.4c.1-1.8.9-2.7 2.8-3.1l4.6-.9c2.2-2.2 4-2.9 7-3h5.4c2.7.1 4.2.8 6 3l4.8 1c2.3.5 3.1 1.5 3.2 3.4v3h-3a3.4 3.4 0 0 1-6.8 0H13.8a3.4 3.4 0 0 1-6.8 0Z" />
        <path d="M11.8 19.6c1.8-1.7 3.1-2.2 5.7-2.3h5.4c2.2.1 3.4.6 4.9 2.3Z" />
        <path d="M19.6 17.3v2.3" />
        <circle cx="30.6" cy="26.8" r="3.2" />
        <circle cx="30.6" cy="26.8" r="1.2" />
        <circle cx="10.4" cy="26.8" r="3.2" />
        <circle cx="10.4" cy="26.8" r="1.2" />
      </>
    ),
  },
  {
    label: "Híbridos",
    href: inventoryHref({ tipo: "auto", categoria: "hibrido" }),
    mark: (
      <>
        {/* El coche mira a la izquierda para dejarle el sitio a la hoja, que
            brota donde iría el escape. La hoja acompaña al vehículo en vez de
            ser un sello de ecología pegado al lado. */}
        <path d="M2.4 26.8l.1-3.4c.1-1.8.9-2.7 2.9-3.2l4.6-1.2c2-2.3 3.7-3 6.5-3.1h4.8c2.8.1 4.4 1 5.7 3.5l1.3 2.4c.6 1.2.8 2.1.8 3.4v1.6h-2.9a3.4 3.4 0 0 0-6.8 0h-8a3.4 3.4 0 0 0-6.8 0Z" />
        <path d="M11.1 19.2c1.7-1.9 3-2.4 5.4-2.4h4.7c2.3.1 3.4.7 4.6 2.9Z" />
        <path d="M18.2 16.8v2.5" />
        <circle cx="22.8" cy="26.8" r="3.2" />
        <circle cx="22.8" cy="26.8" r="1.2" />
        <circle cx="8" cy="26.8" r="3.2" />
        <circle cx="8" cy="26.8" r="1.2" />
        <path d="M29.6 25c-.8-5.4 1.8-9.4 7.4-11.2 1 5.8-1.4 11-7.4 11.2Z" />
        <path d="M30.2 24.4c2-3 4-6.2 6-9" />
      </>
    ),
  },
  {
    label: "Eléctricos",
    href: inventoryHref({ tipo: "auto", categoria: "electrico" }),
    mark: (
      <>
        {/* Visto de frente: parabrisas, hombros, faros y el rayo ocupando el
            centro de la parrilla. El rayo es la parrilla, no una insignia
            suelta al lado de un coche. */}
        <path d="M11.8 18.2l2-5c.4-1 1.1-1.4 2.4-1.4h7.6c1.3 0 2 .4 2.4 1.4l2 5" />
        <path d="M8.4 29l-.4-6.8c-.1-2.2 1-3.8 3.2-4h17.6c2.2.2 3.3 1.8 3.2 4L31.6 29" />
        <path d="M10.2 22H13" />
        <path d="M27 22h2.8" />
        <path d="M22.2 20.2 17.4 26h3l-1.2 2.8 4.8-5.8h-3Z" />
      </>
    ),
  },
  {
    label: "Deportivos",
    href: inventoryHref({ tipo: "auto", categoria: "deportivo" }),
    mark: (
      <>
        {/* Cabina retrasada, capó largo y ruedas grandes: la misma anchura que
            el sedán pero visiblemente más bajo y más tendido. */}
        <path d="M2.8 26.4l.2-2.2c.1-1.3.8-2.1 2.3-2.5l2.9-.8c1.4-2.3 3.4-3.3 6.4-3.4h4c3 .2 5 1.1 7 3.1l6.8 1c3 .5 4.4 1.4 4.5 3v1.8h-3a3.6 3.6 0 0 1-7.2 0H13.4a3.6 3.6 0 0 1-7.2 0Z" />
        <path d="M9.4 20.7c1.2-1.8 2.8-2.4 5.3-2.4h3.8c2.4.1 3.9.7 5.5 2.6Z" />
        <circle cx="30.4" cy="26.4" r="3.6" />
        <circle cx="30.4" cy="26.4" r="1.3" />
        <circle cx="9.8" cy="26.4" r="3.6" />
        <circle cx="9.8" cy="26.4" r="1.3" />
      </>
    ),
  },
  {
    label: "Motos",
    href: inventoryHref({ tipo: "moto" }),
    mark: (
      <>
        {/* Deportiva de carenado: cúpula, quilla, horquilla y basculante. Las
            piezas van sueltas y los bajos quedan abiertos, que es lo que evita
            que la moto se lea como un bulto con dos ruedas. */}
        <circle cx="8.8" cy="26.6" r="4.3" />
        <circle cx="8.8" cy="26.6" r="1.6" />
        <circle cx="31" cy="26.6" r="4.3" />
        <circle cx="31" cy="26.6" r="1.6" />
        <path d="M23.8 18.6l3.7-3.3c2.1 2.6 3.3 5.6 3.3 8.7l-2.4.8c-.6-2.6-2.2-4.7-4.6-6.2Z" />
        <path d="M7.4 18.4l5.4 1.4c2.6-1.8 5.4-2.6 8.4-2.4l3 1.4" />
        <path d="M7.4 18.4l3.6 3.2 2.2-1.6" />
        <path d="M14.2 21.6l2.6 3.2 6 .2c2.6-.2 4.2-.8 5.4-1.8" />
        <path d="M26.6 17.8l4 7.4" />
        <path d="M16.8 24.8l-7.4 1.4" />
        <path d="M13.4 20.4l1.8 3.8" />
      </>
    ),
  },
];

export function CategoryBand() {
  return (
    <section aria-label="Categorías" className="border-y border-stone bg-cream">
      <Container width="wide">
        <ul className="grid grid-cols-3 sm:grid-cols-6">
          {entries.map((entry, index) => (
            <li
              key={entry.label}
              className={cn(
                "border-stone/70",
                // Three across on phones, six on tablet up: the dividers have
                // to follow whichever row each item lands in.
                index % 3 === 0 ? "border-l-0" : "border-l",
                index >= 3 && "border-t sm:border-t-0",
                "sm:border-l",
                index === 0 && "sm:border-l-0",
              )}
            >
              <Link
                href={entry.href}
                className="group flex h-full flex-col items-center justify-start gap-2.5 px-1 py-6 text-center transition-colors hover:bg-sand/50 sm:gap-3.5 sm:px-2 sm:py-10"
              >
                <svg
                  // 40 unidades en vez de 24: el doble de resolución para el
                  // dibujo sin engordar el trazo, que a 36 px acaba en 1,35 px.
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="size-6 text-ink-soft transition-colors group-hover:text-burgundy sm:size-9"
                >
                  {entry.mark}
                </svg>
                <span className="font-serif text-[0.6875rem] leading-tight text-ink-soft transition-colors group-hover:text-ink sm:text-base">
                  {entry.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
