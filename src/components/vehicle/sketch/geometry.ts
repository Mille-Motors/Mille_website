/**
 * Las herramientas con las que se dibujan los bocetos.
 *
 * Un boceto de diseño es, sobre todo, líneas rectas con esquinas redondeadas
 * y unas pocas curvas con intención. `rounded()` dibuja exactamente eso a
 * partir de vértices: se escribe dónde está cada esquina y cuánto se redondea,
 * y las curvas largas —un techo, un capó— salen de una esquina con radio
 * grande, no de curvas de Bézier escritas a mano.
 *
 * Todo el dibujo vive en un lienzo de 160 × 64 unidades. El suelo está en
 * `GROUND` y todos los vehículos se apoyan en él, así que ponerlos uno al lado
 * del otro los alinea sin tocar nada.
 */

/** Anchura y altura del lienzo. */
export const CANVAS = { width: 160, height: 64 } as const;
/** La línea del suelo: donde tocan todas las ruedas. */
export const GROUND = 57;

/** Un vértice: x, y y cuánto se redondea esa esquina (0 = esquina viva). */
export type Vertex = readonly [x: number, y: number, radius?: number];

const round = (n: number) => Math.round(n * 100) / 100;
const num = (n: number) => String(round(n));

type Pt = readonly [number, number];

function toward(from: Pt, to: Pt, distance: number): Pt {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  return [from[0] + (dx / length) * distance, from[1] + (dy / length) * distance];
}

/**
 * Una línea quebrada con las esquinas redondeadas.
 *
 * Cada esquina se redondea con una curva cuadrática cuyo punto de control es
 * el vértice mismo, que es lo que un diseñador hace con la mano: entra recta,
 * dobla y sale recta. Un radio nunca consume más de la mitad de un tramo, para
 * que dos esquinas seguidas no se pisen.
 */
export function rounded(vertices: readonly Vertex[], closed = false): string {
  const n = vertices.length;
  if (n < 2) return "";
  const at = (i: number): Pt => [vertices[i][0], vertices[i][1]];

  const corner = (i: number) => {
    const v = at(i);
    const radius = vertices[i][2] ?? 0;
    const prev = at((i - 1 + n) % n);
    const next = at((i + 1) % n);
    const limit = Math.min(
      Math.hypot(v[0] - prev[0], v[1] - prev[1]),
      Math.hypot(v[0] - next[0], v[1] - next[1]),
    );
    const r = Math.min(radius, limit / 2);
    return { v, r, a: toward(v, prev, r), b: toward(v, next, r) };
  };

  const parts: string[] = [];
  const first = closed ? corner(0) : null;
  if (first && first.r > 0) parts.push(`M${num(first.b[0])} ${num(first.b[1])}`);
  else parts.push(`M${num(vertices[0][0])} ${num(vertices[0][1])}`);

  const start = closed ? 1 : 1;
  const end = closed ? n : n - 1;
  for (let i = start; i < end; i += 1) {
    const { v, r, a, b } = corner(i);
    if (r > 0) {
      parts.push(`L${num(a[0])} ${num(a[1])}Q${num(v[0])} ${num(v[1])} ${num(b[0])} ${num(b[1])}`);
    } else {
      parts.push(`L${num(v[0])} ${num(v[1])}`);
    }
  }

  if (closed) {
    if (first && first.r > 0) {
      parts.push(
        `L${num(first.a[0])} ${num(first.a[1])}Q${num(first.v[0])} ${num(first.v[1])} ${num(first.b[0])} ${num(first.b[1])}Z`,
      );
    } else {
      parts.push("Z");
    }
  } else {
    parts.push(`L${num(vertices[n - 1][0])} ${num(vertices[n - 1][1])}`);
  }
  return parts.join("");
}

/**
 * El arco del paso de rueda: sube desde la línea de los bajos, rodea la
 * rueda y baja al otro lado. Devuelve los dos extremos para encadenar el resto
 * de la carrocería con ellos.
 */
