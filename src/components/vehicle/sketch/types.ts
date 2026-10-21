/**
 * Un boceto es dibujo en líneas, en cuatro pesos. Ninguna superficie lleva
 * relleno ni color propio: todo se traza con `currentColor`, así que quien lo
 * pone decide el color del trazo.
 *
 * Los pesos son lo que le da lectura de dibujo técnico:
 *  - `body`: la silueta y los pasos de rueda. El trazo firme.
 *  - `glass`: las ventanas y el parabrisas. Casi tan firme: es lo que hace
 *    reconocible la carrocería.
 *  - `detail`: cortes de puerta, faros, retrovisor, línea de carácter. Más
 *    fino.
 *  - `guide`: suelo y cotas, a trazos y muy tenues. Son la construcción del
 *    dibujo, no el vehículo.
 */
export interface Wheel {
  cx: number;
  cy: number;
  /** Radio del neumático. */
  r: number;
  /** Radio del aro. */
  rim: number;
  /** Cuántos radios. Cinco por defecto; cero deja el aro liso. */
  spokes?: number;
  /** Con tacos en el neumático, para el todoterreno. */
  knobby?: boolean;
}

export interface Sketch {
  body: string[];
  glass: string[];
  detail: string[];
  guide: string[];
  wheels: Wheel[];
  /**
   * Formas cerradas que tapan lo que pasa por detrás: una alforja delante de
   * la rueda trasera, un silenciador sobre el neumático. Las líneas de las
   * ruedas se cortan donde las cubren, que es lo que haría una mano al pasar
   * en limpio un dibujo a lápiz.
   */
  occlude?: string[];
}

export const SKETCH_KEYS = [
  "camioneta",
  "sedan",
  "pickup",
  "hatchback",
  "coupe",
  "cabrio",
  "wagon",
  "adv",
  "sport",
  "naked",
  "touring",
  "enduro",
  "cruiser",
  "scooter",
] as const;

export type SketchKey = (typeof SKETCH_KEYS)[number];
