"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Car, MessageCircle, Search, X } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";
import { intentWhatsappUrl, type WhatsappIntent } from "@/lib/whatsapp";
import { attentionStatus, type AttentionStatus } from "@/lib/whatsapp-hours";

/**
 * El botón de WhatsApp abajo a la derecha, en todo el sitio público.
 *
 * Dos formas, según dónde esté la persona:
 *
 *  · En cualquier página: abre un menú corto con cuatro motivos
 *    —buscar, hablar de su vehículo, agendar una cita, otra consulta—. Cada
 *    uno abre WhatsApp con su mensaje ya escrito, así que quien contesta sabe
 *    desde la primera línea con quién habla.
 *
 *  · En la ficha de un vehículo: va directo, sin menú, con el vehículo ya
 *    elegido en el mensaje (`direct`). La ficha lo pinta ella misma, y esta
 *    versión de layout se retira de esa ruta para no duplicarse.
 *
 * Sigue el sistema de la marca: esquinas rectas, burgundy sobre crema y la
 * misma sombra discreta de las tarjetas. Es el mismo color que ya tienen los
 * botones de WhatsApp del sitio.
 *
 * Mientras `site.phone` no exista no pinta nada: nunca un botón que abra un
 * número de mentira.
 */

const VEHICLE_PAGE = /^\/vehiculos\/[^/]+\/?$/;

const options: {
  intent: WhatsappIntent;
  icon: typeof Search;
  title: string;
  hint: string;
}[] = [
  {
    intent: "buscar",
    icon: Search,
    title: "Busco un carro o una moto",
    hint: "Cuéntanos qué te mueve",
  },
  {
    intent: "vender",
    icon: Car,
    title: "Quiero hablar de mi vehículo",
    hint: "Cuéntanos de tu carro o tu moto",
  },
  {
    intent: "cita",
    icon: CalendarDays,
    title: "Agendar una cita",
    hint: "Visitamos solo con cita previa",
  },
  {
    intent: "general",
    icon: MessageCircle,
    title: "Otra consulta",
    hint: "Escríbenos lo que necesites",
  },
];

const position =
  "fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]";

const button =
  "inline-flex h-14 items-center justify-center gap-3 rounded-xs bg-burgundy px-[1.0625rem] text-cream shadow-raised transition-colors duration-200 hover:bg-burgundy-dark";

export function WhatsappFloat({
  direct,
}: {
  /** Solo la ficha de un vehículo: lleva directo al chat de ESE vehículo. */
  direct?: { href: string; label: string; slug: string };
}) {
  const pathname = usePathname();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // Abierto "en esta ruta": al navegar deja de coincidir y se cierra solo, sin
  // un efecto que corrija el estado después.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [status, setStatus] = useState<AttentionStatus | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpenOn(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      toggle.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const phone = site.phone;
  if (!phone) return null;

  if (direct) {
    return (
      <a
        href={direct.href}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={direct.label}
        data-wa-source="vehicle-float"
        data-wa-intent="vehiculo"
        data-wa-slug={direct.slug}
        className={cn(position, button, "hidden lg:inline-flex")}
      >
        <WhatsappIcon className="size-6" strokeWidth={1.4} />
        <span className="label-caps">Escríbenos</span>
      </a>
    );
  }

  // La ficha trae su propio botón directo.
  if (VEHICLE_PAGE.test(pathname)) return null;

  return (
    <div ref={root} className={position}>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 bottom-full mb-3 w-[min(21rem,calc(100vw-2rem))] border border-stone bg-paper shadow-raised transition duration-200 ease-out starting:translate-y-2 starting:opacity-0"
        >
          <div className="border-b border-stone px-5 pt-5 pb-4">
            <p className="eyebrow text-burgundy">Escríbenos por WhatsApp</p>
            <p className="mt-2.5 font-serif text-[0.9375rem] leading-snug text-ink-soft">
              {status?.text ?? phone.hours.label}
            </p>
          </div>
          <ul>
            {options.map(({ intent, icon: Icon, title, hint }) => (
              <li key={intent} className="border-b border-stone last:border-b-0">
                <a
                  href={intentWhatsappUrl(intent) ?? undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-wa-source="float"
                  data-wa-intent={intent}
                  // Se cierra DESPUÉS del clic, no durante él: si el menú se
                  // desmonta ahora, el enlace sale del documento antes de que
                  // el navegador lo siga y WhatsApp no se abre.
                  onClick={() => window.setTimeout(() => setOpenOn(null), 120)}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sand/60"
                >
                  <Icon
                    aria-hidden
                    strokeWidth={1.4}
                    className="size-5 shrink-0 text-burgundy"
                  />
                  <span className="min-w-0">
                    <span className="block font-display text-[1.1875rem] leading-tight text-ink">
                      {title}
                    </span>
                    <span className="mt-0.5 block font-serif text-[0.875rem] text-ink-muted">
                      {hint}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Cerrar opciones de WhatsApp" : "Escribir a MILLE por WhatsApp"}
        onClick={() => {
          if (open) {
            setOpenOn(null);
            return;
          }
          // La hora se lee aquí, en el clic, nunca en el render: el servidor y
          // el navegador no tienen por qué coincidir en qué hora es.
          setStatus(attentionStatus(phone.hours));
          setOpenOn(pathname);
        }}
        className={cn(button, "cursor-pointer")}
      >
        {open ? (
          <X aria-hidden className="size-6" strokeWidth={1.4} />
        ) : (
          <WhatsappIcon className="size-6" strokeWidth={1.4} />
        )}
        <span className="label-caps hidden lg:inline">
          {open ? "Cerrar" : "Escríbenos"}
        </span>
      </button>
    </div>
  );
}
