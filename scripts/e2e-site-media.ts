import "../prisma/env";

import { prisma } from "@/server/db/prisma";
import { SITE_MEDIA_SLOTS, fileForVariant } from "@/lib/site-media";
import {
  clearSiteMediaMobileImage,
  getSiteMediaImage,
  listSiteMedia,
  resetSiteMedia,
  setSiteMediaFocal,
  setSiteMediaImage,
  setSiteMediaMobileImage,
} from "@/server/site-media/service";

/**
 * Los catorce espacios fotográficos, reemplazados una y otra vez.
 *
 *     npx tsx --conditions=react-server scripts/e2e-site-media.ts
 *
 * Lo que esto comprueba no es que una subida funcione —eso ya se sabía— sino
 * que funcione la SEGUNDA, la tercera, el restaurar y la de después de
 * restaurar. Ese era el síntoma reportado: un espacio dejaba cambiar la
 * fotografía una vez y después parecía atascado.
 *
 * No sube nada a Storage: las políticas del bucket evalúan la sesión del
 * navegador y este script no tiene ninguna. Lo que ejercita es la capa de
 * datos —qué queda activo en cada paso, qué ruta anterior hay que retirar y
 * si un espacio puede arrastrar a otro—, que es donde vive la lógica.
 *
 * Guarda el estado de cada espacio al empezar y lo devuelve al terminar,
 * pase lo que pase. No toca Storage, así que no puede dejar un objeto
 * huérfano ni borrar una fotografía real.
 */

let passed = 0;
const failures: string[] = [];

function check(condition: boolean, what: string) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(what);
    console.log(`  ✗ ${what}`);
  }
}

/** Una subida de mentira: los datos que el endpoint habría escrito. */
const upload = (key: string, tag: string, size = { width: 4000, height: 3000 }) => ({
  url: `https://ejemplo.invalido/site-media/${key}/${tag}.jpg`,
  storagePath: `${key}/${tag}.jpg`,
  bytes: 1_234_567,
  contentType: "image/jpeg",
  size,
  focal: { x: 50, y: 50 },
});

type Snapshot = Awaited<ReturnType<typeof prisma.siteMedia.findUnique>>;

async function snapshot(): Promise<Map<string, Snapshot>> {
  const rows = await prisma.siteMedia.findMany();
  return new Map(rows.map((row) => [row.key, row]));
}

async function restore(before: Map<string, Snapshot>): Promise<void> {
  // Se reescribe fila por fila con lo que había, y se borran las que no
  // existían. Storage no se toca en ningún momento.
  for (const slot of SITE_MEDIA_SLOTS) {
    const row = before.get(slot.key);
    if (!row) {
      await prisma.siteMedia.deleteMany({ where: { key: slot.key } });
      continue;
    }
    const { id, key, createdAt, updatedAt, ...data } = row;
    void id;
    void createdAt;
    void updatedAt;
    await prisma.siteMedia.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });
  }
}

/** El archivo que está activo ahora mismo, según el servicio público. */
async function activeDesktop(key: string): Promise<string> {
  return (await getSiteMediaImage(key)).desktop.src;
}

