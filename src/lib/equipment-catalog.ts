/**
 * El catálogo de equipamiento.
 *
 * Por qué no son cien columnas booleanas: porque cada elemento nuevo
 * —"Laser Light", "dirección al eje trasero"— exigiría una migración, y
 * porque una fila de `Vehicle` con noventa `false` no dice nada que un
 * conjunto vacío no diga mejor.
 *
 * Por qué tampoco es una tabla de catálogo con relación muchos-a-muchos:
 * porque este catálogo no es contenido administrable. Nadie lo edita desde
 * el admin, no tiene atributos propios y no se consulta al revés ("qué
 * vehículos tienen X" se responde con un índice GIN sobre el arreglo). Una
 * tabla de unión añadiría dos joins a cada ficha a cambio de nada.
 *
 * Lo que se guarda en `Vehicle.features` son las CLAVES de esta lista. Son
 * estables: renombrar la etiqueta visible no toca la base, y una clave que
 * desaparezca del catálogo simplemente deja de dibujarse en vez de mostrar
 * un identificador suelto.
 *
 * Lo que no cabe aquí tiene dos salidas y ninguna obliga a tocar código:
 * `specialEquipment` para las opciones destacadas de esa unidad concreta, y
 * `equipment` para el texto libre.
 */
export interface EquipmentFeature {
  /** Estable. Es lo que viaja a la base. */
  key: string;
  label: string;
}

export interface EquipmentGroup {
  key: string;
  title: string;
  features: EquipmentFeature[];
}

