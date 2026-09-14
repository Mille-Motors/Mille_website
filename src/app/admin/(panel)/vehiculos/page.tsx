import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import {
  VehicleFilters,
  VehiclePagination,
} from "@/components/admin/VehicleFilters";
import { VehicleTable } from "@/components/admin/VehicleTable";
import { ButtonLink } from "@/components/ui/Button";
import { adminVehicleQuerySchema } from "@/server/vehicles/schemas";
import {
  getAdminFilterOptions,
  listAdminVehicles,
} from "@/server/vehicles/service";

export const metadata = { title: "Vehículos" };

/**
 * La búsqueda, los filtros, el orden y la página viven en la URL y se
 * resuelven en la base. El navegador nunca recibe el inventario entero para
 * descartarlo, que es lo que deja de funcionar cuando haya 300 vehículos.
 */
export default async function AdminVehiclesPage(
  props: PageProps<"/admin/vehiculos">,
) {
  const searchParams = await props.searchParams;

  // Un parámetro inválido no debe reventar la pantalla: se ignora y se
  // muestra la lista sin ese filtro.
  const parsed = adminVehicleQuerySchema.safeParse(searchParams);
  const query = parsed.success ? parsed.data : adminVehicleQuerySchema.parse({});

  const [{ vehicles, total }, options] = await Promise.all([
    listAdminVehicles(query),
    getAdminFilterOptions(),
  ]);

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

      <VehicleFilters query={query} options={options} total={total} />

      <div className="mt-6">
        <VehicleTable vehicles={vehicles} />
      </div>

      <VehiclePagination query={query} total={total} />
    </div>
  );
}
