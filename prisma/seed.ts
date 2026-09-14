import "./env";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SITE_MEDIA_SLOTS } from "../src/lib/site-media";
import { fixtureCategories } from "./fixtures/categories";
import { mockVehicles, type FixtureVehicle } from "./fixtures/vehicles";

/**
 * Siembra el inventario original de MILLE.
 *
 * Es idempotente: se identifica cada categoría por (tipo, slug) y cada
 * vehículo por su slug, así que ejecutarlo dos veces actualiza en vez de
 * duplicar. Y no borra nada que no haya creado él: si ya hay vehículos
 * nuevos en la base, siguen ahí.
 *
 * Las imágenes se siembran como LEGACY apuntando a /public. No se suben a
 * Storage: el objetivo de esta migración es que el sitio se vea exactamente
 * igual antes y después, y esas rutas ya funcionan.
 *
 * Usa DIRECT_URL cuando existe: sembrar es una operación puntual desde una
 * máquina, no tráfico de aplicación, y no tiene por qué pasar por el pooler.
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Falta DIRECT_URL (o DATABASE_URL). Defínelas en .env.local — ver .env.example.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * El modelo antiguo tenía un solo `status`. Ahora son dos ejes: "draft" era
 * una decisión de publicación, no de disponibilidad, y los otros tres eran
 * disponibilidad de algo que ya estaba publicado.
 */
function splitStatus(status: FixtureVehicle["status"]): {
  availability: "AVAILABLE" | "RESERVED" | "SOLD";
  publication: "DRAFT" | "PUBLISHED";
} {
  switch (status) {
    case "draft":
      return { availability: "AVAILABLE", publication: "DRAFT" };
    case "reserved":
      return { availability: "RESERVED", publication: "PUBLISHED" };
    case "sold":
      return { availability: "SOLD", publication: "PUBLISHED" };
    default:
      return { availability: "AVAILABLE", publication: "PUBLISHED" };
  }
}

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const [index, category] of fixtureCategories.entries()) {
    const vehicleType = category.vehicleType === "moto" ? "MOTO" : "AUTO";
    const record = await prisma.category.upsert({
      where: { vehicleType_slug: { vehicleType, slug: category.slug } },
      create: {
        name: category.name,
        pluralName: category.plural,
        slug: category.slug,
        vehicleType,
        active: true,
        position: index,
      },
      update: {
        name: category.name,
        pluralName: category.plural,
        // `active` y `position` no se tocan al reejecutar: si alguien
        // desactivó o reordenó una categoría desde el admin, esa decisión
        // es más reciente que este archivo.
      },
    });
    ids.set(`${category.vehicleType}:${category.name}`, record.id);
  }

  return ids;
}

async function seedVehicles(categoryIds: Map<string, string>): Promise<void> {
  for (const fixture of mockVehicles) {
    const key = `${fixture.vehicleType}:${fixture.category}`;
    const categoryId = categoryIds.get(key);
    if (!categoryId) {
      throw new Error(
        `El vehículo ${fixture.slug} referencia una categoría desconocida: ${key}`,
      );
    }

    const { availability, publication } = splitStatus(fixture.status);
    const vehicleType = fixture.vehicleType === "moto" ? "MOTO" : "AUTO";

    const data = {
      vehicleType,
      make: fixture.make,
      model: fixture.model,
      version: fixture.version,
      year: fixture.year,
      price: BigInt(fixture.price),
      mileage: fixture.mileage,
      categoryId,
      fuelType: fixture.fuelType,
      transmission: fixture.transmission,
      drivetrain: fixture.drivetrain,
      engine: fixture.engine,
      power: fixture.power,
      exteriorColor: fixture.exteriorColor,
      interiorColor: fixture.interiorColor,
      city: fixture.city,
      availabilityStatus: availability,
      publicationStatus: publication,
      featured: fixture.featured,
      description: fixture.description,
      equipment: fixture.equipment,
      createdAt: new Date(fixture.createdAt),
      publishedAt:
        publication === "PUBLISHED" ? new Date(fixture.createdAt) : null,
    } as const;

    // Vehículo e imágenes en una transacción: nunca queda medio sembrado.
    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.upsert({
        where: { slug: fixture.slug },
        create: { slug: fixture.slug, ...data },
        update: data,
      });

      // Las imágenes se reemplazan enteras porque el fixture es la
      // referencia. Solo se borran las heredadas: si alguien ya subió fotos
      // propias a este vehículo desde el admin, reejecutar el seed no puede
      // tirarlas.
      await tx.vehicleImage.deleteMany({
        where: { vehicleId: vehicle.id, source: "LEGACY" },
      });

      const uploaded = await tx.vehicleImage.count({
        where: { vehicleId: vehicle.id },
      });

      await tx.vehicleImage.createMany({
        data: fixture.images.map((image, index) => ({
          vehicleId: vehicle.id,
          url: image.src,
          storagePath: null,
          source: "LEGACY" as const,
          alt: image.alt,
          position: uploaded + index,
        })),
      });
    });
  }
}

/**
 * Registra los cuatro slots visuales con la fotografía que el sitio usa hoy.
 *
 * Se marcan como LEGACY porque siguen apuntando a /public: el objetivo es que
 * pasar a administrarlas desde el admin no cambie ni un píxel de la home.
 *
 * Solo crea lo que falta. Si alguien ya subió una imagen desde el admin,
 * reejecutar el seed no puede devolverle la original: eso sería revertir su
 * trabajo sin avisar.
 */
async function seedSiteMedia(): Promise<number> {
  let created = 0;
  for (const slot of SITE_MEDIA_SLOTS) {
    const existing = await prisma.siteMedia.findUnique({
      where: { key: slot.key },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.siteMedia.create({
      data: {
        key: slot.key,
        url: slot.legacySrc,
        storagePath: null,
        source: "LEGACY",
        alt: slot.legacyAlt,
      },
    });
    created += 1;
  }
  return created;
}

async function main() {
  console.log("Sembrando categorías…");
  const categoryIds = await seedCategories();
  console.log(`  ${categoryIds.size} categorías listas.`);

  console.log("Sembrando vehículos…");
  await seedVehicles(categoryIds);

  console.log("Registrando imágenes del sitio…");
  const createdMedia = await seedSiteMedia();
  const totalMedia = await prisma.siteMedia.count();
  console.log(
    `  ${totalMedia} slots registrados (${createdMedia} nuevos, ${totalMedia - createdMedia} ya existían).`,
  );

  const [total, autos, motos, published, drafts, images] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { vehicleType: "AUTO" } }),
    prisma.vehicle.count({ where: { vehicleType: "MOTO" } }),
    prisma.vehicle.count({ where: { publicationStatus: "PUBLISHED" } }),
    prisma.vehicle.count({ where: { publicationStatus: "DRAFT" } }),
    prisma.vehicleImage.count(),
  ]);

  console.log(
    [
      "",
      "Resumen:",
      `  vehículos:  ${total} (${autos} carros, ${motos} motos)`,
      `  publicados: ${published}`,
      `  borradores: ${drafts}`,
      `  imágenes:   ${images}`,
      `  slots home: ${totalMedia}`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error("El seed falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
