import { Skeleton } from "@/components/ui/Skeleton";

export function VehicleCardSkeleton() {
  return (
    <div className="flex h-full flex-col border border-stone bg-paper">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="mt-auto h-6 w-1/2" />
      </div>
    </div>
  );
}

export function VehicleGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 3 | 4;
}) {
  return (
    <div
      className={
        columns === 4
          ? "grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {Array.from({ length: count }, (_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}
