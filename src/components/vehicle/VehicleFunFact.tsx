import type { VehicleFunFact as FunFact } from "@/types/vehicle";

/**
 * El apunte editorial.
 *
 * Apagado no renderiza absolutamente nada: ni el marco, ni el título, ni un
 * espacio reservado. Tampoco se dibuja si está encendido pero vacío, porque
 * un bloque con el rótulo y nada debajo es peor que no tenerlo.
 *
 * El tratamiento es el de una cita de revista —fondo arena, filete
 * vinotinto, serif holgada— y no el de un aviso: lo que va aquí es cultura
 * automotriz, no una notificación.
 */
export function VehicleFunFact({ funFact }: { funFact: FunFact }) {
  const body = funFact.body?.trim();
  if (!funFact.enabled || !body) return null;

  return (
    <aside className="border-l-2 border-burgundy bg-sand/60 px-6 py-7 sm:px-9 sm:py-9">
      <p className="eyebrow text-burgundy">¿Sabías que?</p>
      {funFact.title?.trim() ? (
        <h3 className="mt-4 font-display text-[clamp(1.375rem,2.4vw,1.75rem)] leading-tight text-ink">
          {funFact.title}
        </h3>
      ) : null}
      <p className="mt-4 font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
        {body}
      </p>
    </aside>
  );
}
