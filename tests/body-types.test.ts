import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import {
  AUTO_BODY_TYPES,
  BODY_SLUG_ALIASES,
  HIDDEN_BODY_SLUGS,
  MOTO_BODY_TYPES,
  canonicalBodySlug,
  mergeBodyTypes,
  presentBodyType,
  searchBodySlugs,
  slugsFor,
} from "@/lib/body-types";
import type { VehicleCategory } from "@/types/vehicle";

/**
 * Una sola lista de carrocerías para la portada, el filtro y el admin, y que
 * siga siendo correcta sea cual sea el estado de la base.
 */

describe("las carrocerías de carro", () => {
  const slugs = AUTO_BODY_TYPES.map((body) => body.slug);

  it("SUV y 4x4 son una sola carrocería, «camioneta»; la pickup se queda aparte", () => {
    assert.ok(slugs.includes("camioneta"));
    assert.ok(slugs.includes("pickup"));
    assert.ok(!slugs.includes("suv"));
    assert.ok(!slugs.includes("4x4"));
    const camioneta = AUTO_BODY_TYPES.find((body) => body.slug === "camioneta")!;
    assert.equal(camioneta.name, "Camioneta");
    assert.equal(camioneta.plural, "Camionetas");
  });

  it("son siete —sin van, que MILLE no vende— y no se repite ninguna", () => {
    assert.equal(AUTO_BODY_TYPES.length, 7);
    assert.ok(!slugs.includes("van"));
    assert.equal(new Set(slugs).size, slugs.length);
    assert.equal(new Set(AUTO_BODY_TYPES.map((b) => b.name)).size, AUTO_BODY_TYPES.length);
  });

  it("los nombres viejos siguen resolviendo a la camioneta", () => {
    assert.equal(canonicalBodySlug("suv"), "camioneta");
    assert.equal(canonicalBodySlug("4x4"), "camioneta");
    assert.equal(canonicalBodySlug("camioneta"), "camioneta");
    assert.equal(canonicalBodySlug("sedan"), "sedan");
  });

  it("buscar «camioneta» alcanza también las filas que todavía se llaman suv o 4x4", () => {
    assert.deepEqual(slugsFor("camioneta").sort(), ["4x4", "camioneta", "suv"]);
    assert.deepEqual(slugsFor("suv").sort(), ["4x4", "camioneta", "suv"]);
    assert.deepEqual(slugsFor("sedan"), ["sedan"]);
  });

  it("en el buscador «suv» y «camioneta» llevan a camionetas, pero «4x4» es tracción y no se desvía", () => {
    assert.deepEqual(searchBodySlugs("suv").sort(), ["4x4", "camioneta", "suv"]);
    assert.deepEqual(searchBodySlugs("camioneta").sort(), ["4x4", "camioneta", "suv"]);
    assert.deepEqual(searchBodySlugs("camionetas").sort(), ["4x4", "camioneta", "suv"]);
    assert.deepEqual(searchBodySlugs("4x4"), []);
    assert.deepEqual(searchBodySlugs("sedan"), []);
    assert.deepEqual(searchBodySlugs("x5"), []);
  });

  it("un alias nunca es el slug de una carrocería vigente: sería ambiguo", () => {
    const current = new Set([...slugs, ...MOTO_BODY_TYPES.map((b) => b.slug)]);
    for (const alias of Object.keys(BODY_SLUG_ALIASES)) {
      assert.ok(!current.has(alias), `«${alias}» es alias y carrocería a la vez`);
      assert.ok(current.has(BODY_SLUG_ALIASES[alias]), `«${alias}» apunta a algo que no existe`);
    }
  });
});

