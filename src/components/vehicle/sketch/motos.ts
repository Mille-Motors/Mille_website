import {
  GROUND,
  circle,
  flow,
  line,
  planGuides,
  ring,
  rounded,
  type Vertex,
} from "@/components/vehicle/sketch/geometry";
import type { Sketch, Wheel } from "@/components/vehicle/sketch/types";

/**
 * Las motos, de perfil y mirando a la derecha.
 *
 * Una moto se dibuja con muy pocas masas —el carenado, el depósito, el asiento,
 * el motor— y mucha línea fina: la horquilla, el basculante, el escape. Lo que
 * separa una sport de una naked o de una enduro no es el detalle sino dónde
 * están esas masas y cuánto de la mecánica queda a la vista, así que cada una
 * se dibuja desde ahí.
 *
 * Las que llevan carenado se trazan como una sola silueta cerrada, para que se
 * lean de un vistazo; las que no, como piezas sueltas sobre el motor. Lo que
 * pasa por detrás de una alforja o de un silenciador se tapa (`occlude`).
 */

const wheel = (cx: number, r = 13.6, extra: Partial<Wheel> = {}): Wheel => ({
  cx,
  cy: GROUND - r,
  r,
  rim: r - 3.4,
  ...extra,
});

/** La horquilla: dos barras paralelas del eje al tubo de dirección. */
function fork(axleX: number, axleY: number, clampX: number, clampY: number): string[] {
  const dx = clampX - axleX;
  const dy = clampY - axleY;
  const length = Math.hypot(dx, dy);
  // Perpendicular hacia delante: la segunda barra queda a 1,8 unidades.
  const px = (-dy / length) * 1.8;
  const py = (dx / length) * 1.8;
  return [line(axleX, axleY, clampX, clampY), line(axleX + px, axleY + py, clampX + px, clampY + py)];
}

const lamp = (...points: [number, number][]) =>
  rounded(
    points.map(([x, y]) => [x, y, 1] as Vertex),
    true,
  );

/** Un cuadrilátero cerrado con las esquinas romas: cilindros, bolsas, latas. */
const block = (radius: number, ...points: [number, number][]) =>
  rounded(
    points.map(([x, y]) => [x, y, radius] as Vertex),
    true,
  );

/** Un disco de freno. */
const disc = (cx: number, cy: number, r = 8.6) => [circle(cx, cy, r), circle(cx, cy, 1.4)];

// ---------------------------------------------------------------------------
// Sport: carenado completo, semimanillares y cola corta levantada.
// ---------------------------------------------------------------------------

