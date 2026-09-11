import { AdminPending } from "@/components/admin/AdminPending";

export const metadata = { title: "Categorías" };

export default function AdminCategoriesPage() {
  return (
    <AdminPending
      title="Categorías"
      subtitle="SUV, Sedán, Híbrido, Desempeño y Motos"
      body="Las categorías están definidas en el código mientras el inventario vive en datos de demostración. Cuando conectemos la base de datos podrás crearlas y editarlas desde aquí."
    />
  );
}
