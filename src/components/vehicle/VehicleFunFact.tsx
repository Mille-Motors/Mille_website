import type { VehicleFunFact as FunFact } from "@/types/vehicle";

/**
 * El apunte editorial.
 *
 * Apagado no renderiza absolutamente nada: ni el marco, ni el título, ni un
 * espacio reservado. Tampoco se dibuja si está encendido pero vacío, porque
 * un bloque con el rótulo y nada debajo es peor que no tenerlo.
 *
 * El tratamiento es el de una cita de revista —un campo arena con esquinas
 * amplias y letra grande— y no el de un aviso: lo que va aquí es cultura
 * automotriz, no una notificación.
 */
export function VehicleFunFact({ funFact }: { funFact: FunFact }) {
  const body = funFact.body?.trim();
  if (!funFact.enabled || !body) return null;

  return (
    <aside className="rounded-xl bg-sand px-6 py-8 sm:px-10 sm:py-10">
      <h3 className="text-[clamp(1.5rem,1.4vw+1rem,2.25rem)] leading-[1.15] text-burgundy">
        {funFact.title?.trim() || "¿Sabías que?"}
      </h3>
      <p className="mt-4 text-[1.25rem] leading-[1.65] text-ink-soft">
        {body}
      </p>
    </aside>
  );
}
