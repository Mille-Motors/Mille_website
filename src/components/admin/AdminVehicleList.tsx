"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { VehicleTable } from "@/components/admin/VehicleTable";
import { useAdminInventory } from "@/components/admin/AdminInventoryProvider";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { statusMeta } from "@/lib/vehicle-status";
import { VEHICLE_STATUSES } from "@/types/vehicle";
import type { VehicleStatus } from "@/types/vehicle";

type Tab = VehicleStatus | "all";

export function AdminVehicleList() {
  const { vehicles } = useAdminInventory();
  const [tab, setTab] = useState<Tab>("all");

  const filtered =
    tab === "all" ? vehicles : vehicles.filter((v) => v.status === tab);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: vehicles.length },
    ...VEHICLE_STATUSES.map((status) => ({
      key: status as Tab,
      label: statusMeta[status].label,
      count: vehicles.filter((v) => v.status === status).length,
    })),
  ];

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Vehículos"
        subtitle="Administra tu inventario completo"
        action={
          <ButtonLink href="/admin/vehiculos/nuevo" size="sm">
            <Plus aria-hidden className="size-3.5" strokeWidth={1.6} />
            Nuevo vehículo
          </ButtonLink>
        }
      />

      <div className="mb-6 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={cn(
                "label-caps inline-flex items-center gap-2 rounded-xs border px-4 py-2.5 transition-colors",
                tab === key
                  ? "border-burgundy bg-burgundy text-cream"
                  : "border-stone text-ink-soft hover:border-stone-strong",
              )}
            >
              {label}
              <span className={tab === key ? "text-cream/70" : "text-ink-muted"}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <VehicleTable vehicles={filtered} />
    </div>
  );
}