describe("la base sin migrar", () => {
  const row = (
    slug: string,
    name: string,
    plural: string,
    position: number,
    count: number,
    vehicleType: "auto" | "moto" = "auto",
  ) => ({ id: `${vehicleType}-${slug}`, slug, name, pluralName: plural, vehicleType, position, count });

  // Lo que la base de MILLE tenía de verdad: «SUV» con el BMW, una «4x4»
  // activa y vacía, y «Van».
  const legacy = [
    row("suv", "SUV", "SUV", 0, 1),
    row("sedan", "Sedán", "Sedanes", 1, 0),
    row("pickup", "Pickup", "Pickups", 2, 0),
    row("hatchback", "Hatchback", "Hatchbacks", 3, 0),
    row("coupe", "Coupé", "Coupés", 4, 0),
    row("cabrio", "Cabrio", "Cabrios", 5, 0),
    row("wagon", "Wagon", "Wagons", 6, 0),
    row("van", "Van", "Vans", 7, 0),
    row("4x4", "4x4", "4x4", 8, 0),
    row("adv", "ADV", "ADV", 0, 0, "moto"),
  ];

  it("«SUV» se lee «Camionetas», con su BMW contado, y la «4x4» se funde con ella", () => {
    const merged = mergeBodyTypes(legacy);
    const camionetas = merged.filter((category) => category.slug === "camioneta");
    assert.equal(camionetas.length, 1, "una sola camioneta, no dos filas");
    assert.equal(camionetas[0].name, "Camioneta");
    assert.equal(camionetas[0].pluralName, "Camionetas");
    assert.equal(camionetas[0].count, 1);
    assert.ok(!merged.some((category) => category.slug === "suv" || category.slug === "4x4"));
  });

  it("la van no se ofrece aunque su fila siga activa", () => {
    const slugs = mergeBodyTypes(legacy).map((category) => category.slug);
    assert.ok(!slugs.includes("van"));
    assert.ok(HIDDEN_BODY_SLUGS.includes("van"));
  });

  it("queda la lista correcta y en su orden: siete carros y luego las motos", () => {
    assert.deepEqual(
      mergeBodyTypes(legacy).map((category) => category.slug),
      ["camioneta", "sedan", "pickup", "hatchback", "coupe", "cabrio", "wagon", "adv"],
    );
  });

  it("migrada o no, la lista es idéntica", () => {
    const migrated = [
      row("camioneta", "Camioneta", "Camionetas", 0, 1),
      ...legacy.filter((r) => !["suv", "van", "4x4"].includes(r.slug)),
    ];
    assert.deepEqual(
      mergeBodyTypes(legacy).map(({ slug, name, pluralName, count }) => ({ slug, name, pluralName, count })),
      mergeBodyTypes(migrated).map(({ slug, name, pluralName, count }) => ({ slug, name, pluralName, count })),
    );
  });

  it("suma las cuentas si el vehículo está en «suv» y otro en «4x4»", () => {
    const both = mergeBodyTypes([row("suv", "SUV", "SUV", 0, 3), row("4x4", "4x4", "4x4", 8, 2)]);
    assert.equal(both.length, 1);
    assert.equal(both[0].count, 5);
    assert.equal(both[0].position, 0);
  });

  it("si ya existe la fila «camioneta», manda ella", () => {
    const both = mergeBodyTypes([
      row("suv", "SUV", "SUV", 3, 1),
      row("camioneta", "Camioneta", "Camionetas", 0, 2),
    ]);
    assert.equal(both.length, 1);
    assert.equal(both[0].id, "auto-camioneta");
    assert.equal(both[0].count, 3);
  });

  it("una categoría que el admin crea mañana pasa tal cual", () => {
    const merged = mergeBodyTypes([...legacy, row("roadster", "Roadster", "Roadsters", 9, 0)]);
    assert.ok(merged.some((category) => category.slug === "roadster"));
  });

  it("la ficha de un vehículo guardado como «SUV» dice «Camioneta»", () => {
    const shown = presentBodyType({ id: "1", name: "SUV", pluralName: "SUV", slug: "suv" });
    assert.deepEqual(shown, { id: "1", name: "Camioneta", pluralName: "Camionetas", slug: "camioneta" });
    const same = { id: "2", name: "Sedán", pluralName: "Sedanes", slug: "sedan" };
    assert.equal(presentBodyType(same), same);
  });
});

