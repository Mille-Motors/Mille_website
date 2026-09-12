"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublicationPill } from "@/components/ui/PublicationPill";
import { StatusPill } from "@/components/ui/StatusPill";
import { adminJson } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { formatCOP, formatDate, vehicleTitle } from "@/lib/format";
import type { AvailabilityStatus, PublicationStatus, Vehicle } from "@/types/vehicle";

/**
 * Acciones de una fila.
 *
 * Cada una llama a su endpoint y después hace `router.refresh()`: la
 * pantalla se repinta desde la base, así que lo que se ve después de pulsar
 * es lo que realmente quedó guardado y no una suposición optimista. Si algo
 * falla, se dice en la fila y el estado no se mueve.
 */
function RowActions({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(
    key: string,
    call: () => Promise<{ ok: boolean; message?: string }>,
  ) {
    if (pending) return;
    setPending(key);
    setError(null);
    const result = await call();
    setPending(null);
    if (!result.ok) {
      setError(result.message ?? "No se pudo completar.");
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  const setPublication = (publication: PublicationStatus) =>
    run(`pub-${publication}`, () =>
      adminJson(`/api/admin/vehicles/${vehicle.id}/publish`, "POST", {
        publication,
      }),
    );

  const setAvailability = (availability: AvailabilityStatus) =>
    run(`av-${availability}`, () =>
      adminJson(`/api/admin/vehicles/${vehicle.id}/availability`, "POST", {
        availability,
      }),
    );

  const action = cn(
    "label-caps rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors",
    "hover:border-ink/40 disabled:opacity-40",
  );

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="font-serif text-xs text-ink-muted">
          ¿Eliminar este vehículo?
        </span>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() =>
            run("delete", () =>
              adminJson(`/api/admin/vehicles/${vehicle.id}`, "DELETE"),
            )
          }
          className="label-caps rounded-xs bg-burgundy px-2.5 py-1.5 text-[10px] text-cream disabled:opacity-40"
        >
          {pending === "delete" ? "…" : "Sí"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="label-caps rounded-xs border border-stone px-2.5 py-1.5 text-[10px] text-ink"
        >
          No
        </button>
        {error ? (
          <p role="alert" className="w-full text-right text-xs text-burgundy">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`/admin/vehiculos/${vehicle.id}/editar`}
        className={action}
      >
        Editar
      </Link>

      {vehicle.publication === "published" ? (
        <>
          <a
            href={`/vehiculos/${vehicle.slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(action, "inline-flex items-center gap-1.5")}
          >
            Ver
            <ExternalLink aria-hidden className="size-3" strokeWidth={1.5} />
          </a>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => setPublication("draft")}
            className={action}
          >
            {pending === "pub-draft" ? "…" : "Despublicar"}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setPublication("published")}
          className={action}
        >
          {pending === "pub-published" ? "…" : "Publicar"}
        </button>
      )}

      {vehicle.availability === "available" ? (
        <>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => setAvailability("reserved")}
            className={action}
          >
            {pending === "av-reserved" ? "…" : "Reservar"}
          </button>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => setAvailability("sold")}
            className={action}
          >
            {pending === "av-sold" ? "…" : "Vendido"}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setAvailability("available")}
          className={action}
        >
          {pending === "av-available" ? "…" : "Marcar disponible"}
        </button>
      )}

      {vehicle.publication !== "archived" ? (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setPublication("archived")}
          className={action}
        >
          {pending === "pub-archived" ? "…" : "Archivar"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Eliminar ${vehicleTitle(vehicle)}`}
        className="inline-flex size-8 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/40 hover:text-burgundy"
      >
        <Trash2 aria-hidden className="size-3.5" strokeWidth={1.4} />
      </button>

      {error ? (
        <p role="alert" className="w-full text-right text-xs text-burgundy">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Thumb({ vehicle, className }: { vehicle: Vehicle; className: string }) {
  const cover = vehicle.images[0];
  return (
    <span className={cn("relative block overflow-hidden bg-sand", className)}>
      <Image
        src={cover.src}
        alt=""
        fill
        sizes="96px"
        className="object-cover"
      />
    </span>
  );
}

function Pills({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <PublicationPill status={vehicle.publication} />
      <StatusPill status={vehicle.availability} />
      {vehicle.featured ? (
        <span className="label-caps rounded-xs border border-burgundy/30 bg-burgundy/5 px-2.5 py-1.5 text-[10px] text-burgundy">
          Destacado
        </span>
      ) : null}
    </div>
  );
}

export function VehicleTable({ vehicles }: { vehicles: Vehicle[] }) {
  if (vehicles.length === 0) {
    return (
      <div className="border border-stone bg-paper">
        <EmptyState
          icon={<Plus aria-hidden className="size-9" strokeWidth={0.9} />}
          title="No hay vehículos que mostrar."
          description="Ajusta los filtros, o agrega tu primer vehículo."
          actions={
            <ButtonLink href="/admin/vehiculos/nuevo" size="lg">
              Agregar vehículo
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="border border-stone bg-paper">
      {/* Tabla completa en pantallas anchas */}
      <table className="hidden w-full border-collapse xl:table">
        <thead>
          <tr className="border-b border-stone bg-sand/60">
            {["Imagen", "Vehículo", "Año", "Precio", "Estado", "Actualizado", "Acciones"].map(
              (heading, index) => (
                <th
                  key={heading}
                  scope="col"
                  className={cn(
                    "label-caps px-5 py-3.5 text-ink-muted",
                    index === 6 ? "text-right" : "text-left",
                  )}
                >
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone">
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td className="px-5 py-3.5">
                <Thumb vehicle={vehicle} className="h-12 w-20" />
              </td>
              <td className="px-5 py-3.5">
                <Link
                  href={`/admin/vehiculos/${vehicle.id}/editar`}
                  className="font-serif text-[0.9375rem] text-ink transition-colors hover:text-burgundy"
                >
                  {vehicleTitle(vehicle)}
                </Link>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {vehicle.category.name} · {vehicle.vehicleType === "moto" ? "Moto" : "Carro"}
                </p>
              </td>
              <td className="px-5 py-3.5 font-serif text-[0.9375rem] text-ink-soft tabular">
                {vehicle.year}
              </td>
              <td className="px-5 py-3.5 font-serif text-[0.9375rem] text-ink tabular">
                {formatCOP(vehicle.price)}
              </td>
              <td className="px-5 py-3.5">
                <Pills vehicle={vehicle} />
              </td>
              <td className="px-5 py-3.5 font-serif text-xs text-ink-muted">
                {formatDate(vehicle.updatedAt)}
              </td>
              <td className="px-5 py-3.5">
                <RowActions vehicle={vehicle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Filas apiladas por debajo de xl */}
      <ul className="divide-y divide-stone xl:hidden">
        {vehicles.map((vehicle) => (
          <li key={vehicle.id} className="p-4">
            <div className="flex gap-4">
              <Thumb vehicle={vehicle} className="h-16 w-24 shrink-0" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/vehiculos/${vehicle.id}/editar`}
                  className="font-serif text-[0.9375rem] text-ink"
                >
                  {vehicleTitle(vehicle)}
                </Link>
                <p className="mt-1 font-serif text-sm text-ink-muted tabular">
                  {vehicle.year} · {formatCOP(vehicle.price)}
                </p>
                <div className="mt-2.5">
                  <Pills vehicle={vehicle} />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <RowActions vehicle={vehicle} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
