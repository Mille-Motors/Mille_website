"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { StatCards } from "@/components/admin/StatCards";
import { VehicleTable } from "@/components/admin/VehicleTable";
import { useAdminInventory } from "@/components/admin/AdminInventoryProvider";
import { ButtonLink } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";

export function AdminDashboard() {
  const { vehicles } = useAdminInventory();
  const recent = vehicles.slice(0, 5);

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Resumen de tu inventario"
        action={
          <div className="flex items-center gap-5">
            <p className="hidden font-serif text-sm text-ink-muted sm:block">
              {formatDate(new Date().toISOString())}
            </p>
            <ButtonLink href="/admin/vehiculos/nuevo" size="sm">
              <Plus aria-hidden className="size-3.5" strokeWidth={1.6} />
              Nuevo vehículo
            </ButtonLink>
          </div>
        }
      />

      <StatCards />

      <div className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">Vehículos recientes</h2>
          <Link
            href="/admin/vehiculos"
            className="label-caps group inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-burgundy"
          >
            Ver todos
            <ArrowRight
              aria-hidden
              strokeWidth={1.3}
              className="size-3.5 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
        <VehicleTable vehicles={recent} />
      </div>
    </div>
  );
}