function sport(): Sketch {
  const rear = wheel(50, 13.6, { spokes: 5 });
  const front = wheel(114, 13.6, { spokes: 5 });

  return {
    body: [
      // El morro y el parabrisas, rectos y tensos.
      flow([
        [122, 28],
        [118, 24.8],
        [112.4, 22],
        [107, 20.2],
      ]),
      rounded([
        [107, 20.2, 0],
        [102.6, 9.2, 2],
        [99.6, 9.6, 1.6],
        [95.4, 18.4, 2],
      ]),
      // Depósito, asiento y cola: una sola curva que sube y baja.
      flow([
        [95.4, 18.4],
        [90, 18.6],
        [84, 17.2],
        [76.6, 16.6],
        [69.6, 19],
        [63.4, 21.2],
        [56, 20.8],
        [47, 18.8],
        [39, 18],
        [32.6, 18.8],
      ]),
      rounded([
        [32.6, 18.8, 0],
        [31.2, 20.2, 1.4],
        [32.2, 24.2, 1.6],
      ]),
      // Bajos: de la cola, por el motor, hasta el morro.
      flow([
        [32.2, 24.2],
        [40, 26.4],
        [51, 27.2],
        [59, 28.2],
        [63.6, 32],
        [64.6, 40],
        [65.4, 45.4],
        [68.2, 49],
        [75, 50.6],
        [85, 50.4],
        [94, 47.6],
        [100.6, 42.6],
        [103.8, 36.6],
        [107, 31.4],
        [111.6, 28.6],
        [117, 27.8],
        [122, 28],
      ]),
      // La horquilla asoma por debajo del carenado, y el guardabarros delante.
      ...fork(114, front.cy, 108.4, 31),
      ring(114, front.cy, 15.6, -104, -34),
    ],
    glass: [],
    detail: [
      lamp([112.4, 23.8], [118, 25.8], [116.4, 27.2], [111, 25.2]),
      lamp([100.6, 14], [103.4, 12.8], [104.2, 15.2], [101.2, 16]),
      // Paneles del carenado y branquias.
      flow([
        [95.4, 18.4],
        [98.6, 24],
        [97.6, 30.6],
        [100.4, 36.6],
        [102, 41],
      ]),
      line(99.6, 28.6, 102.6, 31.6),
      line(101.4, 27, 104.4, 30),
      // Asiento y flanco del depósito.
      flow([
        [63.4, 21.2],
        [59, 24.6],
        [50, 25],
        [42, 22.6],
      ]),
      flow([
        [90, 24.6],
        [82, 27.8],
        [72, 27.4],
        [64.6, 23.8],
      ]),
      lamp([32.6, 20.6], [36.4, 21.6], [35.8, 24], [32.8, 23.6]),
      // Motor: cárter, cilindros y escape.
      block(3, [68, 35], [86, 34.2], [88.4, 43], [82, 47.4], [68.6, 47.4]),
      block(1, [72, 27.8], [86, 28], [86.4, 34.4], [72.4, 34.6]),
      line(72.6, 30, 86, 30.2),
      line(72.6, 32, 86.2, 32.2),
      flow([
        [96, 45.8],
        [89, 49],
        [74, 49.4],
      ]),
      // Basculante y subchasis.
      block(1, [67.6, 40.4], [50.8, 42], [50.8, 45.2], [67.6, 44.6]),
      line(60, 28.4, 66, 40.6),
      ...disc(114, front.cy),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 31, right: 122, top: 9.2 }),
    wheels: [rear, front],
  };
}

// ---------------------------------------------------------------------------
// Naked: sin carenado. La mecánica es lo que se dibuja.
// ---------------------------------------------------------------------------

function naked(): Sketch {
  const rear = wheel(50, 13.6, { spokes: 5 });
  const front = wheel(114, 13.6, { spokes: 5 });
  const can = block(2, [38, 37.6], [62, 41], [62, 45.4], [38.6, 42.2]);

  return {
    body: [
      // Depósito.
      flow([
        [98.4, 24.2],
        [95, 19.2],
        [88, 16.6],
        [78, 16.4],
        [70, 19],
        [66.6, 23],
      ]),
      flow([
        [98.4, 24.2],
        [96.4, 27.6],
        [88, 29.6],
        [76, 29.4],
        [68, 26.6],
        [66.6, 23],
      ]),
      // Asiento y cola.
      flow([
        [69, 19.6],
        [62, 21.4],
        [54, 21.2],
        [45, 19.8],
        [37, 19.4],
        [30, 21.4],
        [28.4, 23.6],
      ]),
      flow([
        [28.4, 23.6],
        [32, 27.2],
        [42, 28.6],
        [52, 28.2],
        [60, 27],
        [66.6, 24.4],
      ]),
      // Cárter: lo más grande que se ve de una moto sin carenado.
      block(3, [66, 35.6], [93, 34.6], [96, 43], [90, 48.6], [68, 48.8], [62, 42]),
      // Silenciador, que tapa la rueda trasera.
      can,
      ...fork(114, front.cy, 104.4, 24.4),
      ring(114, front.cy, 15.4, -165, -40),
      circle(111.6, 25.4, 5.6),
      flow([
        [104.4, 24.4],
        [103.4, 19.6],
        [100, 16.6],
        [95, 16],
      ]),
    ],
    glass: [],
    detail: [
      circle(111.6, 25.4, 3.4),
      line(95, 16, 92.4, 15.8),
      line(97.6, 16.6, 99.2, 10.8),
      lamp([98.2, 9.6], [101, 8.8], [101.6, 11.2], [98.8, 12]),
      // Cilindros con sus aletas, radiador y bastidor.
      block(1, [72, 30.6], [92, 30.2], [92.4, 36], [72.6, 36.4]),
      line(72.8, 32.6, 92.2, 32.2),
      line(72.8, 34.4, 92.2, 34.2),
      block(1.8, [95, 30.6], [100.4, 31.6], [100.8, 43], [95.6, 43.8]),
      line(102.8, 27.2, 96, 31),
      line(66, 36, 61, 42),
      // Escape: del cilindro a los bajos y al silenciador.
      flow([
        [94, 44.6],
        [90, 50],
        [78, 52],
        [67, 50],
        [62, 45.4],
      ]),
      block(1, [67.6, 40.6], [50.8, 42], [50.8, 45.2], [67.6, 45]),
      ring(50, rear.cy, 15.4, -165, -80),
      ...disc(114, front.cy),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 28, right: 119.6, top: 8.8 }),
    wheels: [rear, front],
    occlude: [can],
  };
}

