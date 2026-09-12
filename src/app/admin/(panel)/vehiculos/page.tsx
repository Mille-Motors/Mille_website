import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { VehicleFilters } from "@/components/admin/VehicleFilters";
import { VehicleTable } from "@/components/admin/VehicleTable";
import { ButtonLink } from "@/components/ui/Button";
import { adminVehicleQuerySchema } from "@/server/vehicles/schemas";
import { listAdminVehicles } from "@/server/vehicles/service";

export const metadata = { title: "Vehículos" };

/**
 * La búsqueda y los filtros viven en la URL y se resuelven en la base, igual
 * que en el inventario público: compartir un enlace o recargar da el mismo
 * resultado, y el navegador no recibe el inventario entero para descartarlo.
 */
export default async function AdminVehiclesPage(
  props: PageProps<"/admin/vehiculos">,
) {
  const searchParams = await props.searchParams;

  // Un parámetro inválido no debe reventar la pantalla: se ignora y se
  // muestra la lista sin ese filtro.
  const parsed = adminVehicleQuerySchema.safeParse(searchParams);
  const query = parsed.success
    ? parsed.data
    : adminVehicleQuerySchema.parse({});

  const { vehicles, total, page, limit } = await listAdminVehicles(query);
  const pages = Math.max(1, Math.ceil(total / limit));

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

      <VehicleFilters query={query} total={total} />

      <div className="mt-6">
        <VehicleTable vehicles={vehicles} />
      </div>

      {pages > 1 ? (
        <p className="mt-6 font-serif text-sm text-ink-muted tabular">
          Página {page} de {pages} · {total} vehículos
        </p>
      ) : null}
    </div>
  );
}
