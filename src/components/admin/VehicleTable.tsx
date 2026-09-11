"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EyeOff, Plus, Trash2 } from "lucide-react";
import { useAdminInventory } from "@/components/admin/AdminInventoryProvider";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatCOP, vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

function RowActions({ vehicle }: { vehicle: Vehicle }) {
  const { setStatus, remove } = useAdminInventory();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-serif text-xs text-ink-muted">¿Eliminar?</span>
        <button
          type="button"
          onClick={() => remove(vehicle.id)}
          className="label-caps rounded-xs bg-burgundy px-2.5 py-1.5 text-[10px] text-cream"
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="label-caps rounded-xs border border-stone px-2.5 py-1.5 text-[10px] text-ink"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`/admin/vehiculos/${vehicle.id}/editar`}
        className="label-caps rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={() =>
          setStatus(vehicle.id, vehicle.status === "draft" ? "available" : "draft")
        }
        className="label-caps inline-flex items-center gap-1.5 rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
      >
        <EyeOff aria-hidden className="size-3" strokeWidth={1.5} />
        {vehicle.status === "draft" ? "Publicar" : "Ocultar"}
      </button>
      <button
        type="button"
        onClick={() =>
          setStatus(vehicle.id, vehicle.status === "sold" ? "available" : "sold")
        }
        className="label-caps rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
      >
        {vehicle.status === "sold" ? "Reactivar" : "Vendido"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Eliminar ${vehicleTitle(vehicle)}`}
        className="inline-flex size-8 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/40 hover:text-burgundy"
      >
        <Trash2 aria-hidden className="size-3.5" strokeWidth={1.4} />
      </button>
    </div>
  );
}

export function VehicleTable({ vehicles }: { vehicles: Vehicle[] }) {
  if (vehicles.length === 0) {
    return (
      <div className="border border-stone bg-paper">
        <EmptyState
          icon={<Plus aria-hidden className="size-9" strokeWidth={0.9} />}
          title="Todavía no has agregado vehículos."
          description="Cuando publiques tu primer vehículo aparecerá aquí."
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
      {/* Desktop table */}
      <table className="hidden w-full border-collapse xl:table">
        <thead>
          <tr className="border-b border-stone bg-sand/60">
            {["Imagen", "Vehículo", "Año", "Precio", "Estado", "Acciones"].map(
              (heading, i) => (
                <th
                  key={heading}
                  scope="col"
                  className={
                    i === 5
                      ? "label-caps px-5 py-3.5 text-right text-ink-muted"
                      : "label-caps px-5 py-3.5 text-left text-ink-muted"
                  }
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
                <span className="relative block h-12 w-20 overflow-hidden bg-sand">
                  <Image
                    src={vehicle.images[0].src}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </span>
              </td>
              <td className="px-5 py-3.5">
                <Link
                  href={`/admin/vehiculos/${vehicle.id}/editar`}
                  className="font-serif text-[0.9375rem] text-ink transition-colors hover:text-burgundy"
                >
                  {vehicleTitle(vehicle)}
                </Link>
                <p className="mt-0.5 text-xs text-ink-muted">{vehicle.category}</p>
              </td>
              <td className="px-5 py-3.5 font-serif text-[0.9375rem] text-ink-soft tabular">
                {vehicle.year}
              </td>
              <td className="px-5 py-3.5 font-serif text-[0.9375rem] text-ink tabular">
                {formatCOP(vehicle.price)}
              </td>
              <td className="px-5 py-3.5">
                <StatusPill status={vehicle.status} />
              </td>
              <td className="px-5 py-3.5">
                <RowActions vehicle={vehicle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Compact stacked rows below xl */}
      <ul className="divide-y divide-stone xl:hidden">
        {vehicles.map((vehicle) => (
          <li key={vehicle.id} className="p-4">
            <div className="flex gap-4">
              <span className="relative block h-16 w-24 shrink-0 overflow-hidden bg-sand">
                <Image
                  src={vehicle.images[0].src}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </span>
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
                  <StatusPill status={vehicle.status} />
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