describe("la migración de la camioneta", () => {
  const sql = readFileSync(
    join(process.cwd(), "prisma/migrations/20261020120000_camioneta_body_type/migration.sql"),
    "utf8",
  );
  const camioneta = AUTO_BODY_TYPES.find((body) => body.slug === "camioneta")!;

  it("renombra la fila SUV con los mismos textos que la definición canónica", () => {
    assert.ok(sql.includes(`"name"       = '${camioneta.name}'`));
    assert.ok(sql.includes(`"pluralName" = '${camioneta.plural}'`));
    assert.ok(sql.includes(`"slug"       = '${camioneta.slug}'`));
  });

  it("mueve los vehículos de «suv» y de «4x4» antes de borrar ninguna fila", () => {
    const move = sql.indexOf('UPDATE "Vehicle" v');
    const remove = sql.indexOf('DELETE FROM "Category"');
    assert.ok(move > 0 && remove > move, "borra antes de mover");
    assert.match(sql, /IN \('suv', '4x4'\)/);
  });

  it("solo borra filas que ya no tienen vehículos", () => {
    const deletes = sql.split('DELETE FROM "Category"').slice(1);
    assert.equal(deletes.length, 2, "borra la suv/4x4 y la van");
    for (const block of deletes) assert.match(block, /NOT EXISTS \(SELECT 1 FROM "Vehicle" v WHERE v\."categoryId" = /);
  });

  it("la van se desactiva si tiene vehículos y se borra si no", () => {
    assert.match(sql, /c\."slug" = 'van'/);
    assert.match(sql, /SET "active" = false/);
  });
});

describe("la banda de categorías de la portada", () => {
  const row = (
    slug: string,
    name: string,
    plural: string,
    vehicleType: "auto" | "moto",
    position: number,
  ): VehicleCategory => ({
    id: `${vehicleType}-${slug}`,
    name,
    pluralName: plural,
    slug,
    vehicleType,
    active: true,
    position,
  });

  // Las mismas filas que la base tiene después de sembrar.
  const seeded: VehicleCategory[] = [
    ...AUTO_BODY_TYPES.map((b, i) => row(b.slug, b.name, b.plural, "auto", i)),
    ...MOTO_BODY_TYPES.map((b, i) => row(b.slug, b.name, b.plural, "moto", i)),
  ];

  const render = (categories: VehicleCategory[]) =>
    renderToStaticMarkup(createElement(CategoryTiles, { categories }));

  /** Cada atajo: el texto y adónde lleva. */
  const tiles = (html: string) =>
    [...html.matchAll(/<a class="group flex[^"]*" href="([^"]*)">([\s\S]*?)<\/a>/g)].map(
      (match) => ({
        href: match[1].replaceAll("&amp;", "&"),
        label: match[2].replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim(),
      }),
    );

  it("enseña exactamente las categorías de la base, ni una más ni una menos", () => {
    assert.equal(tiles(render(seeded)).length, seeded.length);
    assert.deepEqual(
      tiles(render(seeded)).map((tile) => tile.label),
      seeded.map((category) => category.pluralName),
    );
  });

  it("son siete carros y siete motos", () => {
    const html = render(seeded);
    assert.equal(tiles(html).filter((tile) => tile.href.includes("tipo=auto&")).length, 7);
    assert.equal(tiles(html).filter((tile) => tile.href.includes("tipo=moto&")).length, 7);
    assert.doesNotMatch(html, />Vans</);
  });

  it("cada atajo cae en la vista filtrada de su categoría", () => {
    const hrefs = tiles(render(seeded)).map((tile) => tile.href);
    assert.ok(hrefs.includes("/vehiculos?tipo=auto&categoria=camioneta"));
    assert.ok(hrefs.includes("/vehiculos?tipo=auto&categoria=pickup"));
    assert.ok(hrefs.includes("/vehiculos?tipo=moto&categoria=sport"));
  });

  it("no queda ningún enlace a «suv»", () => {
    assert.doesNotMatch(render(seeded), /categoria=suv/);
  });

  it("si el admin desactiva o crea una categoría, la banda la sigue", () => {
    const withoutWagon = seeded.filter((category) => category.slug !== "wagon");
    const added = [...withoutWagon, row("roadster", "Roadster", "Roadsters", "auto", 99)];
    const labels = tiles(render(added)).map((tile) => tile.label);
    assert.ok(!labels.includes("Wagons"));
    assert.ok(labels.includes("Roadsters"));
  });

  it("un universo sin categorías no deja un título vacío", () => {
    const onlyCars = seeded.filter((category) => category.vehicleType === "auto");
    const html = render(onlyCars);
    assert.match(html, />4 ruedas</);
    assert.doesNotMatch(html, />2 ruedas</);
    assert.equal(render([]), "");
  });

  it("los grupos se llaman por sus ruedas, no «carros» y «motos»", () => {
    const html = render(seeded);
    assert.match(html, />4 ruedas</);
    assert.match(html, />2 ruedas</);
    assert.doesNotMatch(html, /<h3[^>]*>Carros</);
    assert.doesNotMatch(html, /<h3[^>]*>Motos</);
  });

  it("caben en una sola fila desde pantalla ancha: siete columnas por grupo", () => {
    const html = render(seeded);
    const lists = [...html.matchAll(/<ul class="([^"]*)"/g)].map((m) => m[1]);
    assert.equal(lists.length, 2);
    for (const list of lists) assert.ok(list.split(" ").includes("xl:grid-cols-7"));
  });

  it("cada grupo tiene su atajo a todo el universo", () => {
    const html = render(seeded);
    assert.match(html, /href="\/vehiculos\?tipo=auto"/);
    assert.match(html, /href="\/vehiculos\?tipo=moto"/);
  });
});
