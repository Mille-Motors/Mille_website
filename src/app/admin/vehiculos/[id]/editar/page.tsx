import { EditVehicle } from "@/components/admin/EditVehicle";

export const metadata = { title: "Editar vehículo" };

export default async function EditVehiclePage(
  props: PageProps<"/admin/vehiculos/[id]/editar">,
) {
  const { id } = await props.params;
  return <EditVehicle id={id} />;
}
