import {
  GROUND,
  arch,
  curve,
  line,
  planGuides,
  rounded,
  type Vertex,
} from "@/components/vehicle/sketch/geometry";
import type { Sketch, Wheel } from "@/components/vehicle/sketch/types";

/**
 * Los carros, de perfil y mirando a la derecha.
 *
 * Todos comparten escala (27 unidades por metro) y suelo, así que un sedán de
 * 4,8 m mide 130 unidades y una pickup alta se ve más alta sin que nadie lo
 * decida. Las proporciones salen de carros de verdad —distancia entre ejes,
 * altura de cintura, caída del parabrisas— y no de la memoria de cómo se ve
 * "un carro".
 */

const wheel = (cx: number, r = 9.4, rim = 6.5, extra: Partial<Wheel> = {}): Wheel => ({
  cx,
  cy: GROUND - r,
  r,
  rim,
  ...extra,
});

/** Un espejo retrovisor visto de perfil, con la esquina trasera en `x`. */
const mirror = (x: number, y: number) =>
  rounded(
    [
      [x, y + 2.4, 0.6],
      [x + 1.2, y, 1],
      [x + 4.6, y + 0.3, 1.2],
      [x + 4.8, y + 2.6, 1],
    ],
    true,
  );

/** Un faro o un piloto: un polígono pequeño con las esquinas romas. */
const lamp = (...points: [number, number][]) =>
  rounded(
    points.map(([x, y]) => [x, y, 0.9] as Vertex),
    true,
  );

/** Una ventana: polígono cerrado con las esquinas suavizadas. */
const pane = (...points: Vertex[]) => rounded(points, true);

// ---------------------------------------------------------------------------
// Sedán: tres volúmenes. Maletero, habitáculo y capó.
// ---------------------------------------------------------------------------

function sedan(): Sketch {
  const rear = wheel(38);
  const front = wheel(118);
  const floorY = 50.4;
  const rearArch = arch(rear.cx, rear.cy, 11.8, floorY);
  const frontArch = arch(front.cx, front.cy, 11.8, floorY);

  return {
    body: [
      rounded([
        [rearArch.left[0], floorY],
        [16.4, floorY, 2.5],
        [14.6, 45.5, 2.5],
        [14.2, 38.6, 3],
        [15.4, 31.4, 3.5],
        [32, 30.2, 6],
        [50, 20.6, 11],
        [64, 18.2, 14],
        [82, 19.4, 10],
        [106.5, 30.4, 4],
        [140, 35.4, 3.5],
        [144, 39.6, 3],
        [144.2, 46.6, 3],
        [142.6, floorY, 2.5],
        [frontArch.right[0], floorY],
      ]),
      rearArch.d,
      frontArch.d,
      line(rearArch.right[0], floorY, frontArch.left[0], floorY),
    ],
    glass: [
      pane([37.4, 29.6, 1.5], [52.6, 22.4, 4], [68.8, 20.6, 6], [69.8, 29.6, 1.2]),
      pane([72.6, 29.6, 1.2], [71.8, 20.7, 3], [81.6, 21.8, 4], [100.4, 29.6, 1.5]),
    ],
    detail: [
      // Cortes de puerta: los dos extremos mueren en el paso de rueda.
      line(104.4, 31.2, 109, 40.9),
      line(71.2, 30.2, 71.6, 48.8),
      line(46, 31.6, 49, 41.2),
      // Manijas.
      line(76.2, 34.4, 82.4, 34.4),
      line(55.2, 34.4, 61.2, 34.4),
      // Línea de carácter y umbral.
      curve(136, 37.2, 118, 32.9, 100, 33.2),
      line(100, 33.2, 21, 33.6),
      line(52.5, 48.4, 104, 48.4),
      mirror(102, 27.6),
      lamp([138.6, 36.6], [143.4, 38.8], [143.4, 41.6], [135.4, 40.4]),
      lamp([14.9, 34], [20.6, 33.4], [20.6, 36.6], [14.7, 37.4]),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 14.2, right: 144.2, top: 18.2 }),
    wheels: [rear, front],
  };
}

// ---------------------------------------------------------------------------
// Hatchback: dos volúmenes. El techo llega casi hasta la cola.
// ---------------------------------------------------------------------------

