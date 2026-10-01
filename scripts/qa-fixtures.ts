import "../prisma/env";

import { prisma } from "@/server/db/prisma";
import { vehicleInputSchema } from "@/server/vehicles/schemas";
import {
  createVehicle,
  deleteVehicle,
  setPublication,
} from "@/server/vehicles/service";
import { listCategories } from "@/server/categories/service";

/**
 * Fichas de QA para revisar la experiencia real en el navegador.
 *
 *     npx tsx --conditions=react-server scripts/qa-fixtures.ts up
 *     npx tsx --conditions=react-server scripts/qa-fixtures.ts down
 *
 * NO son inventario de MILLE. Son unidades de prueba y se marcan como tales:
 * el slug empieza por `qa-`, la versión lleva el sufijo "(QA)" y la
 * descripción lo dice en la primera línea, para que nadie las confunda con
 * stock real si se le abre la ficha.
 *
 * `down` borra EXCLUSIVAMENTE lo que creó este archivo —los slugs `qa-`— y
 * no toca nada más de la base.
 *
 * Las especificaciones son las que publican los fabricantes. Donde no se
 * tiene un dato, se deja en blanco: estas fichas existen para revisar la
 * interfaz, y rellenarlas con cifras inventadas haría justo lo que el resto
 * del proyecto evita.
 */

const QA_PREFIX = "qa-";

/** Aviso en la propia ficha, por si alguien la abre sin contexto. */
const QA_NOTE = "UNIDAD DE PRUEBA (QA) — no es inventario real de MILLE.";

