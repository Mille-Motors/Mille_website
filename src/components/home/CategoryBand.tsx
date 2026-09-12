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
        <path d="M3 15.5h18M5 15.5v-3.2l2.2-4.3h9.6l2.2 4.3v3.2" />
        <path d="M7.4 8v4.3h9.2V8" />
        <circle cx="8" cy="17.2" r="1.7" />
        <circle cx="16" cy="17.2" r="1.7" />
      </>
    ),
  },
  {
    label: "Sedanes",
    href: inventoryHref({ tipo: "auto", categoria: "sedan" }),
    mark: (
      <>
        <path d="M2.5 15.3h19M4.5 15.3v-2.4l2.3-3.6c.4-.6.8-.8 1.5-.8h7.4c.7 0 1.1.2 1.5.8l2.3 3.6v2.4" />
        <path d="M6.6 12.9h10.8" />
        <circle cx="7.6" cy="16.8" r="1.6" />
        <circle cx="16.4" cy="16.8" r="1.6" />
      </>
    ),
  },
  {
    label: "Híbridos",
    href: inventoryHref({ tipo: "auto", categoria: "hibrido" }),
    mark: (
      <>
        <path d="M12 21c0-5.5 2.2-9.4 6.5-11.6C19 14 17.2 19 12 21Z" />
        <path d="M12 21C12 15.5 9.8 11.6 5.5 9.4 5 14 6.8 19 12 21Z" />
        <path d="M12 21V12" />
      </>
    ),
  },
  {
    label: "Eléctricos",
    href: inventoryHref({ tipo: "auto", categoria: "electrico" }),
    mark: <path d="M13.4 2.5 5.8 13.4h4.9L9.9 21.5 18.2 10h-5.2l.4-7.5Z" />,
  },
  {
    label: "Deportivos",
    href: inventoryHref({ tipo: "auto", categoria: "deportivo" }),
    mark: (
      <>
        <path d="M2 15.2h20M3.8 15.2v-2l3.1-2.9c.5-.5 1-.7 1.7-.7h6.1c.9 0 1.5.3 2.2.9l3.1 2.7v2" />
        <path d="M8 9.6l1-2.1h5.2l1.9 2.1" />
        <circle cx="7" cy="16.6" r="1.5" />
        <circle cx="17" cy="16.6" r="1.5" />
      </>
    ),
  },
  {
    label: "Motos",
    href: inventoryHref({ tipo: "moto" }),
    mark: (
      <>
        <circle cx="5.4" cy="16" r="3.2" />
        <circle cx="18.6" cy="16" r="3.2" />
        <path d="M5.4 16h4.1l3.3-5h4.2" />
        <path d="M12.8 11L11 7.6h2.9" />
        <path d="M15.3 16l1.5-3.4" />
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
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.1}
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
