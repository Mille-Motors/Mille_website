"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SEARCH_MAX_LENGTH,
  inventoryHref,
  type InventoryFilters,
} from "@/lib/filters";

/**
 * El buscador del inventario: lo que alguien escribe cuando ya sabe más o
 * menos qué busca. Marca, modelo, versión o una palabra clave —«enchufable»,
 * «techo panorámico», «rojo»—.
 *
 * Como el resto de los filtros, no tiene estado propio más allá de lo que se
 * está tecleando: al enviar calcula la URL siguiente y navega. Recargar,
 * volver o pegar el enlace dan lo mismo. Buscar suma a los demás filtros —los
 * conserva— y vuelve a la página 1 del resultado.
 *
 * Se envía con Intro o con el botón. No busca mientras se teclea: cada letra
 * sería un viaje al servidor y una rejilla que parpadea.
 */
export function InventorySearch({ filters }: { filters: InventoryFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(filters.q ?? "");

  // Si la URL cambia por otra vía —atrás, quitar la ficha de la búsqueda— el
  // campo la sigue. Se deriva durante el render y no con un efecto, que
  // encadenaría un segundo render en cada navegación.
  const [seen, setSeen] = useState(filters.q);
  if (seen !== filters.q) {
    setSeen(filters.q);
    setValue(filters.q ?? "");
  }

  function search(text: string) {
    const q = text.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
    startTransition(() =>
      router.push(inventoryHref({ ...filters, q: q || undefined }), {
        scroll: false,
      }),
    );
  }

  return (
    <form
      role="search"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        search(value);
      }}
      className={cn(
        "flex h-14 items-center gap-2 rounded-full border border-ink/12 bg-paper pr-2 pl-5 transition-colors focus-within:border-burgundy/60 sm:h-16 sm:pl-6",
        pending && "opacity-70",
      )}
    >
      <Search
        aria-hidden
        strokeWidth={1.4}
        className="size-5 shrink-0 text-ink-muted sm:size-6"
      />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={SEARCH_MAX_LENGTH}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-label="Buscar por marca, modelo, versión o palabra clave"
        placeholder="Buscar marca, modelo, versión o palabra clave…"
        className="h-full min-w-0 flex-1 bg-transparent px-1 text-base text-ink placeholder:text-ink-muted/80 focus:outline-none sm:text-[1.125rem]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            // Vaciar y buscar de nuevo es lo mismo que quitar la búsqueda, y
            // lo que se espera al pulsar la cruz.
            if (filters.q) search("");
          }}
          aria-label="Borrar la búsqueda"
          className="press inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink"
        >
          <X aria-hidden className="size-4" strokeWidth={1.6} />
        </button>
      ) : null}
      <button
        type="submit"
        className="press inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-burgundy px-5 text-base font-medium text-cream hover:bg-burgundy-dark sm:h-12 sm:px-8"
      >
        Buscar
      </button>
    </form>
  );
}
