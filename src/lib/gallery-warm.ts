/**
 * En qué orden se precargan las fotografías de la galería.
 *
 * Cambiar de foto tiene que ser instantáneo: la siguiente ya debe estar en el
 * navegador cuando se pulsa la flecha. Lo que se pide es lo más cercano a la
 * que se ve, en las dos direcciones —la siguiente, la anterior, la siguiente de
 * la siguiente…—, porque una galería se recorre hacia delante y hacia atrás, y
 * después el resto. La foto que ya se ve no entra: ya está.
 *
 * Es una función aparte, sin navegador, para poder fijar ese orden con una
 * prueba.
 */
export function warmOrder(current: number, total: number): number[] {
  const order: number[] = [];
  const seen = new Set<number>([current]);
  for (let distance = 1; distance < total; distance += 1) {
    for (const index of [(current + distance) % total, (current - distance + total * 2) % total]) {
      if (!seen.has(index)) {
        seen.add(index);
        order.push(index);
      }
    }
  }
  return order;
}