export const EQUIPMENT_GROUPS: EquipmentGroup[] = [
  {
    key: "exterior",
    title: "Exterior",
    features: [
      { key: "led-headlights", label: "Faros LED" },
      { key: "matrix-led", label: "Matrix LED" },
      { key: "laser-light", label: "Laser Light" },
      { key: "adaptive-headlights", label: "Faros adaptativos" },
      { key: "panoramic-roof", label: "Techo panorámico" },
      { key: "sunroof", label: "Sunroof" },
      { key: "soft-top", label: "Capota de lona" },
      { key: "hardtop", label: "Techo rígido retráctil" },
      { key: "alloy-wheels", label: "Rines de aleación" },
      { key: "forged-wheels", label: "Rines forjados" },
      { key: "aero-package", label: "Paquete aerodinámico" },
      { key: "roof-rails", label: "Barras de techo" },
      { key: "side-steps", label: "Estribos laterales" },
      { key: "spoiler", label: "Spoiler" },
      { key: "sport-exhaust", label: "Escape deportivo" },
      { key: "tow-hitch", label: "Enganche de arrastre" },
      { key: "privacy-glass", label: "Vidrios oscurecidos" },
    ],
  },
  {
    key: "interior",
    title: "Interior",
    features: [
      { key: "leather", label: "Tapicería en cuero" },
      { key: "alcantara", label: "Alcántara" },
      { key: "sport-seats", label: "Asientos deportivos" },
      { key: "power-seats", label: "Asientos eléctricos" },
      { key: "seat-memory", label: "Memorias de asiento" },
      { key: "heated-seats", label: "Asientos calefactados" },
      { key: "ventilated-seats", label: "Asientos ventilados" },
      { key: "massage-seats", label: "Asientos con masaje" },
      { key: "heated-steering", label: "Volante calefactado" },
      { key: "ambient-lighting", label: "Iluminación ambiental" },
      { key: "head-up-display", label: "Head-up display" },
      { key: "third-row", label: "Tercera fila de asientos" },
      { key: "wood-trim", label: "Apliques en madera" },
      { key: "carbon-trim", label: "Apliques en fibra de carbono" },
    ],
  },
  {
    key: "confort",
    title: "Confort",
    features: [
      { key: "climate-dual", label: "Climatización bizona" },
      { key: "climate-tri", label: "Climatización trizona" },
      { key: "climate-quad", label: "Climatización cuatro zonas" },
      { key: "keyless-entry", label: "Acceso sin llave" },
      { key: "keyless-start", label: "Encendido por botón" },
      { key: "soft-close", label: "Puertas soft close" },
      { key: "power-tailgate", label: "Baúl eléctrico" },
      { key: "hands-free-tailgate", label: "Baúl con apertura manos libres" },
      { key: "wireless-charging", label: "Cargador inalámbrico" },
      { key: "rear-sunshade", label: "Cortinilla trasera" },
      { key: "auto-wipers", label: "Limpiaparabrisas con sensor de lluvia" },
    ],
  },
  {
    key: "infotainment",
    title: "Infotainment",
    features: [
      { key: "apple-carplay", label: "Apple CarPlay" },
      { key: "android-auto", label: "Android Auto" },
      { key: "navigation", label: "Navegación" },
      { key: "digital-cluster", label: "Cuadro de instrumentos digital" },
      { key: "touchscreen", label: "Pantalla táctil central" },
      { key: "premium-audio", label: "Sistema de sonido premium" },
      { key: "rear-entertainment", label: "Entretenimiento trasero" },
      { key: "wifi-hotspot", label: "Punto de acceso Wi-Fi" },
    ],
  },
  {
    key: "safety",
    title: "Seguridad y asistencias",
    features: [
      { key: "rear-camera", label: "Cámara de reversa" },
      { key: "camera-360", label: "Cámara 360°" },
      { key: "park-sensors", label: "Sensores de parqueo" },
      { key: "park-assist", label: "Asistente de parqueo" },
      { key: "cruise-control", label: "Control crucero" },
      { key: "adaptive-cruise", label: "Control crucero adaptativo" },
      { key: "lane-assist", label: "Asistente de carril" },
      { key: "blind-spot", label: "Alerta de punto ciego" },
      { key: "aeb", label: "Frenado autónomo de emergencia" },
      { key: "cross-traffic", label: "Alerta de tráfico cruzado" },
      { key: "driver-attention", label: "Detector de fatiga" },
      { key: "tpms", label: "Monitoreo de presión de llantas" },
      { key: "isofix", label: "Anclajes ISOFIX" },
    ],
  },
  {
    key: "performance",
    title: "Performance",
    features: [
      { key: "adaptive-suspension", label: "Suspensión adaptativa" },
      { key: "air-suspension", label: "Suspensión neumática" },
      { key: "sport-differential", label: "Diferencial deportivo" },
      { key: "sport-brakes", label: "Frenos deportivos" },
      { key: "carbon-ceramic-brakes", label: "Frenos carbono-cerámicos" },
      { key: "launch-control", label: "Launch control" },
      { key: "drive-modes", label: "Modos de conducción" },
      { key: "rear-axle-steering", label: "Dirección al eje trasero" },
      { key: "limited-slip", label: "Diferencial autoblocante" },
      { key: "paddle-shifters", label: "Levas al volante" },
    ],
  },
  {
    key: "offroad",
    title: "Off-road",
    features: [
      { key: "low-range", label: "Caja reductora" },
      { key: "diff-lock", label: "Bloqueo de diferencial" },
      { key: "offroad-modes", label: "Modos off-road" },
      { key: "hill-descent", label: "Control de descenso" },
      { key: "underbody-protection", label: "Protecciones de bajos" },
      { key: "snorkel", label: "Snorkel" },
      { key: "winch", label: "Winche" },
    ],
  },
];

/** Todas las claves válidas, para validar lo que llega del formulario. */
export const EQUIPMENT_KEYS: string[] = EQUIPMENT_GROUPS.flatMap((group) =>
  group.features.map((feature) => feature.key),
);

const labelByKey = new Map(
  EQUIPMENT_GROUPS.flatMap((group) =>
    group.features.map((feature) => [feature.key, feature.label] as const),
  ),
);

export function equipmentLabel(key: string): string | null {
  return labelByKey.get(key) ?? null;
}

/**
 * Las claves de un vehículo, repartidas en sus grupos y en el orden del
 * catálogo. Los grupos sin nada seleccionado no aparecen: la ficha dibuja
 * solo lo que el vehículo tiene.
 */
export function groupFeatures(
  keys: string[],
): { key: string; title: string; labels: string[] }[] {
  const selected = new Set(keys);
  return EQUIPMENT_GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    labels: group.features
      .filter((feature) => selected.has(feature.key))
      .map((feature) => feature.label),
  })).filter((group) => group.labels.length > 0);
}
