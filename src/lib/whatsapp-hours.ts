import type { WhatsappHours } from "@/data/site";

/**
 * Si la línea de WhatsApp está atendida ahora, en hora de Bogotá.
 *
 * Es una función pura de `now` y no lee el reloj por su cuenta: el
 * componente la llama al abrir el menú —nunca durante el render del
 * servidor—, así que no hay hidratación que desajustar, y las pruebas fijan
 * la hora que quieran. Colombia no tiene horario de verano, de modo que
 * `America/Bogota` es siempre UTC−5 y la cuenta no tiene excepciones.
 */
export interface AttentionStatus {
  open: boolean;
  /** Una frase lista para mostrar. */
  text: string;
}

const bogotaHour = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  hour: "numeric",
  hourCycle: "h23",
});

/** 9 -> "9 a. m.", 18 -> "6 p. m.", 12 -> "12 m.", 0 -> "12 a. m." */
export function hourLabel(hour: number): string {
  if (hour === 12) return "12 m.";
  const suffix = hour < 12 ? "a. m." : "p. m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

/** Cierra una frase con punto, sin duplicarlo cuando acaba en "p. m.". */
function sentence(text: string): string {
  return text.endsWith(".") ? text : `${text}.`;
}

export function attentionStatus(
  hours: WhatsappHours,
  now: Date = new Date(),
): AttentionStatus {
  const hour = Number(bogotaHour.format(now));
  const { openHour, closeHour } = hours;

  if (hour >= openHour && hour < closeHour) {
    return {
      open: true,
      text: sentence(`Te respondemos hoy, hasta las ${hourLabel(closeHour)}`),
    };
  }
  if (hour < openHour) {
    return {
      open: false,
      text: sentence(
        `Ahora estamos fuera de horario. Te respondemos hoy desde las ${hourLabel(openHour)}`,
      ),
    };
  }
  return {
    open: false,
    text: sentence(
      `Ahora estamos fuera de horario. Te respondemos mañana desde las ${hourLabel(openHour)}`,
    ),
  };
}
