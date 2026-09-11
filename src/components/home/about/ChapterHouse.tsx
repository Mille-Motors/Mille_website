import { HouseOfMotorCulture } from "@/components/home/about/HouseOfMotorCulture";
import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";

/**
 * 04 — Intro and plate are one chapter. The text sits close above the plate
 * on purpose, so arriving at the burgundy feels like walking into it.
 */
export function ChapterHouse() {
  return (
    <div className="border-t border-stone">
      <Container width="wide">
        <div className="pt-16 pb-10 lg:pt-24 lg:pb-12">
          <ChapterLabel number="04" title="House of Motor Culture" />
          <p className="mt-8 max-w-3xl font-display text-[clamp(1.5rem,3.2vw,2.375rem)] leading-[1.18] text-ink">
            Queremos convertir MILLE en una casa para la cultura motor.
          </p>
          <p className="mt-6 max-w-2xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
            No una casa nuestra: una donde quepa cualquiera a quien le muevan
            las máquinas. No nos une una marca, ni un tipo de combustible, ni
            un rango de precio. Nos une que nos importe lo que está bien hecho.
          </p>
        </div>
      </Container>
      <HouseOfMotorCulture />
    </div>
  );
}
