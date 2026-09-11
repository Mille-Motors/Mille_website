import { Container } from "@/components/ui/Container";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function VehicleLoading() {
  return (
    <>
      <section className="bg-black">
        <Container width="wide">
          <div className="flex flex-col gap-6 py-10 lg:flex-row lg:items-end lg:justify-between lg:py-12">
            <div className="w-full max-w-md space-y-4">
              <Skeleton className="h-3 w-40 bg-cream/12" />
              <Skeleton className="h-11 w-full bg-cream/12" />
              <Skeleton className="h-3.5 w-40 bg-cream/12" />
            </div>
            <Skeleton className="h-9 w-56 bg-cream/12" />
          </div>
        </Container>
      </section>

      <section className="bg-cream pt-8 pb-12 lg:pt-10">
        <Container width="wide">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <Skeleton className="aspect-[4/3] w-full lg:aspect-[3/2]" />
            <div className="grid grid-cols-4 gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full" />
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-cream pb-16">
        <Container width="wide">
          <div className="grid gap-14 lg:grid-cols-2">
            <div>
              <Skeleton className="h-8 w-56" />
              <div className="mt-8 space-y-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-8 w-44" />
              <SkeletonText lines={4} className="mt-8" />
              <Skeleton className="mt-12 h-8 w-64" />
              <SkeletonText lines={5} className="mt-8" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