async function cycleFor(key: string): Promise<void> {
  const slot = SITE_MEDIA_SLOTS.find((each) => each.key === key)!;

  // 1 · Punto de partida: sin fila, lo que manda es el respaldo del código.
  await prisma.siteMedia.deleteMany({ where: { key } });
  check((await activeDesktop(key)) === slot.legacySrc, `${key}: arranca en su respaldo`);

  // 2 · Primera subida.
  const a = upload(key, "a");
  const first = await setSiteMediaImage(key, { ...a, alt: slot.legacyAlt });
  check(first.previousStoragePath === null, `${key}: la primera no retira nada`);
  check((await activeDesktop(key)) === a.url, `${key}: A queda activa`);

  // 3 · Segunda subida SOBRE la primera. Este es el paso que fallaba.
  const b = upload(key, "b", { width: 2000, height: 2500 });
  const second = await setSiteMediaImage(key, { ...b, alt: slot.legacyAlt });
  check(second.previousStoragePath === a.storagePath, `${key}: B retira la ruta de A`);
  check((await activeDesktop(key)) === b.url, `${key}: B reemplaza a A`);

  // 4 · Tercera, para descartar que el problema apareciera más tarde.
  const c = upload(key, "c");
  const third = await setSiteMediaImage(key, { ...c, alt: slot.legacyAlt });
  check(third.previousStoragePath === b.storagePath, `${key}: C retira la ruta de B`);
  check((await activeDesktop(key)) === c.url, `${key}: C reemplaza a B`);

  // 5 · El encuadre, dos veces seguidas y sin tocar el archivo.
  await setSiteMediaFocal(key, { x: 10, y: 20 });
  await setSiteMediaFocal(key, { x: 80, y: 30 });
  const framed = await getSiteMediaImage(key);
  check(
    framed.desktop.focal.x === 80 && framed.desktop.focal.y === 30,
    `${key}: el encuadre se puede cambiar repetidamente`,
  );
  check(framed.desktop.src === c.url, `${key}: encuadrar no cambia el archivo`);

  // 6 · La metadata describe el archivo que está activo, no uno anterior.
  check(
    framed.desktop.size?.width === c.size.width &&
      framed.desktop.bytes === c.bytes &&
      framed.desktop.contentType === c.contentType,
    `${key}: la metadata corresponde a C`,
  );

  // 7 · Una fotografía nueva NO hereda el encuadre de la anterior.
  const d = upload(key, "d");
  await setSiteMediaImage(key, { ...d, alt: slot.legacyAlt });
  const fresh = await getSiteMediaImage(key);
  check(
    fresh.desktop.focal.x === 50 && fresh.desktop.focal.y === 50,
    `${key}: D nace centrada, sin el encuadre de C`,
  );

  // 8 · Restaurar, después de cuatro reemplazos.
  const reset = await resetSiteMedia(key);
  check(
    reset.previousStoragePaths.includes(d.storagePath),
    `${key}: restaurar retira la ruta de D`,
  );
  const restored = await getSiteMediaImage(key);
  check(restored.desktop.src === slot.legacySrc, `${key}: vuelve al respaldo`);
  check(restored.desktop.source === "legacy", `${key}: vuelve a figurar como original`);
  check(
    restored.desktop.focal.x === 50 && restored.desktop.bytes === null,
    `${key}: restaurar limpia encuadre y metadata`,
  );
  check(restored.mobile === null, `${key}: restaurar limpia la variante de teléfono`);

  // 9 · Y se puede volver a personalizar después de restaurar.
  const e = upload(key, "e");
  const again = await setSiteMediaImage(key, { ...e, alt: slot.legacyAlt });
  check(again.previousStoragePath === null, `${key}: tras restaurar no hay ruta previa`);
  check((await activeDesktop(key)) === e.url, `${key}: E queda activa tras restaurar`);
}

async function variantsFor(key: string): Promise<void> {
  const slot = SITE_MEDIA_SLOTS.find((each) => each.key === key)!;
  await prisma.siteMedia.deleteMany({ where: { key } });

  const da = upload(key, "desktop-a");
  await setSiteMediaImage(key, { ...da, alt: slot.legacyAlt });
  const ma = upload(`${key}/mobile`, "mobile-a", { width: 1400, height: 2500 });
  await setSiteMediaMobileImage(key, ma);

  let image = await getSiteMediaImage(key);
  check(image.desktop.src === da.url, `${key}: escritorio A`);
  check(image.mobile?.src === ma.url, `${key}: teléfono A`);

  // Cambiar escritorio no puede arrastrar el teléfono.
  const db = upload(key, "desktop-b");
  await setSiteMediaImage(key, { ...db, alt: slot.legacyAlt });
  image = await getSiteMediaImage(key);
  check(image.desktop.src === db.url, `${key}: escritorio pasa a B`);
  check(image.mobile?.src === ma.url, `${key}: el teléfono sigue en A`);

  // Ni al revés.
  const mb = upload(`${key}/mobile`, "mobile-b", { width: 1400, height: 2500 });
  await setSiteMediaMobileImage(key, mb);
  image = await getSiteMediaImage(key);
  check(image.desktop.src === db.url, `${key}: el escritorio sigue en B`);
  check(image.mobile?.src === mb.url, `${key}: teléfono pasa a B`);

  // Quitar el teléfono devuelve al respaldo: escritorio + encuadre vertical.
  await setSiteMediaFocal(key, { x: 70, y: 25 }, "mobile");
  const cleared = await clearSiteMediaMobileImage(key);
  check(cleared.previousStoragePath === mb.storagePath, `${key}: retira la ruta móvil`);
  image = await getSiteMediaImage(key);
  check(image.mobile === null, `${key}: sin variante de teléfono`);
  check(
    fileForVariant(image, "mobile").src === db.url,
    `${key}: el teléfono cae al archivo de escritorio`,
  );
  check(
    fileForVariant(image, "mobile").focal.y === 25,
    `${key}: y conserva su encuadre vertical`,
  );

  // Y se puede volver a añadir.
  const mc = upload(`${key}/mobile`, "mobile-c", { width: 1400, height: 2500 });
  await setSiteMediaMobileImage(key, mc);
  check(
    (await getSiteMediaImage(key)).mobile?.src === mc.url,
    `${key}: se puede volver a añadir la variante`,
  );
}

