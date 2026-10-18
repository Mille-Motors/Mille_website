import { Wordmark } from "@/components/brand/Logo";
import { site } from "@/data/site";

/**
 * La pieza de la derecha de la página de contacto: un fragmento de la
 * identidad de MILLE, no una fotografía. Solo en escritorio y tablet —ver el
 * `hidden lg:flex`—; el teléfono se queda con el formulario.
 *
 * El escudo se deja fuera a propósito. Es un relleno vinotinto con borde y
 * "M" crema: sobre un panel vinotinto el relleno desaparece en el fondo y
 * quedan flotando solo el filo y las letras. El logotipo sin escudo lleva la
 * marca limpia: ningún archivo nuevo, ningún logotipo alterado, solo la parte
 * que se lee sobre este fondo.
 */
export function ContactPanel() {
  return (
    <div className="relative hidden min-h-128 flex-col items-center justify-center gap-9 rounded-2xl bg-burgundy px-10 py-16 text-center text-cream lg:flex">
      <div>
        <Wordmark
          tone="cream"
          className="text-[clamp(2.25rem,3.2vw,3.25rem)] tracking-[0.24em]"
        />
        <p className="mt-4 text-base text-cream/65">{site.tagline}</p>
      </div>

      <p className="max-w-[18rem] text-[clamp(1.5rem,1.6vw+0.9rem,2.25rem)] leading-[1.2]">
        Hay carros que te hacen parar. Y conversaciones que empiezan ahí.
      </p>

      <p className="absolute bottom-10 text-base text-cream/55">
        {site.city}, {site.country}
      </p>
    </div>
  );
}
