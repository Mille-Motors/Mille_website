import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { VehicleStatStrip } from "@/components/admin/VehicleStatStrip";
import {
  VehicleFilters,
  VehiclePagination,
} from "@/components/admin/VehicleFilters";
import { adminVehiclesHref } from "@/lib/admin-urls";
import { VehicleTable } from "@/components/admin/VehicleTable";
import { ButtonLink } from "@/components/ui/Button";
import { parseTolerant } from "@/lib/query-params";
import { adminVehicleQuerySchema } from "@/server/vehicles/schemas";
import {
  getAdminFilterOptions,
  getInventoryStats,
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
  // Tolerante por campo: un parámetro inválido no debe llevarse por delante
  // los filtros válidos que sí venían en la URL.
  const query = parseTolerant(adminVehicleQuerySchema, searchParams);

  const [{ vehicles, total }, options, stats] = await Promise.all([
    listAdminVehicles(query),
    getAdminFilterOptions(),
    getInventoryStats(),
  ]);

  // Una página que ya no existe —porque cambió el filtro o se borró
  // inventario— se corrige en la URL en vez de mostrar una lista vacía junto
  // a un contador que dice que hay resultados.
  const pages = Math.max(1, Math.ceil(total / query.limit));
  if (query.page > pages) {
    redirect(adminVehiclesHref({ ...query, page: pages }));
  }

  // ¿Hay algo filtrando? Distingue «no hay nada» de «nada coincide».
  const filtered =
    adminVehiclesHref({ ...query, sort: undefined, page: 1 }) !==
    "/admin/vehiculos";

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        eyebrow="Inventario"
        title="Vehículos"
        subtitle="Administra tu inventario completo"
        action={
          <ButtonLink href="/admin/vehiculos/nuevo" size="sm">
            <Plus aria-hidden className="size-4" strokeWidth={1.8} />
            Nuevo vehículo
          </ButtonLink>
        }
      />

      <VehicleStatStrip stats={stats} />

      <VehicleFilters query={query} options={options} total={total} />

      <VehicleTable vehicles={vehicles} filtered={filtered} />

      <VehiclePagination query={query} total={total} shown={vehicles.length} />
    </div>
  );
}
