import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real card: a rounded photograph and three lines of text. */
export function VehicleCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <Skeleton className="aspect-4/3 w-full rounded-xl bg-sand" />
      <div className="mt-5 flex flex-col gap-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-1 h-6 w-1/2" />
      </div>
    </div>
  );
}

export function VehicleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
      {Array.from({ length: count }, (_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}