async function independence(): Promise<void> {
  // Cuatro espacios que ARRANCAN con el mismo archivo de /public. Que
  // compartan respaldo no puede significar que compartan fila.
  const sharing = ["contact.hero", "error.404", "nav.contact", "seo.defaultOg"];
  for (const key of sharing) await prisma.siteMedia.deleteMany({ where: { key } });

  const mine = upload("nav.contact", "solo-nav");
  await setSiteMediaImage("nav.contact", {
    ...mine,
    alt: "Menú contacto",
  });

  for (const other of sharing.filter((key) => key !== "nav.contact")) {
    const image = await getSiteMediaImage(other);
    check(
      image.desktop.src !== mine.url,
      `nav.contact no arrastró a ${other}`,
    );
    check(
      image.desktop.source === "legacy",
      `${other} sigue en su fotografía original`,
    );
  }

  // Y los pares que comparten archivo con un espacio de página.
  const pairs: [string, string][] = [
    ["nav.mille", "home.hero"],
    ["nav.sell", "home.about.origin"],
    ["nav.culture", "home.about.future"],
    ["nav.vehicles", "home.featured.a"],
  ];
  for (const [nav, page] of pairs) {
    await prisma.siteMedia.deleteMany({ where: { key: { in: [nav, page] } } });
    const navFile = upload(nav, "nav");
    await setSiteMediaImage(nav, { ...navFile, alt: "Menú" });
    check(
      (await getSiteMediaImage(page)).desktop.source === "legacy",
      `${nav} no arrastró a ${page}`,
    );
  }
}

async function main(): Promise<void> {
  const before = await snapshot();
  console.log(`Estado guardado: ${before.size} filas.\n`);

  try {
    console.log("Ciclo completo en los catorce espacios…");
    for (const slot of SITE_MEDIA_SLOTS) await cycleFor(slot.key);

    console.log("Escritorio y teléfono, en los dos que tienen ambos…");
    for (const slot of SITE_MEDIA_SLOTS) {
      if (slot.frames.mobile) await variantsFor(slot.key);
    }

    console.log("Independencia entre espacios que comparten respaldo…");
    await independence();

    console.log("El Admin ve los catorce con sus dos caras…");
    const listed = await listSiteMedia();
    check(listed.length === SITE_MEDIA_SLOTS.length, "el Admin lista los catorce");
    for (const entry of listed) {
      check(entry.desktop.src.length > 0, `${entry.key}: tiene archivo de escritorio`);
      check(
        entry.mobileFocal !== undefined,
        `${entry.key}: tiene encuadre de teléfono`,
      );
    }
  } finally {
    await restore(before);
    const after = await snapshot();
    const same =
      after.size === before.size &&
      [...before].every(
        ([key, row]) =>
          after.get(key)?.url === row?.url &&
          after.get(key)?.storagePath === row?.storagePath &&
          after.get(key)?.focalX === row?.focalX,
      );
    console.log(`\nEstado devuelto: ${after.size} filas · intacto=${same}`);
    if (!same) failures.push("el estado inicial NO se restauró");
    await prisma.$disconnect();
  }

  console.log(`\n${passed} comprobaciones bien, ${failures.length} mal.`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

void main();
