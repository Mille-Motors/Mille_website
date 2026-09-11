"use client";

import Link from "next/link";
import { Car, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAdminInventory } from "@/components/admin/AdminInventoryProvider";

export function StatCards() {
  const { stats } = useAdminInventory();

  const cards = [
    { label: "Total vehículos", value: stats.total, dot: null, href: "/admin/vehiculos" },
    {
      label: "Disponibles",
      value: stats.available,
      dot: "bg-status-available",
      href: "/admin/vehiculos?estado=available",
    },
    {
      label: "Vendidos",
      value: stats.sold,
      dot: "bg-status-sold",
      href: "/admin/vehiculos?estado=sold",
    },
    {
      label: "Borradores",
      value: stats.draft,
      dot: "bg-stone-strong",
      href: "/admin/vehiculos?estado=draft",
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <li key={card.label}>
          <Link
            href={card.href}
            className="group flex items-center gap-4 border border-stone bg-paper px-5 py-5 transition-colors hover:border-stone-strong"
          >
            {card.dot ? (
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", card.dot)} />
            ) : (
              <Car aria-hidden strokeWidth={1.2} className="size-6 shrink-0 text-ink-muted" />
            )}
            <div className="min-w-0">
              <p className="font-display text-3xl leading-none text-ink tabular">
                {card.value}
              </p>
              <p className="mt-2 font-serif text-sm text-ink-muted">{card.label}</p>
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