function hatchback(): Sketch {
  const rear = wheel(46, 9.2, 6.3);
  const front = wheel(117, 9.2, 6.3);
  const floorY = 50.2;
  const rearArch = arch(rear.cx, rear.cy, 11.6, floorY);
  const frontArch = arch(front.cx, front.cy, 11.6, floorY);

  return {
    body: [
      rounded([
        [rearArch.left[0], floorY],
        [25, floorY, 2.5],
        [23, 45, 2.5],
        [22.4, 37.5, 3],
        [23.2, 30.5, 3],
        [36.4, 19.6, 7],
        [46, 17.4, 12],
        [72, 17.2, 14],
        [86, 19, 9],
        [104.8, 30.2, 4],
        [135.4, 35, 3.5],
        [138.4, 39.4, 3],
        [138.6, 46.4, 3],
        [137, floorY, 2.5],
        [frontArch.right[0], floorY],
      ]),
      rearArch.d,
      frontArch.d,
      line(rearArch.right[0], floorY, frontArch.left[0], floorY),
    ],
    glass: [
      // La ventana trasera se prolonga hacia el portón: un solo cristal
      // largo, como en un dos volúmenes.
      pane([33.4, 29.2, 1.4], [38.8, 21.2, 4], [68.4, 20.1, 4], [69.4, 29.2, 1.2]),
      pane([72.2, 29.2, 1.2], [71.6, 20.3, 3], [83.8, 21.2, 4], [99.6, 29.2, 1.4]),
    ],
    detail: [
      line(100.6, 31, 105.2, 40.8),
      line(70.8, 29.8, 71.2, 48.6),
      line(51.2, 31, 53.6, 41),
      line(75.6, 34, 81.6, 34),
      line(57.6, 34, 63.6, 34),
      curve(132, 36.6, 114, 32.7, 98, 33),
      line(98, 33, 26, 33.4),
      line(55, 48.2, 100, 48.2),
      mirror(98.4, 27),
      lamp([134, 36.4], [138, 38.6], [138, 41.2], [131, 40]),
      lamp([23.2, 32.4], [26.8, 32.4], [26.8, 36.2], [22.8, 36.4]),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 22.4, right: 138.6, top: 17.2 }),
    wheels: [rear, front],
  };
}

// ---------------------------------------------------------------------------
// Coupé: bajo, cabina retrasada, capó largo y una sola puerta larga.
// ---------------------------------------------------------------------------

function coupeLower() {
  const rear = wheel(37.5, 10, 7.2);
  const front = wheel(119.5, 10, 7.2);
  const floorY = 51;
  return {
    rear,
    front,
    floorY,
    rearArch: arch(rear.cx, rear.cy, 12.4, floorY),
    frontArch: arch(front.cx, front.cy, 12.4, floorY),
  };
}

function coupe(): Sketch {
  const { rear, front, floorY, rearArch, frontArch } = coupeLower();

  return {
    body: [
      rounded([
        [rearArch.left[0], floorY],
        [16, floorY, 2.5],
        [14.4, 46.5, 2.5],
        [14.1, 40, 3],
        [15.6, 34.2, 3.5],
        [30, 32.8, 6],
        [56, 21.6, 14],
        [71, 19.4, 13],
        [90, 20.6, 9],
        [111, 31.8, 5],
        [141, 38.4, 3.5],
        [145, 43.4, 3],
        [144.6, 48, 3],
        [143, floorY, 2.5],
        [frontArch.right[0], floorY],
      ]),
      rearArch.d,
      frontArch.d,
      line(rearArch.right[0], floorY, frontArch.left[0], floorY),
    ],
    glass: [
      // Cristal sin marco, de una pieza, y una aleta pequeña detrás.
      pane([40, 31.7, 1.5], [58.6, 23.4, 6], [70.6, 21.7, 6], [88.6, 22.6, 3], [106, 31.7, 1.5]),
    ],
    detail: [
      line(107.4, 33, 110.6, 42),
      line(57.2, 33.2, 52.8, 44.4),
      line(61, 36.2, 67, 36.2),
      curve(138, 40, 120, 35.4, 102, 35.2),
      line(102, 35.2, 20, 36),
      line(52, 49, 106, 49),
      mirror(104, 28),
      lamp([133, 38.8], [144, 41.6], [143.6, 43.4], [135, 41.6]),
      lamp([15.2, 36.6], [20.6, 35.4], [20.4, 38.2], [15, 39]),
      line(137, 49.4, 144.4, 49.4),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 14.1, right: 144.6, top: 19.4 }),
    wheels: [rear, front],
  };
}

