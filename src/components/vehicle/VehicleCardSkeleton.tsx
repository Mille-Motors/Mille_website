import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real card: photograph on top, warm paper information block. */
export function VehicleCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col border border-stone bg-paper">
      <Skeleton className="aspect-[4/3] w-full rounded-none bg-sand" />
      <span aria-hidden className="h-px w-full bg-burgundy/25" />
      <div className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="mt-auto h-6 w-1/2" />
      </div>
    </div>
  );
}

export function VehicleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-14">
      {Array.from({ length: count }, (_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}
