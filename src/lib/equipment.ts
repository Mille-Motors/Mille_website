import type { VehicleType } from "@/types/vehicle";

/**
 * El equipamiento, como texto.
 *
 * Antes era un catálogo cerrado de ochenta casillas. Buscar una opción entre
 * decenas de checkboxes salía más lento que escribirla, y el catálogo no
 * podía nombrar una suspensión Skyhook, unas pinzas Brembo Stylema ni un
 * escape Akrapovič: para motos no servía casi de nada, y para carros
 * obligaba a dejar fuera todo lo que no estuviera previsto.
 *
 * Ahora se escribe. Una línea por elemento, y una línea entre corchetes
 * abre una sección:
 *
 *     [Frenos]
 *     Brembo Stylema M4.30
 *     Disco trasero de 265 mm
 *
 * La plantilla es un punto de partida distinto para carro y para moto, y es
 * exactamente eso: un punto de partida. Que una línea esté en la plantilla
 * no significa que el vehículo lo tenga, así que las que se dejen sin
 * rellenar —"ABS:" sin nada detrás— no se guardan.
 */

/** Una línea `[Algo]` a secas abre sección. Es el formato canónico. */
const SECTION = /^\[([^\]]+)\]\s*$/;

/**
 * `[Algo] un elemento`: cabecera y elemento en la misma línea.
 *
 * Es el formato que dejó la migración que convirtió el catálogo de casillas
 * a texto —`[Frenos] Brembo Stylema`— porque en SQL era lo más simple de
 * producir. Se lee, pero no se escribe: en cuanto el vehículo se vuelve a
 * guardar queda en el formato canónico de dos líneas.
 *
 * La migración ya está aplicada y no se toca para arreglar esto: reescribir
 * una migración aplicada rompe su checksum y no arregla las bases donde ya
 * corrió. La compatibilidad va en el código, que es donde puede convivir
 * con los dos formatos.
 */
const INLINE_SECTION = /^\[([^\]]+)\]\s*(.+)$/;

/** Una línea `Etiqueta:` sin nada detrás es un hueco de la plantilla. */
const EMPTY_TEMPLATE_LINE = /^[^:]+:\s*$/;

export interface EquipmentSection {
  /** `null` en lo que se escribió antes de abrir ninguna sección. */
  title: string | null;
  items: string[];
}

/**
 * De lo que se escribe en el formulario a lo que se guarda.
 *
 * Descarta las líneas en blanco y los huecos de la plantilla, de modo que
 * cargarla y guardar sin tocar nada no deja ni un elemento inventado. Una
 * sección que se queda sin elementos también se cae: un título suelto no es
 * equipamiento.
 */
export function equipmentLinesFromText(text: string): string[] {
  const kept: string[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    // Un hueco de la plantilla que nadie rellenó. Se descarta antes de
    // agrupar para que no abra una sección él solo.
    if (EMPTY_TEMPLATE_LINE.test(line)) continue;
    kept.push(line);
  }

  // Agrupar y volver a aplanar hace tres cosas de una vez: tira las
  // secciones que se quedaron sin elementos, funde las líneas legacy
  // consecutivas de la misma sección y deja TODO en formato canónico. Por
  // eso el siguiente guardado normaliza lo migrado sin perder nada.
  return canonicalLines(kept);
}

/**
 * El camino de vuelta, para cargar el formulario.
 *
 * Normaliza de paso: el equipamiento que dejó la migración —`[Exterior]
 * Faros LED` repetido una vez por elemento— se le presenta a quien edita
 * como la sección y sus elementos debajo, que es lo que esperaría ver y lo
 * que va a volver a guardar.
 */
export function equipmentTextFromLines(lines: string[]): string {
  return canonicalLines(lines).join("\n");
}

/**
 * Las mismas secciones, escritas en el formato canónico de dos líneas.
 *
 * Es la operación que convierte lo legacy en lo nuevo, y es idempotente:
 * aplicarla sobre algo ya canónico lo deja igual.
 */
