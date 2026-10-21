"use client";

import { objectPosition } from "@/lib/focal-point";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  Car,
  ExternalLink,
  FileText,
  Plus,
  SearchX,
  Star,
} from "lucide-react";
import { ActionMenu, type MenuEntry } from "@/components/admin/ActionMenu";
import {
  buttonClass as control,
  buttonPrimaryClass as controlPrimary,
  Checkbox,
  EmptyPanel,
  Spinner,
} from "@/components/admin/kit";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { adminJson, type AdminResult } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { formatCOP, formatDateShort, vehicleLabel } from "@/lib/format";
import { copyText, vehiclePublicUrl } from "@/lib/share";
import type { AvailabilityStatus, PublicationStatus, Vehicle } from "@/types/vehicle";

/**
 * Tres cosas distintas que antes se pintaban como tres insignias juntas, y
 * que aquí tienen cada una su sitio:
 *
 *   · la PUBLICACIÓN (borrador, archivado) es el color de la fila y una
 *     pestaña que cuelga de su esquina; un publicado no lleva nada;
 *   · la DISPONIBILIDAD (disponible, reservado, vendido) es la única cosa
 *     que dice la columna «Estado»;
 *   · DESTACADO es una estrella que se pulsa, no una etiqueta que se lee.
 */

type Feedback = { tone: "error" | "info"; text: string };

/**
 * Las acciones de una fila.
 *
 * Cada una llama a su endpoint y después hace `router.refresh()`: la
 * pantalla se repinta desde la base, así que lo que se ve después de pulsar
 * es lo que realmente quedó guardado. La única excepción es la estrella, que
 * se enciende al instante y vuelve atrás si el servidor la rechaza: es un
 * interruptor de un solo dato y esperar ida y vuelta se sentía roto.
 * Si algo falla se dice en la fila y el estado no se mueve.
 */
function useVehicleActions(vehicle: Vehicle) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // El valor que la estrella enseña mientras se guarda, atado al valor que
  // tenía el vehículo al pulsarla. En cuanto la base devuelve otro, deja de
  // aplicar sola, sin efectos que sincronizar.
  const [override, setOverride] = useState<{ base: boolean; value: boolean } | null>(
    null,
  );

  const featured =
    override && override.base === vehicle.featured
      ? override.value
      : vehicle.featured;

  async function run<T>(
    key: string,
    call: () => Promise<AdminResult<T>>,
  ): Promise<AdminResult<T>> {
    setPending(key);
    setFeedback(null);
    const result = await call();
    setPending(null);
    if (!result.ok) {
      setFeedback({
        tone: "error",
        text: result.message || "No se pudo completar.",
      });
    }
    return result;
  }

  async function setPublication(publication: PublicationStatus) {
    if (pending) return;
    const result = await run(`pub-${publication}`, () =>
      adminJson(`/api/admin/vehicles/${vehicle.id}/publish`, "POST", {
        publication,
      }),
    );
    if (result.ok) router.refresh();
  }

  async function setAvailability(availability: AvailabilityStatus) {
    if (pending) return;
    const result = await run(`av-${availability}`, () =>
      adminJson(`/api/admin/vehicles/${vehicle.id}/availability`, "POST", {
        availability,
      }),
    );
    if (result.ok) router.refresh();
  }

  async function toggleFeatured() {
    if (pending) return;
    const next = !featured;
    setOverride({ base: vehicle.featured, value: next });
    const result = await run("featured", () =>
      adminJson(`/api/admin/vehicles/${vehicle.id}`, "PATCH", {
        featured: next,
      }),
    );
    if (!result.ok) {
      setOverride(null);
      return;
    }
    router.refresh();
  }

  /** El enlace público de la ficha, para pegarlo en Instagram o en un mensaje. */
  async function copyLink() {
    const copied = await copyText(vehiclePublicUrl(vehicle.slug));
    setFeedback(
      copied
        ? { tone: "info", text: "Enlace copiado." }
        : { tone: "error", text: "No se pudo copiar el enlace." },
    );
  }

  async function remove() {
    if (pending) return;
    const result = await run("delete", () =>
      adminJson<{ archived: boolean }>(
        `/api/admin/vehicles/${vehicle.id}`,
        "DELETE",
      ),
    );
    if (!result.ok) return;
    // Con solicitudes colgando el servicio archiva en vez de borrar; el
    // vehículo sigue en la lista y hay que decir por qué.
    if (result.data?.archived) {
      setFeedback({
        tone: "info",
        text: "Tenía solicitudes: se archivó en vez de borrarse.",
      });
    }
    router.refresh();
  }

  return {
    pending,
    feedback,
    featured,
    setPublication,
    setAvailability,
    toggleFeatured,
    copyLink,
    remove,
  };
}

