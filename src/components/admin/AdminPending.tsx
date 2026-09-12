import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Marcador para secciones del admin que todavía no tienen nada real que
 * administrar. Existe para que la barra lateral no tenga enlaces muertos.
 */
export function AdminPending({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle: string;
  body: string;
}) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader title={title} subtitle={subtitle} />
      <div className="border border-stone bg-paper px-6 py-16 text-center sm:px-12">
        <p className="mx-auto max-w-md font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
          {body}
        </p>
        <ButtonLink href="/admin/vehiculos" size="lg" className="mt-8">
          Ir a vehículos
        </ButtonLink>
      </div>
    </div>
  );
}