// ---------------------------------------------------------------------------
// Cabrio: el mismo cuerpo del coupé con el techo quitado. Se dibuja el
// habitáculo abierto: el parabrisas solo, los asientos y el volante.
// ---------------------------------------------------------------------------

function cabrio(): Sketch {
  const { rear, front, floorY, rearArch, frontArch } = coupeLower();

  return {
    body: [
      rounded([
        [rearArch.left[0], floorY],
        [16, floorY, 2.5],
        [14.4, 46.5, 2.5],
        [14.1, 40, 3],
        [15.6, 34.2, 3.5],
        [32, 32.8, 6],
        [44, 32.2, 3],
        [108, 31.8, 5],
        [141, 38.4, 3.5],
        [145, 43.4, 3],
        [144.6, 48, 3],
        [143, floorY, 2.5],
        [frontArch.right[0], floorY],
      ]),
      rearArch.d,
      frontArch.d,
      line(rearArch.right[0], floorY, frontArch.left[0], floorY),
    ],
    glass: [
      // Solo el marco del parabrisas, que queda en pie sin techo detrás.
      pane([109, 31.8, 1], [94, 21.4, 1.6], [90.6, 21.9, 1.6], [105.6, 32, 1]),
    ],
    detail: [
      // El asiento: respaldo, reposacabezas y el volante.
      line(66.6, 32.2, 65.2, 26.6),
      line(74, 32.2, 69.2, 26.6),
      pane([64.4, 26.4, 1.2], [65, 22.8, 1.6], [68.8, 22.6, 1.6], [68.6, 26.6, 1.2]),
      pane([92.2, 27.8, 1], [93.8, 26.6, 1], [95.2, 29.4, 1], [93.6, 30.6, 1]),
      line(94.4, 29.8, 98.4, 32),
      // El arco antivuelco, detrás de los asientos.
      rounded([
        [46, 32.2, 0],
        [47.2, 29.4, 3],
        [53.4, 29, 3],
        [55.4, 32.2, 0],
      ]),
      line(107.4, 33, 110.6, 42),
      line(57.2, 33.4, 52.8, 44.4),
      line(76, 35.6, 82, 35.6),
      curve(138, 40, 120, 35.4, 102, 35.2),
      line(102, 35.2, 20, 36),
      line(52, 49, 106, 49),
      mirror(104, 28.6),
      lamp([133, 38.8], [144, 41.6], [143.6, 43.4], [135, 41.6]),
      lamp([15.2, 36.6], [20.6, 35.4], [20.4, 38.2], [15, 39]),
      line(137, 49.4, 144.4, 49.4),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 14.1, right: 144.6, top: 21.4 }),
    wheels: [rear, front],
  };
}


// ---------------------------------------------------------------------------
// Wagon: el techo sigue hasta la cola y el portón baja casi vertical.
// ---------------------------------------------------------------------------

