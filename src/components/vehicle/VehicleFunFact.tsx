import type { VehicleFunFact as FunFact } from "@/types/vehicle";

/**
 * El apunte editorial.
 *
 * Apagado no renderiza absolutamente nada: ni el marco, ni el título, ni un
 * espacio reservado. Tampoco se dibuja si está encendido pero vacío, porque
 * un bloque con el rótulo y nada debajo es peor que no tenerlo.
 *
 * El tratamiento es el de una cita de revista —un campo arena con esquinas
 * amplias— y no el de un aviso: lo que va aquí es cultura automotriz, no una
 * notificación. Vive dentro de la tarjeta «Acerca de este vehículo», así que
 * su tamaño es el de un recuadro de esa tarjeta y no el de una sección.
 */
export function VehicleFunFact({ funFact }: { funFact: FunFact }) {
  const body = funFact.body?.trim();
  if (!funFact.enabled || !body) return null;

  return (
    <aside className="rounded-xl bg-sand px-5 py-6 sm:px-6">
      <h3 className="text-[clamp(1.375rem,0.9vw+1.1rem,1.75rem)] leading-[1.15] text-burgundy">
        {funFact.title?.trim() || "¿Sabías que?"}
      </h3>
      <p className="mt-3 text-[1.125rem] leading-[1.65] text-ink-soft">{body}</p>
    </aside>
  );
}
