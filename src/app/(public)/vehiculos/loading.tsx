import { Container } from "@/components/ui/Container";
import { LoadingHint, Skeleton } from "@/components/ui/Skeleton";
import { VehicleGridSkeleton } from "@/components/vehicle/VehicleCardSkeleton";
import { Eyebrow } from "@/components/ui/Eyebrow";

export default function InventoryLoading() {
  return (
    <>
      <section className="bg-cream pt-14 pb-10 lg:pt-20">
        <Container width="wide">
          <Eyebrow>Inventario</Eyebrow>
          <h1 className="mt-6 font-display text-[clamp(2.25rem,4.8vw,3.5rem)] leading-[1.06] text-ink">
            Vehículos disponibles
          </h1>
          <Skeleton className="mt-8 h-4 w-full max-w-xl" />
        </Container>
      </section>

      <Container width="wide">
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-stone py-4">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-36" />
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-32" />
          </div>
          <Skeleton className="h-11 w-56" />
        </div>
      </Container>

      <section className="bg-cream pt-9 pb-20 lg:pb-24">
        <Container width="wide">
          <Skeleton className="mb-7 h-3 w-24" />
          <VehicleGridSkeleton count={8} columns={4} />
          <div className="mt-14">
            <LoadingHint>
              <span>Cargando inventario…</span>
            </LoadingHint>
          </div>
        </Container>
      </section>
    </>
  );
}
