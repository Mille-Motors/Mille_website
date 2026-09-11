import { Container } from "@/components/ui/Container";
import { LoadingHint, Skeleton } from "@/components/ui/Skeleton";
import { VehicleGridSkeleton } from "@/components/vehicle/VehicleCardSkeleton";

export default function HomeLoading() {
  return (
    <>
      <section className="border-b border-stone bg-cream">
        <Container width="wide" className="lg:px-0">
          <div className="grid items-stretch lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="flex flex-col justify-center gap-6 py-14 lg:py-24 lg:pr-14 lg:pl-12">
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-16 w-full max-w-lg" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-13 w-48" />
            </div>
            <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-[16/10] lg:aspect-auto lg:min-h-[36rem]" />
          </div>
        </Container>
      </section>

      <section className="bg-cream py-16">
        <Container width="wide">
          <Skeleton className="h-9 w-72" />
          <div className="mt-9">
            <VehicleGridSkeleton count={4} columns={4} />
          </div>
          <div className="mt-14">
            <LoadingHint>
              <span>Cargando vehículos…</span>
            </LoadingHint>
          </div>
        </Container>
      </section>
    </>
  );
}