function canonicalLines(lines: string[]): string[] {
  return equipmentSections(lines).flatMap((section) =>
    section.title === null
      ? section.items
      : [`[${section.title}]`, ...section.items],
  );
}

/**
 * Lo que la ficha pública dibuja: secciones con sus elementos.
 *
 * Lo que venga sin sección —texto escrito antes de que existieran, o la
 * lista libre de siempre— cae en un grupo sin título, que se renderiza igual
 * pero sin epígrafe.
 */
export function equipmentSections(lines: string[]): EquipmentSection[] {
  const sections: EquipmentSection[] = [];
  const open = () => sections[sections.length - 1] as
    | EquipmentSection
    | undefined;

  /**
   * La sección en la que escribir, abriéndola si hace falta.
   *
   * Reutiliza la que está abierta cuando el título coincide, que es lo que
   * funde las líneas legacy consecutivas —`[Exterior] Faros LED` seguido de
   * `[Exterior] Techo`— en una sola sección con dos elementos. Un título
   * distinto abre otra.
   */
  const sectionFor = (title: string | null): EquipmentSection => {
    const last = open();
    if (last && last.title === title) return last;
    const created: EquipmentSection = { title, items: [] };
    sections.push(created);
    return created;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") continue;

    const header = SECTION.exec(line);
    if (header) {
      sectionFor(header[1].trim());
      continue;
    }

    // Formato legacy: cabecera y elemento en la misma línea.
    const inline = INLINE_SECTION.exec(line);
    if (inline) {
      sectionFor(inline[1].trim()).items.push(inline[2].trim());
      continue;
    }

    // Una línea suelta pertenece a la sección que esté abierta, o a
    // ninguna si todavía no se abrió ninguna.
    sectionFor(open()?.title ?? null).items.push(line);
  }

  return sections.filter((section) => section.items.length > 0);
}

/**
 * La plantilla de un carro. Sugiere por dónde mirar; no afirma que el
 * vehículo tenga nada.
 */
const CAR_TEMPLATE = `[Exterior]
Rines:
Faros:
Techo:
Paquete exterior:

[Interior y confort]
Asientos:
Memorias:
Calefacción / ventilación:
Climatización:
Acceso y encendido:

[Infotainment]
Pantalla:
Apple CarPlay / Android Auto:
Audio:
Navegación:
Cargador:

[Seguridad y ADAS]
Cámaras:
Sensores:
Control crucero:
Punto ciego:
Asistente de carril:
Frenado autónomo:

[Performance / Off-road]
Suspensión:
Frenos:
Diferenciales:
Modos de conducción:
Otros:`;

/**
 * La de una moto, que no es la del carro con otras palabras: electrónica de
 * ayudas, suspensión por extremos, frenos por eje, rines y neumáticos,
 * instrumentación y accesorios de viaje.
 */
const MOTO_TEMPLATE = `[Electrónica y ayudas]
ABS:
ABS en curva:
Control de tracción:
Wheelie control:
Launch control:
Engine brake control:
Modos de conducción:

[Transmisión y control]
Quickshifter:
Quickshifter up/down:
Embrague antirrebote:
Ride-by-wire:

[Suspensión y chasis]
Suspensión delantera:
Suspensión trasera:
Ajuste electrónico / semiactivo:

[Frenos]
Freno delantero:
Freno trasero:
Marca / pinzas:

[Rines y neumáticos]
Rin delantero:
Rin trasero:
Neumático delantero:
Neumático trasero:

[Iluminación e instrumentación]
Iluminación LED:
Cornering lights:
Pantalla TFT:
Conectividad:
TPMS:

[Confort / Touring]
Control crucero:
Puños calefactables:
Asiento calefactable:
Parabrisas ajustable:
Maletas:
Top case:
Caballete central:
USB / carga:

[Accesorios / especiales]
Escape:
Protecciones:
Handguards:
Skid plate:
Carbono:
Otros:`;

export function equipmentTemplate(vehicleType: VehicleType): string {
  return vehicleType === "moto" ? MOTO_TEMPLATE : CAR_TEMPLATE;
}
