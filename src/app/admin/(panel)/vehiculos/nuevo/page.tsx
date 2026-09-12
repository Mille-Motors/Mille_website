import { VehicleForm } from "@/components/admin/VehicleForm";
import { listCategories } from "@/server/categories/service";

export const metadata = { title: "Nuevo vehículo" };

export default async function NewVehiclePage() {
  // Solo categorías activas: crear un vehículo en una categoría retirada
  // sería empezar con un dato que ya se decidió no usar.
  const categories = await listCategories({ onlyActive: true });
  return <VehicleForm categories={categories} />;
}
