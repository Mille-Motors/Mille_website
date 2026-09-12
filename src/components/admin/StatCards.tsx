import Link from "next/link";
import { Car, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InventoryStats } from "@/types/vehicle";

/**
 * Seis cifras, cada una con un enlace a la lista que las contiene. Nada de
 * gráficas: el dashboard interno tiene que contestar "¿qué hay y qué me
 * falta hacer?" de un vistazo.
 */
export function StatCards({ stats }: { stats: InventoryStats }) {
  const cards: {
    label: string;
    value: number;
    dot: string | null;
    icon?: typeof Car;
    href: string;
  }[] = [
    {
      label: "Total vehículos",
      value: stats.total,
      dot: null,
      icon: Car,
      href: "/admin/vehiculos",
    },
    {
      label: "Publicados",
      value: stats.published,
      dot: "bg-status-available",
      href: "/admin/vehiculos?publication=published",
    },
    {
      label: "Borradores",
      value: stats.draft,
      dot: "bg-stone-strong",
      href: "/admin/vehiculos?publication=draft",
    },
    {
      label: "Reservados",
      value: stats.reserved,
      dot: "bg-status-reserved",
      href: "/admin/vehiculos?availability=reserved",
    },
    {
      label: "Vendidos",
      value: stats.sold,
      dot: "bg-status-sold",
      href: "/admin/vehiculos?availability=sold",
    },
    {
      label: "Solicitudes nuevas",
      value: stats.newInquiries,
      dot: null,
      icon: Inbox,
      href: "/admin/solicitudes?status=new",
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <li key={card.label}>
          <Link
            href={card.href}
            className="group flex items-center gap-4 border border-stone bg-paper px-5 py-5 transition-colors hover:border-stone-strong"
          >
            {card.dot ? (
              <span
                aria-hidden
                className={cn("size-2.5 shrink-0 rounded-full", card.dot)}
              />
            ) : card.icon ? (
              <card.icon
                aria-hidden
                strokeWidth={1.2}
                className="size-6 shrink-0 text-ink-muted"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-display text-3xl leading-none text-ink tabular">
                {card.value}
              </p>
              <p className="mt-2 font-serif text-sm text-ink-muted">
                {card.label}
              </p>
            </div>
            <ChevronRight
              aria-hidden
              strokeWidth={1.3}
              className="ml-auto size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