async function up() {
  const categories = await listCategories();
  const bySlug = (type: "auto" | "moto", slug: string) => {
    const found = categories.find(
      (c) => c.vehicleType === type && c.slug === slug,
    );
    if (!found) throw new Error(`Falta la categoría ${type}:${slug}`);
    return found.id;
  };

  const inputs = [
    // --- 1. Ducati Multistrada V2 S -------------------------------------
    {
      vehicleType: "moto" as const,
      slug: `${QA_PREFIX}ducati-multistrada-v2-s`,
      make: "Ducati",
      model: "Multistrada",
      version: "V2 S (QA)",
      year: 2023,
      price: 95_000_000,
      mileage: 4_200,
      categoryId: bySlug("moto", "adv"),
      fuelType: "Gasolina",
      transmission: "Manual secuencial",
      gearCount: 6,
      finalDrive: "Cadena",
      city: "Bogotá, CO",
      exteriorColor: "Ducati Red",
      engine: "Testastretta 11° 937 cc",
      engineLayout: "L-Twin",
      cylinders: 2,
      displacementCc: 937,
      aspiration: "Atmosférico",
      powerHp: 113,
      torqueNm: 96,
      curbWeightKg: 202,
      tags: ["Performance", "Confort"],
      description: `${QA_NOTE}

La Multistrada V2 S es la puerta de entrada a la familia Multistrada y, para mucha gente, la que mejor equilibrio tiene: el bicilíndrico Testastretta de 937 cc entrega su empuje abajo, donde se usa, en lugar de pedir vueltas.

Esta unidad monta la suspensión semiactiva Öhlins Skyhook, que es lo que de verdad separa a la S de la versión base.`,
      equipment: [
        "[Electrónica y ayudas]",
        "ABS en curva Bosch",
        "Control de tracción Ducati (DTC)",
        "Wheelie control (DWC)",
        "Cuatro modos de conducción",
        "[Transmisión y control]",
        "Quickshifter up/down",
        "Embrague antirrebote",
        "Ride-by-wire",
        "[Suspensión y chasis]",
        "Öhlins Skyhook semiactiva, delantera y trasera",
        "Precarga trasera electrónica",
        "[Frenos]",
        "Brembo M4.32 de cuatro pistones, doble disco de 320 mm",
        "Disco trasero de 265 mm",
        "[Iluminación e instrumentación]",
        "Iluminación full LED",
        "Pantalla TFT a color de 5\"",
        "[Confort / Touring]",
        "Control crucero",
        "Puños calefactables",
        "Parabrisas ajustable",
        "Caballete central",
      ],
      specialEquipment: [
        {
          name: "Ducati Skyhook Suspension (DSS) EVO",
          description:
            "Suspensión semiactiva que ajusta la amortiguación en tiempo real según el terreno.",
        },
        {
          name: "Akrapovič Titanium Exhaust",
          description: "Escape opcional en titanio, homologado.",
        },
      ],
      funFactEnabled: true,
      funFactTitle: "El bicilíndrico que cambió de nombre",
      funFactBody:
        "El motor de 937 cc de esta Multistrada es pariente directo del Testastretta de la Hypermotard y la Monster: Ducati lo reutiliza con distintos reglajes en media gama, y es la razón de que una ADV de este tamaño se sienta tan ágil entre curvas.",
    },

    // --- 2. BMW R 1300 GS ------------------------------------------------
    {
      vehicleType: "moto" as const,
      slug: `${QA_PREFIX}bmw-r-1300-gs`,
      make: "BMW Motorrad",
      model: "R 1300 GS",
      version: "(QA)",
      year: 2024,
      price: 125_000_000,
      mileage: 1_800,
      categoryId: bySlug("moto", "adv"),
      fuelType: "Gasolina",
      transmission: "Manual secuencial",
      gearCount: 6,
      finalDrive: "Cardán",
      city: "Bogotá, CO",
      exteriorColor: "Racing Blue Metallic",
      engine: "Bóxer 1.300 cc",
      engineLayout: "Bóxer 2",
      cylinders: 2,
      displacementCc: 1300,
      aspiration: "Atmosférico",
      powerHp: 145,
      torqueNm: 149,
      curbWeightKg: 237,
      tags: ["Off-road", "Confort"],
      description: `${QA_NOTE}

La GS es la referencia del segmento desde hace cuarenta años, y la 1300 es la revisión más profunda en mucho tiempo: motor nuevo, chasis de chapa de acero en lugar de tubos y una caja de cambios que pasó debajo del cigüeñal para compactar el conjunto.

El cardán sigue siendo el cardán: cero mantenimiento de cadena en un viaje largo.`,
      equipment: [
        "[Electrónica y ayudas]",
        "ABS Pro en curva",
        "Control de tracción DTC",
        "Modos Rain, Road, Eco, Enduro",
        "[Transmisión y control]",
        "Shift Assistant Pro",
        "Ride-by-wire",
        "[Suspensión y chasis]",
        "EVO Telelever delantero",
        "EVO Paralever trasero",
        "Dynamic Suspension Adjustment",
        "[Frenos]",
        "Doble disco delantero de 310 mm",
        "Disco trasero de 285 mm",
        "[Iluminación e instrumentación]",
        "Faro LED Matrix",
        "Pantalla TFT de 6,5\"",
        "Conectividad BMW Motorrad",
        "[Confort / Touring]",
        "Control crucero",
        "Puños calefactables",
        "Asiento calefactable",
        "Parabrisas ajustable eléctricamente",
      ],
      specialEquipment: [
        {
          name: "Adaptive Vehicle Height Control",
          description:
            "Ajusta la altura de la moto automáticamente al detenerse y al rodar.",
        },
      ],
      funFactEnabled: true,
      funFactTitle: "Por qué el cilindro va atravesado",
      funFactBody:
        "El bóxer lleva los cilindros asomando a los lados desde 1923. No es tradición por tradición: expuestos al aire se refrigeran solos, y el centro de gravedad queda tan bajo que una moto de 237 kg se mueve en parado mejor de lo que su ficha sugiere.",
    },

    // --- 3. Yamaha MT-07 · ficha deliberadamente sencilla ----------------
    {
      vehicleType: "moto" as const,
      slug: `${QA_PREFIX}yamaha-mt-07`,
      make: "Yamaha",
      model: "MT-07",
      version: "(QA)",
      year: 2022,
      price: 38_000_000,
      mileage: 12_500,
      categoryId: bySlug("moto", "naked"),
      fuelType: "Gasolina",
      transmission: "Manual secuencial",
      gearCount: 6,
      finalDrive: "Cadena",
      city: "Medellín, CO",
      exteriorColor: "Storm Fluo",
      engine: "CP2 689 cc",
      engineLayout: "Bicilíndrico paralelo",
      cylinders: 2,
      displacementCc: 689,
      aspiration: "Atmosférico",
      powerHp: 73,
      torqueNm: 67,
      curbWeightKg: 184,
      tags: ["Urbana"],
      description: `${QA_NOTE}

La MT-07 lleva años siendo la respuesta correcta para quien quiere una moto de verdad sin pagar por electrónica que no va a usar. El bicilíndrico CP2 con cigüeñal cruzado a 270° suena y empuja como un twin en V, y pesa 184 kg con todos los líquidos.

Ficha sencilla a propósito: aquí no hay modos de conducción ni suspensión semiactiva, y no hace falta.`,
      equipment: [
        "[Electrónica y ayudas]",
        "ABS de doble canal",
        "[Frenos]",
        "Doble disco delantero de 298 mm",
        "Disco trasero de 245 mm",
        "[Iluminación e instrumentación]",
        "Iluminación full LED",
        "Instrumentación LCD",
      ],
      // Sin equipamiento especial y sin "¿Sabías que?": es el caso de
      // control para comprobar que esos bloques no dejan hueco.
      specialEquipment: [],
      funFactEnabled: false,
    },

    // --- 4. BMW X5 xDrive45e · el carro complejo no debe haberse roto ----
    {
      vehicleType: "auto" as const,
      slug: `${QA_PREFIX}bmw-x5-xdrive45e`,
      make: "BMW",
      model: "X5",
      version: "xDrive45e M Sport (QA)",
      year: 2021,
      price: 295_000_000,
      mileage: 42_000,
      categoryId: bySlug("auto", "suv"),
      fuelType: "Híbrido enchufable",
      transmission: "Automática",
      gearCount: 8,
      drivetrain: "Integral (AWD)",
      city: "Bogotá, CO",
      exteriorColor: "Phytonic Blue",
      interiorColor: "Cuero Vernasca negro",
      engine: "3.0 L I6 TwinPower Turbo + motor eléctrico",
      engineLayout: "I6",
      cylinders: 6,
      displacementCc: 2998,
      aspiration: "Turbo",
      powerHp: 389,
      torqueNm: 600,
      accel0100: 5.6,
      topSpeedKph: 235,
      topSpeedLimited: true,
      curbWeightKg: 2510,
      icePowerHp: 286,
      iceTorqueNm: 450,
      electricMotorCount: 1,
      electricPowerHp: 113,
      electricMotorLayout: "Integrado en la transmisión",
      hybridSystem: "Plug-in Hybrid",
      batteryGrossKwh: 24,
      batteryNetKwh: 21.6,
      electricRangeKm: 85,
      rangeStandard: "WLTP",
      chargeAcKw: 3.7,
      chargeConnector: "Tipo 2 (Mennekes)",
      registrationCity: "Bogotá",
      plateEnding: "7",
      soatValid: true,
      soatExpiresOn: "2027-03-18",
      techInspectionApplies: true,
      techInspectionExpiresOn: "2026-11-02",
      taxStatus: "Al día",
      taxesPaidThroughYear: 2026,
      documentationCheckedOn: "2026-01-10",
      tags: ["Lujo", "Familiar"],
      description: `${QA_NOTE}

El X5 xDrive45e es el enchufable que mejor resuelve el uso real en Bogotá: 85 km de autonomía eléctrica cubren la semana entera sin encender el seis en línea, y cuando toca salir de la ciudad hay 389 hp combinados y 600 Nm debajo del pie.

Esta configuración lleva el paquete M Sport y suspensión neumática en los dos ejes.`,
      equipment: [
        "[Exterior]",
        "Paquete M Sport",
        "Rines M de 21\"",
        "Faros Laserlight",
        "Techo panorámico Sky Lounge",
        "[Interior y confort]",
        "Asientos deportivos con memorias",
        "Climatización de cuatro zonas",
        "Acceso confort sin llave",
        "[Infotainment]",
        "BMW Live Cockpit Professional",
        "Apple CarPlay y Android Auto inalámbricos",
        "Harman Kardon Surround",
        "[Seguridad y ADAS]",
        "Cámara 360°",
        "Control crucero adaptativo con Stop & Go",
        "Asistente de carril",
        "Alerta de punto ciego",
        "[Performance / Off-road]",
        "Suspensión neumática en ambos ejes",
        "Modos de conducción con Sport+",
      ],
      specialEquipment: [
        {
          name: "Harman Kardon Surround Sound",
          description: "464 W y 16 altavoces.",
        },
      ],
      funFactEnabled: true,
      funFactTitle: "El seis en línea que no se jubila",
      funFactBody:
        "Mientras casi toda la competencia se pasó al V6, BMW mantuvo el seis cilindros en línea: es intrínsecamente equilibrado y no necesita contrapesos para girar fino. El B58 de este X5 es el mismo bloque que usan el Supra y el M340i.",
    },
  ];

  const created: { slug: string; url: string }[] = [];

  for (const input of inputs) {
    const parsed = vehicleInputSchema.parse(input);
    const vehicle = await createVehicle(parsed);

    // Una fotografía para que la ficha pueda publicarse. Es la imagen de
    // marca que ya vive en /public: no se sube nada a Storage, así que esto
    // funciona sin sesión de Supabase.
    await prisma.vehicleImage.create({
      data: {
        vehicleId: vehicle.id,
        url: "/images/brand/night.jpg",
        alt: `${vehicle.make} ${vehicle.model} — fotografía de prueba`,
        source: "LEGACY",
        position: 0,
      },
    });

    const published = await setPublication(vehicle.id, "published");
    created.push({
      slug: published.slug,
      url: `/vehiculos/${published.slug}`,
    });
    console.log(`  publicada  ${published.slug}`);
  }

  console.log("\nFichas QA publicadas:");
  for (const { url } of created) console.log(`  http://localhost:3000${url}`);
  console.log("\nPara retirarlas:  npx tsx --conditions=react-server scripts/qa-fixtures.ts down");
}

async function down() {
  const qa = await prisma.vehicle.findMany({
    where: { slug: { startsWith: QA_PREFIX } },
    select: { id: true, slug: true },
  });
  for (const vehicle of qa) {
    await deleteVehicle(vehicle.id);
    console.log(`  retirada  ${vehicle.slug}`);
  }
  console.log(`\n${qa.length} fichas QA retiradas.`);
  const left = await prisma.vehicle.count();
  console.log(`Vehículos que quedan en la base (NO son de QA): ${left}`);
}

const mode = process.argv[2];
const run = mode === "down" ? down : mode === "up" ? up : null;

if (!run) {
  console.error("Uso: qa-fixtures.ts up | down");
  process.exit(1);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
