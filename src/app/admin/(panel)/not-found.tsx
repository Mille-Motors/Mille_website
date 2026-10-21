import { AdminPageHeader } from "@/components/admin/AdminShell";
import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyPanel, Panel } from "@/components/admin/kit";

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
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader title="No encontrado" />
      <Panel>
        <EmptyPanel
          icon={<FileQuestion aria-hidden className="size-5" strokeWidth={1.5} />}
          title="Esto ya no está aquí"
          description="El recurso que buscas no existe o se eliminó. Puede que el enlace sea antiguo."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/admin/vehiculos" size="sm">
                Ir a vehículos
              </ButtonLink>
              <ButtonLink href="/admin" variant="ghost" size="sm">
                Volver al panel
              </ButtonLink>
            </div>
          }
        />
      </Panel>
    </div>
  );
}