export function arch(cx: number, cy: number, radius: number, floor: number) {
  const dy = floor - cy;
  const half = Math.sqrt(Math.max(radius * radius - dy * dy, 0));
  const left: Pt = [cx - half, floor];
  const right: Pt = [cx + half, floor];
  // Si los bajos pasan por debajo del centro de la rueda, el arco que rodea
  // por arriba es mayor que media vuelta.
  const large = dy > 0 ? 1 : 0;
  return {
    left,
    right,
    d: `M${num(left[0])} ${num(left[1])}A${num(radius)} ${num(radius)} 0 ${large} 1 ${num(right[0])} ${num(right[1])}`,
  };
}

/** Un segmento recto. */
export function line(x1: number, y1: number, x2: number, y2: number): string {
  return `M${num(x1)} ${num(y1)}L${num(x2)} ${num(y2)}`;
}

/** Un círculo como trazado, para que todo el boceto sea `<path>`. */
export function circle(cx: number, cy: number, r: number): string {
  return `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(r * 2)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-r * 2)} 0Z`;
}

/** Un trazo curvo entre dos puntos, con un punto de control. */
export function curve(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
): string {
  return `M${num(x1)} ${num(y1)}Q${num(cx)} ${num(cy)} ${num(x2)} ${num(y2)}`;
}

/**
 * Un arco de circunferencia entre dos ángulos, en grados. Cero es la derecha,
 * 90 es abajo (el eje y de un SVG crece hacia abajo) y -90 es arriba, de modo
 * que un guardabarros sobre una rueda va de -170 a -20.
 */
export function ring(cx: number, cy: number, radius: number, from: number, to: number): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const start: Pt = [cx + radius * Math.cos(rad(from)), cy + radius * Math.sin(rad(from))];
  const end: Pt = [cx + radius * Math.cos(rad(to)), cy + radius * Math.sin(rad(to))];
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M${num(start[0])} ${num(start[1])}A${num(radius)} ${num(radius)} 0 ${large} ${sweep} ${num(end[0])} ${num(end[1])}`;
}

/**
 * Las líneas de construcción, que no son el vehículo sino la hoja en la que se
 * dibuja: el suelo, los ejes de las ruedas, la altura total con su cota y la
 * distancia entre ejes. Es lo que convierte una silueta en un plano.
 *
 * `left` y `right` son los extremos del vehículo; `top` es su punto más alto.
 */
export function planGuides(box: {
  rear: number;
  front: number;
  left: number;
  right: number;
  top: number;
}): string[] {
  const { rear, front, left, right, top } = box;
  const dimY = GROUND + 4.4;
  const dimX = left - 5.5;
  return [
    line(4, GROUND, 156, GROUND),
    // Ejes de las ruedas: verticales que suben hasta la línea de la altura.
    line(rear, GROUND + 1.2, rear, top),
    line(front, GROUND + 1.2, front, top),
    // Altura total: la caja en la que cabe el vehículo.
    line(dimX, top, right + 3, top),
    line(dimX, GROUND, dimX, top),
    line(dimX - 1.6, top, dimX + 1.6, top),
    line(dimX - 1.6, GROUND, dimX + 1.6, GROUND),
    // Cota de la distancia entre ejes.
    line(rear, dimY, front, dimY),
    line(rear, dimY - 1.6, rear, dimY + 1.6),
    line(front, dimY - 1.6, front, dimY + 1.6),
  ];
}

/**
 * Una curva suave que pasa por todos los puntos, abierta.
 *
 * Es lo que se hace con la mano al trazar la línea larga de un depósito o de
 * un vientre: no se piensa en esquinas redondeadas sino en una sola curva que
 * pasa por unos puntos. Catmull-Rom convertido a Bézier cúbico, de modo que
 * entra y sale de cada punto con la misma tangente y no aparecen bultos entre
 * ellos. `tension` en 1 es la curva estándar; más bajo, más tensa.
 */
export function flow(points: readonly (readonly [number, number])[], tension = 1): string {
  if (points.length < 2) return "";
  const k = tension / 6;
  let d = `M${num(points[0][0])} ${num(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${num(c1[0])} ${num(c1[1])} ${num(c2[0])} ${num(c2[1])} ${num(p2[0])} ${num(p2[1])}`;
  }
  return d;
}
