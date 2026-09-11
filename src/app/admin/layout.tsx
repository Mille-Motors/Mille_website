import type { Metadata } from "next";
import { AdminInventoryProvider } from "@/components/admin/AdminInventoryProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { getVehicles } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s | MILLE Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seed = await getVehicles({ includeNonPublic: true });

  return (
    <AdminInventoryProvider seed={seed}>
      <AdminShell>{children}</AdminShell>
    </AdminInventoryProvider>
  );
}
