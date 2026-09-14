import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * La 404 de dentro del Admin.
 *
 * Sin esto, un `notFound()` de una pantalla privada —por ejemplo editar un
 * vehículo que ya no existe— subía hasta la 404 pública: el Superadmin
 * acababa en el sitio público, sin barra lateral y sin forma de volver al
 * panel. Al vivir dentro del grupo (panel), se renderiza dentro del armazón
 * administrativo y conserva su navegación.
 */
export default function AdminNotFound() {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader title="No encontrado" />
      <div className="border border-stone bg-paper">
        <EmptyState
          title="Esto ya no está aquí."
          description="El recurso que buscas no existe o se eliminó. Puede que el enlace sea antiguo."
          actions={
            <>
              <ButtonLink href="/admin/vehiculos" size="lg">
                Ir a vehículos
              </ButtonLink>
              <ButtonLink href="/admin" variant="ghost" size="lg">
                Volver al dashboard
              </ButtonLink>
            </>
          }
        />
      </div>
    </div>
  );
}
