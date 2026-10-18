/**
 * El esqueleto de la home: un campo oscuro a pantalla completa, como la
 * portada que va a llegar, con la silueta del titular. Es oscuro desde el
 * primer fotograma a propósito: pasar de un blanco a la fotografía oscura
 * sería un destello.
 */
export default function HomeLoading() {
  return (
    <section
      aria-hidden
      className="-mt-header flex min-h-svh flex-col justify-between bg-dark"
    >
      <div className="wrap pt-[calc(var(--spacing-header)+clamp(2rem,8svh,6rem))]">
        <div className="h-[clamp(3rem,7vw,7rem)] w-[min(30rem,70%)] animate-pulse rounded-md bg-cream/10" />
      </div>
      <div className="wrap flex flex-col gap-6 pb-[clamp(2.5rem,8svh,6rem)] lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3">
          <div className="h-5 w-[min(20rem,80%)] animate-pulse rounded bg-cream/10" />
          <div className="h-5 w-[min(14rem,60%)] animate-pulse rounded bg-cream/10" />
        </div>
        <div className="h-14 w-full animate-pulse rounded-md bg-cream/10 sm:w-56" />
      </div>
    </section>
  );
}
