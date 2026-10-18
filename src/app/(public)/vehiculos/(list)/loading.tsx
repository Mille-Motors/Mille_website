import { Skeleton } from "@/components/ui/Skeleton";
import { VehicleGridSkeleton } from "@/components/vehicle/VehicleCardSkeleton";

/**
 * El esqueleto del inventario: el mismo titular que la página real, que no
 * depende de ningún dato, y las siluetas de lo que va a llegar. Nada de esto
 * se anima al entrar: es un estado de espera, no una entrada.
 */
export default function InventoryLoading() {
  return (
    <>
      <section className="bg-cream pt-[clamp(2.5rem,5vw,5rem)] pb-[clamp(2rem,4vw,3.5rem)]">
        <div className="wrap">
          <h1 className="text-title">
            Encuentra
            <br className="hidden sm:block" /> lo que te mueve.
          </h1>
        </div>
      </section>

      <section className="bg-cream pb-6">
        <div className="wrap">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-28 rounded-full" />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-36 rounded-md" />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream pt-6 pb-[clamp(4rem,8vw,8rem)]">
        <div className="wrap">
          <Skeleton className="mb-8 h-4 w-28" />
          <VehicleGridSkeleton count={6} />
        </div>
      </section>
    </>
  );
}
