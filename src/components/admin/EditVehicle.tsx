"use client";

import { AdminPageHeader } from "@/components/admin/AdminShell";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { useAdminInventory } from "@/components/admin/AdminInventoryProvider";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function EditVehicle({ id }: { id: string }) {
  const { getById } = useAdminInventory();
  const vehicle = getById(id);

  if (!vehicle) {
    return (
      <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <AdminPageHeader title="Editar vehículo" />
        <div className="border border-stone bg-paper">
          <EmptyState
            title="Este vehículo ya no existe."
            description="Es posible que se haya eliminado en esta sesión."
            actions={
              <ButtonLink href="/admin/vehiculos" size="lg">
                Volver a vehículos
              </ButtonLink>
            }
          />
        </div>
      </div>
    );
  }

  return <VehicleForm vehicle={vehicle} />;
}
