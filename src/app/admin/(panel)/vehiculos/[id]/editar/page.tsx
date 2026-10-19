import { notFound } from "next/navigation";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { FormSection } from "@/components/admin/FormSection";
import { VehicleProvenancePanel } from "@/components/admin/VehicleProvenancePanel";
import { listCategories } from "@/server/categories/service";
import { getVehicleById } from "@/server/vehicles/service";
import { getVehicleProvenance } from "@/server/provenance/service";

export const metadata = { title: "Editar vehículo" };

export default async function EditVehiclePage(
  props: PageProps<"/admin/vehiculos/[id]/editar">,
) {
  const { id } = await props.params;

  // El id llega de la URL: si no es un uuid, Prisma lanzaría. Es un 404.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) notFound();

  const [vehicle, categories, provenance] = await Promise.all([
    getVehicleById(id),
    // Al editar sí entran las inactivas: si este vehículo ya estaba en una,
    // ocultarla haría que guardar le cambiara la categoría en silencio.
    listCategories(),
    getVehicleProvenance(id),
  ]);

  if (!vehicle) notFound();

  return (
    <>
      <VehicleForm vehicle={vehicle} categories={categories} />

      {/* Fuera del formulario, y a propósito.
          La procedencia no es un campo del vehículo que se guarde con
          "Guardar cambios": tiene su propio endpoint porque no cambia nada
          de lo que se publica, y meterla dentro del formulario haría que
          registrar de dónde salió una foto pasara por la validación de
          publicación de la ficha entera. */}
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <FormSection
          title="Procedencia de las fotografías"
          description="De dónde salió cada foto y por qué podemos usarla. No se muestra en el sitio público y no condiciona la publicación."
          badge={
            provenance.pendingCount > 0
              ? `${provenance.pendingCount} sin registrar`
              : undefined
          }
        >
          <VehicleProvenancePanel vehicleId={id} initial={provenance} />
        </FormSection>
      </div>
    </>
  );
}
