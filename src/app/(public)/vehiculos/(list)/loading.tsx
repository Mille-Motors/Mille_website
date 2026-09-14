import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { Skeleton } from "@/components/ui/Skeleton";
import { VehicleGridSkeleton } from "@/components/vehicle/VehicleCardSkeleton";

export default function InventoryLoading() {
  return (
    <>
      <section className="bg-cream pt-12 pb-10 lg:pt-16">
        <Container width="wide">
          <Eyebrow>Inventario</Eyebrow>
          <h1 className="mt-5 max-w-2xl font-display text-[clamp(2.125rem,4.6vw,3.25rem)] leading-[1.06] text-ink uppercase">
            Encuentra lo que te mueve.
          </h1>
          <Rule className="mt-7" />
        </Container>
      </section>

      <section className="bg-cream pb-12">
        <Container width="wide">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <Skeleton className="h-[6.5rem] rounded-none sm:h-[7.5rem]" />
            <Skeleton className="h-[6.5rem] rounded-none sm:h-[7.5rem]" />
          </div>
          <div className="mt-4 flex justify-center">
            <Skeleton className="h-4 w-44" />
          </div>
        </Container>
      </section>

      <section className="border-t border-stone bg-cream pt-10">
        <Container width="wide">
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="mt-8 flex gap-7">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-stone pt-6">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-32" />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-cream pt-10 pb-20 lg:pb-28">
        <Container width="wide">
          <Skeleton className="mb-8 h-3 w-28" />
          <VehicleGridSkeleton count={6} />
        </Container>
      </section>
    </>
  );
}