// ---------------------------------------------------------------------------
// Touring: carenado grande, parabrisas alto, maleta lateral y baúl.
// ---------------------------------------------------------------------------

function touring(): Sketch {
  const rear = wheel(50, 13.6, { spokes: 5 });
  const front = wheel(114, 13.6, { spokes: 5 });
  const pannier = block(3.4, [34, 31.4], [66, 32.2], [67, 43.6], [40, 44.6]);
  const trunk = block(3.6, [27.6, 17], [62, 17.4], [63.6, 30.4], [29, 30]);

  return {
    body: [
      // El morro y el parabrisas alto.
      flow([
        [121, 32],
        [119.4, 26],
        [114, 21.6],
        [108, 19.2],
      ]),
      rounded([
        [108, 19.2, 0],
        [103.4, 8, 2.4],
        [99.6, 8.4, 1.8],
        [95.4, 18.6, 2.4],
      ]),
      // La carena, el depósito y el asiento del piloto.
      flow([
        [95.4, 18.6],
        [89, 21],
        [80, 22.4],
        [71, 24.2],
        [65, 27.4],
      ]),
      // Bajos: del baúl, por el motor, hasta el morro.
      flow([
        [65, 27.4],
        [66.6, 33],
        [67.4, 43],
        [69, 48.6],
        [76, 51],
        [88, 50.6],
        [99, 47.4],
        [107.4, 41],
        [112, 34.6],
        [116.6, 33.6],
        [121, 32],
      ]),
      trunk,
      pannier,
      ...fork(114, front.cy, 108.8, 31),
      ring(114, front.cy, 15.8, -112, -30),
    ],
    glass: [],
    detail: [
      lamp([111, 22.6], [118, 25.8], [116.8, 28.6], [109.6, 26]),
      lamp([102.4, 27.4], [107.6, 29.8], [106.8, 32.4], [101.6, 30]),
      line(103.6, 13, 110.2, 19.8),
      line(97.4, 12.6, 98.6, 19),
      // Panel lateral del carenado y su rejilla.
      flow([
        [95.4, 18.6],
        [97.6, 25.4],
        [96.4, 34],
        [100.8, 41.4],
      ]),
      line(100.4, 30.6, 103.6, 34),
      line(102, 29, 105.2, 32.4),
      // Asiento corrido, tapa del baúl, piloto.
      flow([
        [88, 22.6],
        [72, 26.8],
        [64.6, 28.2],
      ]),
      line(29.4, 23, 62.8, 23.2),
      lamp([28.2, 20.6], [31.2, 20.8], [31, 27], [28.4, 26.8]),
      // El motor, entre las dos ruedas.
      block(2, [74, 40], [92, 39.4], [93, 46.6], [75, 47]),
      line(75, 43.2, 92.4, 42.8),
      line(70, 51.2, 88, 51.2),
      block(1, [67.6, 40.4], [50.8, 42], [50.8, 45.2], [67.6, 45]),
      ...disc(114, front.cy),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 27.6, right: 121, top: 8 }),
    wheels: [rear, front],
    occlude: [pannier],
  };
}

// ---------------------------------------------------------------------------
// ADV: rueda delantera alta, pico, parabrisas alto y depósito ancho.
// ---------------------------------------------------------------------------