type Actions = ReturnType<typeof useVehicleActions>;

/**
 * La miniatura de una fila.
 *
 * Exportada porque es lo que se puede probar sin montar la tabla entera,
 * que necesita el router. Lo que hay que fijar aquí es que el encuadre
 * llegue al `object-position`: era la única superficie del proyecto que
 * recortaba siempre por el centro.
 */
export function Thumb({
  vehicle,
  className,
}: {
  vehicle: Vehicle;
  className: string;
}) {
  const cover = vehicle.images[0];
  return (
    <span className={cn("relative block overflow-hidden bg-sand", className)}>
      {cover ? (
        <Image
          src={cover.src}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
          // El mismo encuadre que la ficha, la tarjeta y la rejilla de fotos.
          // Era la única superficie que recortaba por el centro pasara lo que
          // pasara, así que una portada desplazada se veía aquí de otra forma.
          style={{ objectPosition: objectPosition(cover.focal) }}
        />
      ) : (
        // Un borrador al que todavía no se le han subido fotos.
        <span className="absolute inset-0 flex items-center justify-center text-ink-muted/60">
          <Car aria-hidden className="size-6" strokeWidth={1.2} />
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Piezas de una fila
// ---------------------------------------------------------------------------

/** Año | carrocería · carro o moto. Un borrador puede no tener algo de eso. */
function VehicleMeta({ vehicle }: { vehicle: Vehicle }) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
      {vehicle.year !== null ? (
        <>
          <span className="tabular">{vehicle.year}</span>
          <span aria-hidden className="h-3 w-px bg-stone-strong" />
        </>
      ) : null}
      <span>
        {vehicle.category ? vehicle.category.name : "Sin carrocería"} ·{" "}
        {vehicle.vehicleType === "moto" ? "Moto" : "Carro"}
      </span>
    </p>
  );
}

function RowFeedback({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.tone === "error" ? "alert" : "status"}
      className={cn(
        "mt-1.5 text-sm leading-snug",
        feedback.tone === "error" ? "text-burgundy" : "text-ink-soft",
      )}
    >
      {feedback.text}
    </p>
  );
}

function Price({ vehicle }: { vehicle: Vehicle }) {
  // Un borrador puede no tener precio todavía, y decirlo es más útil que
  // enseñar "$ 0".
  return vehicle.price === null ? (
    <span className="text-ink-muted">Sin precio</span>
  ) : (
    <span className="tabular">{formatCOP(vehicle.price)}</span>
  );
}

/**
 * Lo que cuelga de la esquina superior derecha de la fila: la pestaña con la
 * publicación (solo si no está publicado) y la estrella de destacado.
 *
 * Todo en la esquina y nada en la columna Estado: el color de la fila ya dice
 * «borrador»; la pestaña lo confirma con una palabra.
 */
function CornerMarks({
  vehicle,
  actions,
}: {
  vehicle: Vehicle;
  actions: Actions;
}) {
  const { featured, pending } = actions;
  const name = vehicleLabel(vehicle);
  const tag =
    vehicle.publication === "draft"
      ? {
          label: "Borrador",
          icon: <FileText aria-hidden className="size-3.5" strokeWidth={1.7} />,
          tab: "bg-draft-strong text-draft-ink",
          edge: "border-draft-line",
        }
      : vehicle.publication === "archived"
        ? {
            label: "Archivado",
            icon: <Archive aria-hidden className="size-3.5" strokeWidth={1.7} />,
            tab: "bg-sand text-ink-soft",
            edge: "border-stone",
          }
        : null;

  const hint = featured ? "Quitar de destacados" : "Marcar como destacado";

  return (
    <div
      className={cn(
        "absolute top-0 right-0 z-10 flex h-8 items-stretch",
        tag && cn("rounded-bl-xl border-b border-l", tag.edge),
      )}
    >
      {tag ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-bl-xl px-3 text-[0.8125rem] font-medium",
            tag.tab,
          )}
        >
          {tag.icon}
          {tag.label}
        </span>
      ) : null}

      <span className="group/star relative flex">
        <button
          type="button"
          aria-pressed={featured}
          aria-label={`${hint}: ${name}`}
          disabled={pending !== null}
          onClick={actions.toggleFeatured}
          className={cn(
            "press inline-flex size-8 cursor-pointer items-center justify-center transition-colors disabled:cursor-progress",
            tag ? `border-l bg-paper ${tag.edge}` : "rounded-bl-lg",
            featured
              ? "text-burgundy hover:bg-burgundy/8"
              : "text-ink-muted/70 hover:bg-burgundy/8 hover:text-burgundy",
          )}
        >
          {pending === "featured" ? (
            <Spinner />
          ) : (
            <Star
              aria-hidden
              className={cn("size-4", featured && "fill-current")}
              strokeWidth={1.6}
            />
          )}
        </button>
        {/* Al lado y no encima: la tabla recorta lo que se sale por arriba. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-full mr-1.5 -translate-y-1/2 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-cream opacity-0 transition-opacity duration-150 group-hover/star:opacity-100 group-hover/star:delay-300 group-has-[:focus-visible]/star:opacity-100"
        >
          {hint}
        </span>
      </span>
    </div>
  );
}

/** Los menús dependen del estado, y lo que ya es un botón no se repite. */
function menuItems(vehicle: Vehicle, actions: Actions): MenuEntry[] {
  const items: MenuEntry[] = [];

  // Solo lo publicado tiene una dirección que funcione: el sitio público
  // únicamente sirve PUBLISHED, y un enlace a un borrador daría un 404.
  if (vehicle.publication === "published") {
    items.push(
      { label: "Copiar enlace público", onSelect: () => void actions.copyLink() },
      { kind: "separator" },
    );
  }

  // El camino natural es disponible → reservado → vendido, así que desde
  // «reservado» se puede vender directamente. Lo que se deshace —liberar una
  // reserva, reabrir una venta— vuelve siempre a «disponible».
  if (vehicle.availability === "available") {
    items.push(
      { label: "Reservar", onSelect: () => actions.setAvailability("reserved") },
      { label: "Marcar vendido", onSelect: () => actions.setAvailability("sold") },
    );
  } else if (vehicle.availability === "reserved") {
    items.push(
      { label: "Marcar vendido", onSelect: () => actions.setAvailability("sold") },
      {
        label: "Marcar disponible",
        onSelect: () => actions.setAvailability("available"),
      },
    );
  } else {
    items.push({
      label: "Marcar disponible",
      onSelect: () => actions.setAvailability("available"),
    });
  }

  if (vehicle.publication === "published") {
    items.push({
      label: "Despublicar",
      onSelect: () => actions.setPublication("draft"),
    });
  }
  if (vehicle.publication !== "archived") {
    items.push({
      label: "Archivar",
      onSelect: () => actions.setPublication("archived"),
    });
  }

  items.push(
    { kind: "separator" },
    {
      label: "Eliminar",
      danger: true,
      confirm: {
        title: "¿Eliminar este vehículo?",
        description:
          "Se borran también sus fotos. Si ya recibió solicitudes, se archiva en vez de borrarse.",
        confirmLabel: "Sí, eliminar",
      },
      onSelect: actions.remove,
    },
  );
  return items;
}

/** Editar, Publicar (o Ver, si ya está publicado) y el menú. */
function RowControls({
  vehicle,
  actions,
  className,
  fill,
}: {
  vehicle: Vehicle;
  actions: Actions;
  className?: string;
  /** En tarjetas de teléfono, los dos botones de texto se reparten el ancho. */
  fill?: boolean;
}) {
  const { pending } = actions;
  const busy = pending !== null;
  const name = vehicleLabel(vehicle);
  const share = fill && "flex-1 sm:flex-none";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link
        href={`/admin/vehiculos/${vehicle.id}/editar`}
        aria-label={`Editar ${name}`}
        className={cn(control, "px-4", share)}
      >
        Editar
      </Link>

      {vehicle.publication !== "published" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => actions.setPublication("published")}
          aria-label={`Publicar ${name}`}
          className={cn(control, controlPrimary, "min-w-24 px-4", share)}
        >
          {pending === "pub-published" ? <Spinner /> : null}
          Publicar
        </button>
      ) : (
        <a
          href={`/vehiculos/${vehicle.slug}`}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Ver ${name} en el sitio`}
          className={cn(control, "min-w-24 px-4", share)}
        >
          Ver
          <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.6} />
        </a>
      )}

      <ActionMenu
        label={`Más acciones para ${name}`}
        disabled={busy}
        items={menuItems(vehicle, actions)}
        triggerClassName={cn(control, "w-9 shrink-0 px-0")}
      />
    </div>
  );
}

/**
 * El color de una fila. Un borrador es crema amarillo; lo seleccionado se
 * tiñe de vinotinto por encima, que es lo que el administrador está haciendo
 * en ese momento.
 */
function rowTone(vehicle: Vehicle, selected: boolean) {
  return cn(
    "transition-colors",
    vehicle.publication === "draft"
      ? "bg-draft hover:bg-draft-strong/40"
      : "hover:bg-sand/45",
    selected && "bg-burgundy/6 hover:bg-burgundy/6",
  );
}

// ---------------------------------------------------------------------------
// Una fila de tabla y una tarjeta
// ---------------------------------------------------------------------------

function TableRow({
  vehicle,
  selected,
  onSelect,
  selectable,
}: {
  vehicle: Vehicle;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  selectable: boolean;
}) {
  const actions = useVehicleActions(vehicle);
  const archived = vehicle.publication === "archived";

  return (
    <tr
      aria-busy={actions.pending !== null}
      className={cn("h-22 border-b border-stone last:border-b-0", rowTone(vehicle, selected))}
    >
      {selectable ? (
        <td className="pl-2">
          <Checkbox
            checked={selected}
            onChange={onSelect}
            label={`Seleccionar ${vehicleLabel(vehicle)}`}
          />
        </td>
      ) : null}
      <td className={cn("py-3", selectable ? "px-2" : "pr-2 pl-5")}>
        <Thumb
          vehicle={vehicle}
          className={cn("h-16 w-24 rounded-lg", archived && "opacity-60 grayscale")}
        />
      </td>
      <td className="px-3 py-3">
        <Link
          href={`/admin/vehiculos/${vehicle.id}/editar`}
          className={cn(
            "line-clamp-2 text-base leading-snug font-semibold transition-colors hover:text-burgundy",
            archived ? "text-ink-soft" : "text-ink",
          )}
        >
          {vehicleLabel(vehicle)}
        </Link>
        <VehicleMeta vehicle={vehicle} />
        <RowFeedback feedback={actions.feedback} />
      </td>
      <td className="px-3 text-base font-medium text-ink">
        <Price vehicle={vehicle} />
      </td>
      <td className="px-3">
        <StatusPill status={vehicle.availability} size="sm" />
      </td>
      <td className="hidden px-3 text-sm whitespace-nowrap text-ink-muted tabular min-[1360px]:table-cell">
        {formatDateShort(vehicle.updatedAt)}
      </td>
      {/* La esquina pertenece a esta celda, que es la del borde derecho. Los
          botones van abajo para dejar libre la pestaña. */}
      <td className="relative pt-9 pr-4 pb-3.5 pl-3 align-bottom">
        <CornerMarks vehicle={vehicle} actions={actions} />
        <RowControls vehicle={vehicle} actions={actions} className="justify-end" />
      </td>
    </tr>
  );
}

function CardRow({
  vehicle,
  selected,
  onSelect,
  selectable,
}: {
  vehicle: Vehicle;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  selectable: boolean;
}) {
  const actions = useVehicleActions(vehicle);
  const archived = vehicle.publication === "archived";
  const tagged = vehicle.publication !== "published";

  return (
    <li
      aria-busy={actions.pending !== null}
      className={cn(
        "relative border-b border-stone py-4 last:border-b-0",
        selectable ? "pr-4 pl-1.5" : "px-4",
        // La pestaña ocupa la esquina: el contenido baja debajo de ella.
        tagged ? "pt-10" : "pt-4",
        rowTone(vehicle, selected),
      )}
    >
      <CornerMarks vehicle={vehicle} actions={actions} />
      <div className="flex items-start gap-1">
        {selectable ? (
          <Checkbox
            checked={selected}
            onChange={onSelect}
            label={`Seleccionar ${vehicleLabel(vehicle)}`}
          />
        ) : null}
        <Thumb
          vehicle={vehicle}
          className={cn("h-16 w-24 shrink-0 rounded-lg", archived && "opacity-60 grayscale")}
        />
        <div className={cn("min-w-0 flex-1 pl-2", !tagged && "pr-9")}>
          <Link
            href={`/admin/vehiculos/${vehicle.id}/editar`}
            className={cn(
              "line-clamp-2 text-base leading-snug font-semibold",
              archived ? "text-ink-soft" : "text-ink",
            )}
          >
            {vehicleLabel(vehicle)}
          </Link>
          <VehicleMeta vehicle={vehicle} />
        </div>
      </div>

      {/* En teléfono, el precio arriba y los botones repartidos debajo; en
          tablet caben en la misma línea. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3.5">
        <div
          className={cn(
            "flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start sm:gap-4",
            selectable && "pl-9",
          )}
        >
          <span className="text-base font-medium text-ink">
            <Price vehicle={vehicle} />
          </span>
          <StatusPill status={vehicle.availability} size="sm" />
        </div>
        <RowControls
          vehicle={vehicle}
          actions={actions}
          fill
          className="w-full sm:w-auto"
        />
      </div>
      <RowFeedback feedback={actions.feedback} />
    </li>
  );
}

// ---------------------------------------------------------------------------
// Selección y acciones en lote
// ---------------------------------------------------------------------------

type BulkReport = {
  done: number;
  failures: { id: string; name: string; text: string }[];
};

/**
 * Publicar o archivar varias de una vez, con los mismos endpoints que una
 * fila. Una a una y en orden: publicar valida cada vehículo por su cuenta, y
 * lo que no cumpla los requisitos se queda seleccionado con su motivo en vez
 * de abortar el resto. Eliminar no está aquí a propósito.
 */
function useBulkActions(vehicles: Vehicle[]) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<PublicationStatus | null>(null);
  const [report, setReport] = useState<BulkReport | null>(null);

  // Solo cuentan los de esta página: al cambiar de filtro o de página, lo que
  // ya no está a la vista no puede seguir seleccionado en silencio.
  const chosen = vehicles.filter((vehicle) => selected.has(vehicle.id));

  function toggle(id: string, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(vehicles.map((vehicle) => vehicle.id)) : new Set());
    setReport(null);
  }

  function clear() {
    setSelected(new Set());
    setReport(null);
  }

  async function apply(publication: "published" | "archived") {
    if (pending) return;
    const targets = chosen.filter((vehicle) => vehicle.publication !== publication);
    setPending(publication);
    setReport(null);

    const failures: BulkReport["failures"] = [];
    for (const vehicle of targets) {
      const result = await adminJson(
        `/api/admin/vehicles/${vehicle.id}/publish`,
        "POST",
        { publication },
      );
      if (!result.ok) {
        failures.push({
          id: vehicle.id,
          name: vehicleLabel(vehicle),
          text: result.message,
        });
      }
    }

    setPending(null);
    // Lo que falló se queda seleccionado, con su motivo a la vista.
    setSelected(new Set(failures.map((failure) => failure.id)));
    setReport(
      failures.length > 0
        ? { done: targets.length - failures.length, failures }
        : null,
    );
    router.refresh();
  }

  return { chosen, pending, report, toggle, toggleAll, clear, apply };
}

type Bulk = ReturnType<typeof useBulkActions>;

function BulkBar({ bulk }: { bulk: Bulk }) {
  const { chosen, pending } = bulk;
  const busy = pending !== null;
  const count = chosen.length;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="font-semibold text-ink" aria-live="polite">
        {count} {count === 1 ? "seleccionado" : "seleccionados"}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => bulk.apply("published")}
        className={cn(control, controlPrimary, "h-8 px-3.5")}
      >
        {pending === "published" ? <Spinner /> : null}
        Publicar
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => bulk.apply("archived")}
        className={cn(control, "h-8 px-3.5")}
      >
        {pending === "archived" ? <Spinner /> : null}
        Archivar
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={bulk.clear}
        className="rounded-md px-1.5 py-1 text-ink-muted underline-offset-4 transition-colors hover:text-burgundy hover:underline disabled:opacity-50"
      >
        Quitar selección
      </button>
    </div>
  );
}

function BulkReportNote({ report }: { report: BulkReport | null }) {
  if (!report) return null;
  return (
    <div
      role="alert"
      className="border-b border-stone bg-burgundy/5 px-5 py-3 text-sm text-burgundy"
    >
      <p className="font-medium">
        {report.failures.length === 1
          ? "Un vehículo no se pudo actualizar."
          : `${report.failures.length} vehículos no se pudieron actualizar.`}
        {report.done > 0 ? ` Se actualizaron ${report.done}.` : ""}
      </p>
      <ul className="mt-1 grid gap-0.5">
        {report.failures.map((failure) => (
          <li key={failure.id}>
            <span className="font-medium">{failure.name}:</span> {failure.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// La tabla
// ---------------------------------------------------------------------------

function EmptyList({ filtered }: { filtered: boolean }) {
  return (
    <EmptyPanel
      icon={
        filtered ? (
          <SearchX aria-hidden className="size-5" strokeWidth={1.5} />
        ) : (
          <Plus aria-hidden className="size-5" strokeWidth={1.5} />
        )
      }
      title={
        filtered
          ? "Ningún vehículo coincide con estos filtros"
          : "Aún no hay vehículos"
      }
      description={
        filtered
          ? "Prueba con otra búsqueda o quita algún filtro."
          : "Agrega el primero y aparecerá aquí."
      }
      action={
        filtered ? (
          <ButtonLink href="/admin/vehiculos" variant="outline" size="sm">
            Limpiar filtros
          </ButtonLink>
        ) : (
          <ButtonLink href="/admin/vehiculos/nuevo" size="sm">
            <Plus aria-hidden className="size-3.5" strokeWidth={1.6} />
            Nuevo vehículo
          </ButtonLink>
        )
      }
    />
  );
}

const th = "label-caps px-3 py-3 text-left font-medium text-ink-muted";

export function VehicleTable({
  vehicles,
  filtered = false,
  selectable = true,
}: {
  vehicles: Vehicle[];
  /** Hay filtros puestos: una lista vacía quiere decir otra cosa. */
  filtered?: boolean;
  /** El resumen del dashboard no es un sitio para actuar en lote. */
  selectable?: boolean;
}) {
  const bulk = useBulkActions(vehicles);

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-stone bg-paper">
        <EmptyList filtered={filtered} />
      </div>
    );
  }

  const allChosen = bulk.chosen.length === vehicles.length;
  const someChosen = bulk.chosen.length > 0;
  const headerCheckbox = (
    <Checkbox
      checked={allChosen}
      indeterminate={someChosen && !allChosen}
      onChange={bulk.toggleAll}
      label="Seleccionar todos los vehículos de esta página"
    />
  );

  return (
    <div className="overflow-hidden rounded-xl border border-stone bg-paper">
      <BulkReportNote report={bulk.report} />

      {/* Tabla en pantallas anchas */}
      <table className="hidden w-full table-fixed border-collapse xl:table">
        <caption className="sr-only">Inventario de vehículos</caption>
        {/* Los anchos viven aquí y no en las celdas: así no se mueven cuando
            la cabecera cambia por la barra de selección. */}
        <colgroup>
          {selectable ? <col className="w-12" /> : null}
          <col className={selectable ? "w-30" : "w-32"} />
          <col />
          <col className="w-36" />
          <col className="w-32" />
          <col className="hidden w-32 min-[1360px]:table-column" />
          <col className="w-64" />
        </colgroup>
        <thead>
          <tr className="h-12 border-b border-stone bg-sand/45">
            {selectable ? <th className="pl-2 text-left">{headerCheckbox}</th> : null}
            {selectable && someChosen ? (
              <>
                {/* Imagen, vehículo, precio y estado: ancho de sobra para la
                    barra. Las dos últimas columnas quedan en blanco. */}
                <th colSpan={4} className="px-3 text-left font-normal">
                  <BulkBar bulk={bulk} />
                </th>
                <th aria-hidden className="hidden min-[1360px]:table-cell" />
                <th aria-hidden />
              </>
            ) : (
              <>
                <th scope="col" className={cn(th, !selectable && "pl-5")}>
                  Imagen
                </th>
                <th scope="col" className={th}>
                  Vehículo
                </th>
                <th scope="col" className={th}>
                  Precio
                </th>
                <th scope="col" className={th}>
                  Estado
                </th>
                <th scope="col" className={cn(th, "hidden min-[1360px]:table-cell")}>
                  Actualizado
                </th>
                <th scope="col" className={cn(th, "pr-5 text-right")}>
                  Acciones
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <TableRow
              key={vehicle.id}
              vehicle={vehicle}
              selectable={selectable}
              selected={bulk.chosen.some((chosen) => chosen.id === vehicle.id)}
              onSelect={(on) => bulk.toggle(vehicle.id, on)}
            />
          ))}
        </tbody>
      </table>

      {/* Tarjetas por debajo de xl */}
      <div className="xl:hidden">
        {selectable ? (
          <div className="flex min-h-12 items-center gap-1 border-b border-stone bg-sand/45 pr-4 pl-1.5">
            {headerCheckbox}
            {someChosen ? (
              <BulkBar bulk={bulk} />
            ) : (
              <span className="text-sm text-ink-muted">Seleccionar todos</span>
            )}
          </div>
        ) : null}
        <ul>
          {vehicles.map((vehicle) => (
            <CardRow
              key={vehicle.id}
              vehicle={vehicle}
              selectable={selectable}
              selected={bulk.chosen.some((chosen) => chosen.id === vehicle.id)}
              onSelect={(on) => bulk.toggle(vehicle.id, on)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
