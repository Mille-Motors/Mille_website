import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { WhatsappClickStats } from "@/server/whatsapp/service";

/**
 * Cuántas veces se tocó el botón de WhatsApp. Un clic no es una conversación:
 * es la intención de escribir, y es lo que el sitio puede saber desde afuera.
 * Las conversaciones de verdad viven en la app de WhatsApp Business.
 */
export function WhatsappStats({ stats }: { stats: WhatsappClickStats }) {
  const figures = [
    { label: "Últimos 7 días", value: stats.last7Days },
    { label: "Últimos 30 días", value: stats.last30Days },
    { label: "Desde que se mide", value: stats.total },
  ];

  return (
    <section className="mt-12" aria-labelledby="wa-stats-title">
      <div className="mb-5 flex items-center gap-3">
        <MessageCircle
          aria-hidden
          strokeWidth={1.2}
          className="size-5 text-ink-muted"
        />
        <h2 id="wa-stats-title" className="font-display text-2xl text-ink">
          Clics a WhatsApp
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ul className="grid gap-4 sm:grid-cols-3">
          {figures.map((item) => (
            <li
              key={item.label}
              className="border border-stone bg-paper px-5 py-5"
            >
              <p className="font-display text-3xl leading-none text-ink tabular">
                {item.value}
              </p>
              <p className="mt-2 font-serif text-sm text-ink-muted">
                {item.label}
              </p>
            </li>
          ))}
        </ul>

        <div className="border border-stone bg-paper px-5 py-5">
          <p className="label-caps text-ink-muted">
            Vehículos que más preguntas mueven · 30 días
          </p>
          {stats.topVehicles.length > 0 ? (
            <ol className="mt-3 divide-y divide-stone">
              {stats.topVehicles.map((row) => (
                <li
                  key={row.slug}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <Link
                    href={`/vehiculos/${row.slug}`}
                    className="min-w-0 truncate font-serif text-[0.9375rem] text-ink transition-colors hover:text-burgundy"
                  >
                    {row.slug}
                  </Link>
                  <span className="font-display text-lg text-burgundy tabular">
                    {row.clicks}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 font-serif text-sm text-ink-muted">
              Todavía nadie ha escrito desde la ficha de un vehículo.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