function adv(): Sketch {
  const rear = wheel(48, 14, { spokes: 14 });
  const front = wheel(114, 15.4, { spokes: 14 });
  const can = block(2, [34, 28.6], [56, 32.6], [56, 37.2], [35, 33.4]);

  return {
    body: [
      // El faro y el parabrisas alto.
      flow([
        [118, 19.6],
        [114.6, 17.4],
        [110.4, 16],
        [106.4, 14.8],
      ]),
      rounded([
        [106.4, 14.8, 0],
        [102.2, 4.8, 2],
        [99, 5.2, 1.6],
        [95.6, 13.6, 2],
      ]),
      // Depósito ancho, asiento largo y portabultos.
      flow([
        [95.6, 13.6],
        [90, 14],
        [82, 15.4],
        [74, 16.2],
        [67.6, 19.4],
        [61, 21.4],
        [53, 21.2],
        [45, 19.8],
        [39, 17.6],
        [33, 17],
      ]),
      rounded([
        [33, 17, 0],
        [26.6, 16.8, 1.6],
        [26.4, 19.6, 1.6],
        [33, 21.4, 0],
      ]),
      // Bajos, con la protección del cárter.
      flow([
        [33, 21.4],
        [40, 23.6],
        [50, 25.8],
        [58, 28],
        [63, 31.6],
        [64, 40],
        [64.8, 45.6],
        [68, 49.6],
        [76, 51.4],
        [86, 51.2],
        [95, 48.2],
        [101.6, 43.2],
        [104.4, 37],
        [107, 29.6],
        [110, 24],
        [114, 21.8],
        [118, 19.6],
      ]),
      // El pico: el guardabarros alto, muy por encima de la rueda.
      flow([
        [104.6, 30.4],
        [108.6, 25.8],
        [115, 24.2],
        [121, 25.2],
        [125.6, 28.6],
      ]),
      can,
      ...fork(114, front.cy, 107.2, 28.6),
    ],
    glass: [],
    detail: [
      lamp([109, 18.8], [114.4, 20.6], [112.6, 23.8], [107.6, 22.2]),
      // Manillar con protector de manos.
      flow([
        [103, 14.8],
        [99.4, 11.2],
        [92.6, 11.8],
      ]),
      // Panel del depósito, defensa y cubrecárter.
      flow([
        [95.6, 13.6],
        [98, 22],
        [97, 30],
        [99.8, 36.4],
      ]),
      flow([
        [104.6, 29],
        [108, 35.4],
        [104.6, 44.6],
        [94, 50],
      ]),
      block(3, [68, 33.6], [92, 32.8], [94, 42], [88, 48], [68.6, 48.4]),
      line(90, 50.6, 66, 50.6),
      line(66, 36.4, 60, 42),
      // Portaequipajes y piloto.
      line(28, 19.8, 48, 22.4),
      lamp([25.4, 21], [28, 20.8], [27.8, 26], [25.6, 26]),
      block(1, [66.6, 40.8], [48.6, 42.2], [48.6, 45.4], [66.6, 45]),
      ring(48, rear.cy, 16, -170, -92),
      ...disc(114, front.cy, 9.4),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 26, right: 125.6, top: 4.8 }),
    wheels: [rear, front],
    occlude: [can],
  };
}

// ---------------------------------------------------------------------------
// Enduro: delgada y alta, guardabarros separado, tacos y escape alto.
// ---------------------------------------------------------------------------

