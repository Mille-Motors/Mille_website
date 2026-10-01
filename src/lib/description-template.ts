import { formatInteger } from "@/lib/format";

/**
 * Un punto de partida para la descripción, no una descripción.
 *
 * El problema que resuelve: sin nada delante, cada vehículo acababa con un
 * texto improvisado y de una forma distinta. El problema que NO puede crear:
 * que todos los carros acaben mostrando literalmente el mismo párrafo.
 *
 * Por eso la plantilla hace dos cosas y ninguna más. Escribe la primera
 * frase con los datos que el formulario ya tiene —no hay que teclear otra
 * vez la marca ni el kilometraje— y deja marcados entre corchetes los
 * huecos que solo una persona puede llenar: qué tiene esta unidad, de dónde
 * viene, cómo se siente. Esos corchetes son deliberadamente visibles: un
 * texto que se publique con ellos dentro se nota a la primera.
 *
 * Lo que la plantilla NO repite es la ficha técnica ni la documentación.
 * Potencia, batería, SOAT y tecnomecánica son campos estructurados y la
 * página los dibuja desde ellos; copiarlos también aquí crearía dos
 * verdades que se contradirían en cuanto una se corrigiera.
 */
export interface DescriptionSeed {
  make: string;
  model: string;
  version: string;
  /** Todo puede faltar: la plantilla se salta la frase que no puede escribir. */
  year: number | null;
  mileage: number | null;
  city: string;
  exteriorColor: string;
  interiorColor: string;
  engine: string;
  transmission: string;
  drivetrain: string;
}

export function buildDescriptionTemplate(seed: DescriptionSeed): string {
  const name = [seed.make, seed.model, seed.version].filter(Boolean).join(" ");
  const heading = name || "[Marca] [Modelo] [Versión]";

  const year = seed.year === null ? "" : ` ${seed.year}`;
  const first =
    seed.mileage !== null
      ? `${heading}${year}, con ${formatInteger(seed.mileage)} km.`
      : `${heading}${year}.`;

  const lines: string[] = [first, ""];

  // Cada frase solo se escribe si sus datos existen: una plantilla que diga
  // "configurada en  con interior " es peor que una más corta.
  const colours =
    seed.exteriorColor && seed.interiorColor
      ? `en ${seed.exteriorColor} con interior ${seed.interiorColor}`
      : seed.exteriorColor
        ? `en ${seed.exteriorColor}`
        : seed.interiorColor
          ? `con interior ${seed.interiorColor}`
          : "";

  if (seed.city && colours) {
    lines.push(`Esta unidad está en ${seed.city}, configurada ${colours}.`);
  } else if (seed.city) {
    lines.push(`Esta unidad está en ${seed.city}.`);
  } else if (colours) {
    lines.push(`Esta unidad está configurada ${colours}.`);
  }

  const mechanical = [
    seed.engine ? `equipa ${seed.engine}` : "",
    seed.transmission ? `transmisión ${seed.transmission.toLowerCase()}` : "",
    seed.drivetrain ? `tracción ${seed.drivetrain.toLowerCase()}` : "",
  ].filter(Boolean);

  if (mechanical.length > 0) {
    lines.push(`Mecánicamente ${mechanical.join(", ")}.`);
  }

  lines.push(
    "",
    "[Qué hace interesante a esta unidad: estado, historia, procedencia, cómo está equipada, cómo se siente al conducirla, por qué vale la pena.]",
    "",
    "[Lo que un comprador debería saber antes de venir a verla.]",
  );

  return lines.join("\n");
}