function wagon(): Sketch {
  const rear = wheel(39);
  const front = wheel(118);
  const floorY = 50.4;
  const rearArch = arch(rear.cx, rear.cy, 11.8, floorY);
  const frontArch = arch(front.cx, front.cy, 11.8, floorY);

  return {
    body: [
      rounded([
        [rearArch.left[0], floorY],
        [17, floorY, 2.5],
        [15.2, 45.5, 2.5],
        [14.6, 36.8, 3],
        [15.4, 27.4, 3],
        [19.6, 19.8, 8],
        [27, 17.8, 12],
        [66, 17.8, 14],
        [84, 19.2, 10],
        [107.4, 30.4, 4],
        [140.6, 35.4, 3.5],
        [144, 39.6, 3],
        [144.2, 46.6, 3],
        [142.6, floorY, 2.5],
        [frontArch.right[0], floorY],
      ]),
      rearArch.d,
      frontArch.d,
      line(rearArch.right[0], floorY, frontArch.left[0], floorY),
      // Barras de techo.
      line(30, 16.2, 84, 16.2),
      line(34, 16.2, 34, 17.9),
      line(80, 16.2, 80, 18.4),
    ],
    glass: [
      // Tres ventanas: el cristal del maletero cierra la fila hacia atrás.
      pane([23.6, 29.6, 1.4], [20.8, 22, 4], [46.2, 20.6, 4], [53, 29.6, 1.2]),
      pane([56, 29.6, 1.2], [49.4, 20.5, 3], [68.6, 20.5, 4], [69.6, 29.6, 1.2]),
      pane([72.6, 29.6, 1.2], [71.8, 20.6, 3], [82, 21.6, 4], [101, 29.6, 1.5]),
    ],
    detail: [
      line(104.6, 31.2, 109.4, 40.9),
      line(71.2, 30.2, 71.6, 48.8),
      line(54.4, 30.2, 54.8, 48.8),
      line(76.2, 34.4, 82.6, 34.4),
      line(58, 34.4, 64.4, 34.4),
      curve(137, 37.2, 118, 32.9, 100, 33.2),
      line(100, 33.2, 17.4, 33.4),
      line(55.5, 48.4, 104, 48.4),
      mirror(102.4, 27.6),
      lamp([138.8, 36.6], [143.4, 38.8], [143.4, 41.6], [135.6, 40.4]),
      lamp([15.6, 29.4], [18.8, 28.8], [18.8, 36.6], [15.2, 37.2]),
      // Los pilares: la silueta del portón.
      line(15.6, 27.6, 19, 21),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 14.6, right: 144.2, top: 16.2 }),
    wheels: [rear, front],
  };
}

// ---------------------------------------------------------------------------
// Camioneta: techo alto y plano, voladizos cortos y más luz al suelo.
// ---------------------------------------------------------------------------

function camioneta(): Sketch {
  const rear = wheel(37.5, 10.6, 7.3);
  const front = wheel(118, 10.6, 7.3);
  const floorY = 48.6;
  const rearArch = arch(rear.cx, rear.cy, 13.2, floorY);
  const frontArch = arch(front.cx, front.cy, 13.2, floorY);

  return {
    body: [
      rounded([
        [rearArch.left[0], floorY],
        [17, floorY, 2.5],
        [14.4, 44, 2.5],
        [13.6, 36, 3],
        [14.6, 27, 3],
        [18.6, 13, 8],
        [26, 9.6, 12],
        [76, 9.2, 12],
        [96, 10.6, 10],
        [111.4, 27.6, 5],
        [141.4, 30.8, 4],
        [144.8, 34.6, 3.5],
        [144.6, 45.6, 3],
        [143.4, 50, 2.5],
        [frontArch.right[0], floorY],
      ]),
      rearArch.d,
      frontArch.d,
      line(rearArch.right[0], floorY, frontArch.left[0], floorY),
      // Barras de techo.
      line(28, 7.6, 90, 7.6),
      line(32, 7.6, 32, 9.4),
      line(86, 7.6, 86, 9.4),
    ],
    glass: [
      pane([22, 26.4, 1.4], [20.2, 14.2, 4], [47, 12.4, 4], [51.4, 26.4, 1.2]),
      pane([54.4, 26.4, 1.2], [53.4, 12.4, 3], [72.4, 12.2, 4], [73.4, 26.4, 1.2]),
      pane([76.4, 26.4, 1.2], [75.8, 12.4, 3], [92, 13.2, 4], [106.4, 26.4, 1.5]),
    ],
    detail: [
      // Pasos de rueda con moldura: el segundo arco, más amplio.
      rounded([
        [rearArch.left[0] - 2.2, floorY - 1],
        [rear.cx - 15, rear.cy - 3, 6],
        [rear.cx, rear.cy - 15.4, 14],
        [rear.cx + 15, rear.cy - 3, 6],
        [rearArch.right[0] + 2.2, floorY - 1],
      ]),
      rounded([
        [frontArch.left[0] - 2.2, floorY - 1],
        [front.cx - 15, front.cy - 3, 6],
        [front.cx, front.cy - 15.4, 14],
        [front.cx + 15, front.cy - 3, 6],
        [frontArch.right[0] + 2.2, floorY - 1],
      ]),
      line(108, 28.4, 112, 36.4),
      line(74.6, 27.2, 75, 46.4),
      line(52.8, 27.2, 53.2, 46.4),
      line(79.4, 31.4, 85.4, 31.4),
      line(57.4, 31.4, 63.4, 31.4),
      curve(138.4, 32.6, 120, 29.2, 104, 29.4),
      line(104, 29.4, 18, 30.4),
      line(54, 45.8, 102, 45.8),
      mirror(105.4, 25.4),
      lamp([138.8, 32.2], [144, 33.8], [144, 37], [135.8, 36]),
      lamp([14.2, 28.4], [18, 28], [18, 33.6], [14, 34.4]),
      // Protección de bajos, delante.
      line(133, 47.8, 143.4, 47.8),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 13.6, right: 144.8, top: 7.6 }),
    wheels: [rear, front],
  };
}