function enduro(): Sketch {
  const rear = wheel(48, 14, { spokes: 14, knobby: true });
  const front = wheel(114, 15.4, { spokes: 14, knobby: true });
  const silencer = block(2, [28, 27.2], [57, 31.6], [57, 36.4], [29, 32.4]);

  return {
    body: [
      // Depósito delgado.
      flow([
        [98, 19.2],
        [92, 16.6],
        [84, 16.2],
        [76, 17.8],
        [70, 20.8],
        [67.6, 23.4],
      ]),
      flow([
        [98, 19.2],
        [96.6, 23],
        [90, 26.4],
        [80, 27.8],
        [72, 27],
        [67.6, 23.4],
      ]),
      // Radiadores que flanquean el depósito.
      block(2, [98, 19.2], [103.4, 22], [102.6, 31.4], [96.6, 27.6]),
      // Asiento plano y guardabarros trasero levantado.
      flow([
        [69, 21],
        [60, 21.6],
        [50, 21.4],
        [40, 21.2],
        [33, 20.2],
      ]),
      rounded([
        [33, 20.2, 0],
        [26, 22, 2],
        [28.6, 25.8, 2],
      ]),
      flow([
        [28.6, 25.8],
        [40, 25.4],
        [52, 25],
        [62, 25.6],
        [67.6, 25.8],
      ]),
      // Guardabarros delantero, alto y despegado de la rueda.
      flow([
        [105.4, 25.6],
        [110.4, 19.2],
        [117, 17.6],
        [122.6, 19.8],
        [125.8, 24.6],
      ]),
      // Motor y silenciador.
      block(3, [68, 29.4], [91, 28.6], [93, 38], [87, 46.4], [70, 47], [64, 38]),
      silencer,
      ...fork(114, front.cy, 101.6, 16.6),
    ],
    glass: [],
    detail: [
      // Placa portanúmero con el faro.
      block(3, [107.8, 8.2], [113.6, 9.8], [114, 17], [108.2, 16.6]),
      flow([
        [101.6, 16.6],
        [100, 11.6],
        [96, 8.8],
        [91.2, 8.4],
      ]),
      line(96.8, 11.6, 101.2, 11.6),
      // Escape, protector del cárter y basculante largo.
      flow([
        [90, 33],
        [96, 37],
        [94.4, 44.6],
        [82, 47.4],
      ]),
      line(90, 48.6, 66, 48.6),
      block(1, [66, 40.8], [48.6, 42.2], [48.6, 45.4], [66, 45]),
      line(66, 39.6, 48.6, 40.8),
      ring(48, rear.cy, 16, -170, -100),
      ...disc(114, front.cy, 9.4),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 26, right: 125.8, top: 8.2 }),
    wheels: [rear, front],
    occlude: [silencer],
  };
}

// ---------------------------------------------------------------------------
// Cruiser: larga y baja, horquilla muy abierta, depósito de gota y V-twin.
// ---------------------------------------------------------------------------

function cruiser(): Sketch {
  const rear = wheel(42, 12.6, { spokes: 16 });
  const front = wheel(116, 13, { spokes: 16 });

  return {
    body: [
      // Depósito de gota.
      flow([
        [98, 21],
        [93, 17.4],
        [85, 16.2],
        [77, 17.4],
        [73, 21.6],
      ]),
      flow([
        [98, 21],
        [97, 25.2],
        [91, 28.4],
        [82, 29],
        [75, 27.4],
        [73, 21.6],
      ]),
      // Asiento bajo, con su grosor.
      flow([
        [73, 26.4],
        [66, 27.8],
        [58, 27],
        [51, 25.2],
        [47, 23.8],
      ]),
      flow([
        [73, 28.6],
        [66, 31],
        [56, 31.2],
        [49, 28.6],
        [47, 23.8],
      ]),
      // Guardabarros con faldón.
      ring(116, front.cy, 15.2, -170, -14),
      ring(42, rear.cy, 14.8, -198, -20),
      ...fork(116, front.cy, 102, 20.8),
      // Manillar retrasado y faro.
      flow([
        [102, 20.8],
        [102, 15],
        [98, 11.6],
        [91, 11.4],
        [86, 14.4],
      ]),
      circle(110.8, 24.4, 4.8),
    ],
    glass: [],
    detail: [
      circle(110.8, 24.4, 3),
      // V-twin: dos cilindros en V sobre el cárter.
      block(1.4, [73, 46], [80, 46], [93, 32], [86, 30.6]),
      block(1.4, [80, 46], [86, 46], [72, 31], [65.6, 32.4]),
      line(77.4, 41, 89.6, 34.4),
      line(79.6, 43.6, 91.6, 36.8),
      line(81, 40, 70.4, 34.6),
      line(82.4, 43, 72, 37.4),
      block(3, [66, 46.4], [92, 46.4], [92, 51.4], [66, 51.4]),
      // Escapes.
      flow([
        [92, 38],
        [96, 46],
        [88, 51.6],
        [72, 53],
        [56, 52.6],
        [38, 50],
      ]),
      flow([
        [60, 44.8],
        [52, 46.4],
        [44, 45.2],
      ]),
      line(47, 31, 44, 42),
      // Bastidor: el tubo que baja de la dirección al motor y el que une el
      // asiento con el basculante, para que el depósito y el asiento no floten.
      line(101.2, 23.4, 93.6, 32),
      line(99.4, 26.4, 94.6, 31),
      line(66, 31.6, 62.6, 44),
      line(54, 31.4, 50, 42.4),
      lamp([27.6, 36], [30.6, 35.8], [30.4, 41], [27.8, 41.2]),
      ...disc(116, front.cy, 8.4),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 27.4, right: 131, top: 11.4 }),
    wheels: [rear, front],
  };
}

