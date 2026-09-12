import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { listCategoriesWithCounts } from "@/server/categories/service";

export const metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesWithCounts();
  return <CategoriesAdmin categories={categories} />;
}
