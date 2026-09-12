import { notFound } from "next/navigation";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { listCategories } from "@/server/categories/service";
import { getVehicleById } from "@/server/vehicles/service";

export const metadata = { title: "Editar vehículo" };

export default async function EditVehiclePage(
  props: PageProps<"/admin/vehiculos/[id]/editar">,
) {
  const { id } = await props.params;

  // El id llega de la URL: si no es un uuid, Prisma lanzaría. Es un 404.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) notFound();

  const [vehicle, categories] = await Promise.all([
    getVehicleById(id),
    // Al editar sí entran las inactivas: si este vehículo ya estaba en una,
    // ocultarla haría que guardar le cambiara la categoría en silencio.
    listCategories(),
  ]);

  if (!vehicle) notFound();

  return <VehicleForm vehicle={vehicle} categories={categories} />;
}