// ---------------------------------------------------------------------------
// Pickup: cabina y platón, dos cuerpos separados por el panel trasero.
// ---------------------------------------------------------------------------

function pickup(): Sketch {
  const rear = wheel(40, 10.8, 7.4);
  const front = wheel(122, 10.8, 7.4);
  const floorY = 48.8;
  const rearArch = arch(rear.cx, rear.cy, 13.2, floorY);
  const frontArch = arch(front.cx, front.cy, 13.2, floorY);

  return {
    body: [
      rounded([
        [rearArch.left[0], floorY],
        [14, floorY, 2.5],
        [11.4, 44.4, 2.5],
        [10.6, 28.4, 2.5],
        // El borde del platón, plano, hasta el panel de la cabina.
        [58, 27.8, 2],
        [58.8, 24, 2],
        [60.2, 11.2, 6],
        [66.6, 7.6, 10],
        [98, 7.6, 10],
        [116, 25.8, 5],
        [146, 28.8, 4],
        [149.6, 32.8, 3.5],
        [149.4, 45.6, 3],
        [148, 50, 2.5],
        [frontArch.right[0], floorY],
      ]),
      rearArch.d,
      frontArch.d,
      line(rearArch.right[0], floorY, frontArch.left[0], floorY),
    ],
    glass: [
      pane([64.6, 25.4, 1.2], [64, 12.6, 3], [79.4, 12, 3], [80.4, 25.4, 1.2]),
      pane([83.4, 25.4, 1.2], [82.8, 12, 3], [96.8, 12.6, 4], [111, 25.4, 1.5]),
    ],
    detail: [
      // El interior del platón: el borde superior, el piso y el portón.
      line(11.6, 32.4, 56.6, 32.4),
      line(13.4, 41, 25.6, 41),
      line(11, 28.4, 13.4, 41),
      line(56.8, 28.2, 56.8, 33),
      rounded([
        [14, 28.4, 0],
        [16.2, 31.6, 2],
        [55, 31.6, 2],
        [56.4, 28.6, 0],
      ]),
      line(113, 28, 117, 36),
      line(81.8, 26, 82.2, 46.8),
      line(62, 25.6, 62.4, 46.8),
      line(86.4, 30.6, 92.4, 30.6),
      line(66.4, 30.6, 72.4, 30.6),
      curve(143, 31, 125, 28.4, 108, 29),
      line(108, 29, 62, 30),
      line(62, 45.8, 112, 45.8),
      mirror(110, 24.4),
      lamp([144.4, 30.6], [149, 32.4], [149, 36], [141, 34.8]),
      lamp([10.8, 29.6], [13.4, 29.4], [13.6, 33], [10.8, 33.4]),
      line(140, 47.8, 149, 47.8),
    ],
    guide: planGuides({ rear: rear.cx, front: front.cx, left: 10.6, right: 149.6, top: 7.6 }),
    wheels: [rear, front],
  };
}

export const carSketches = {
  camioneta,
  sedan,
  pickup,
  hatchback,
  coupe,
  cabrio,
  wagon,
} as const;