// ---------------------------------------------------------------------------
// Scooter: ruedas pequeñas, escudo delantero y un piso en el que apoyar los pies.
// ---------------------------------------------------------------------------

function scooter(): Sketch {
  const rear = wheel(46, 8.8, { spokes: 5 });
  const front = wheel(110, 8.8, { spokes: 5 });

  return {
    body: [
      // El escudo de las piernas: de la dirección al piso, curvo hacia delante.
      flow([
        [108.4, 15.6],
        [110.6, 23.6],
        [109.6, 32],
        [105.2, 39],
        [98.6, 44],
        [91, 46.6],
      ]),
      flow([
        [97.2, 14.6],
        [98.2, 23],
        [96.4, 32],
        [91.4, 39.6],
        [84.4, 44.4],
        [76, 46.4],
      ]),
      // Piso.
      flow([
        [91, 46.6],
        [80, 47.6],
        [66, 47.2],
      ]),
      // Carrocería trasera: asiento arriba, cola abajo.
      flow([
        [66, 47.2],
        [65.4, 38],
        [63.6, 31],
        [58, 27.4],
        [50, 26],
        [42, 26.6],
        [36, 29.6],
      ]),
      flow([
        [36, 29.6],
        [33.4, 34.6],
        [33.8, 40.4],
        [35.4, 45.4],
      ]),
      // El arco de la rueda trasera y el guardabarros delantero.
      ring(46, rear.cy, 11, -165, -20),
      flow([
        [56.3, 44.4],
        [60, 46.4],
        [66, 47.2],
      ]),
      ring(110, front.cy, 11, -172, -18),
      ...fork(110, front.cy, 103.6, 24),
    ],
    glass: [],
    detail: [
      // Asiento, piloto y la línea de carácter del flanco.
      flow([
        [65, 31],
        [58, 29.4],
        [50, 28.8],
        [42, 29.6],
        [36.6, 31.8],
      ]),
      lamp([34.4, 30], [37.4, 30.4], [36.8, 35], [34.4, 34.8]),
      // Cabezal: faro redondo, manillar, espejo y parabrisas.
      lamp([102.4, 11.4], [108.6, 13], [108.2, 19], [102.6, 17.6]),
      flow([
        [101, 11.6],
        [97.4, 9.4],
        [91, 9.8],
      ]),
      line(95.2, 9.4, 93.6, 4.8),
      lamp([92, 3.6], [95, 3.4], [95.2, 5.6], [92.2, 5.8]),
      flow([
        [99.6, 14.2],
        [97.6, 7.6],
        [94.4, 6.4],
      ]),
      // Grupo motor, escape y basculante.
      block(1.6, [56, 46.6], [72, 49.4], [72, 52.6], [57, 50]),
      line(66, 44.4, 46, 48.2),
      line(63, 38, 58.6, 46),
      line(88, 45.4, 70, 45.6),
      ...disc(110, front.cy, 5.6),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 33.4, right: 112, top: 3.4 }),
    wheels: [rear, front],
  };
}

export const motoSketches = {
  adv,
  sport,
  naked,
  touring,
  enduro,
  cruiser,
  scooter,
} as const;
