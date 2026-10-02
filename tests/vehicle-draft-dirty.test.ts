import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { equipmentTextFromLines } from "@/lib/equipment";
import {
  draftFromVehicle,
  draftIsDirty,
  emptyDraft,
  vehiclePayload,
} from "@/lib/vehicle-draft";
import { makeVehicle } from "./support/vehicle";
import type { Vehicle } from "@/types/vehicle";

/**
 * Cambios sin guardar.
 *
 * El formulario mantenía el borrador y la copia guardada en paralelo y no
 * los comparaba nunca: editar el precio y navegar a otra pantalla perdía el
 * trabajo en silencio.
 *
 * La comparación se hace sobre el PAYLOAD, que es la forma canónica, y no
 * sobre el estado de los controles. Esa distinción es el punto: el borrador
 * guarda texto a medio escribir —un decimal con coma, un espacio de más, una
 * línea de plantilla sin rellenar— y nada de eso llega a la base. Marcar
 * pendiente un formulario ya guardado sería tan malo como no avisar.
 */
const saved: Vehicle = makeVehicle({
  make: "BMW",
  model: "X5",
  price: 420_000_000,
  description: "Un X5 enchufable.",
  equipment: ["[Exterior]", "Faros LED"],
  tags: ["Familiar"],
  specs: { powerHp: 394 },
});

const state = (vehicle: Vehicle) => ({
  persisted: vehicle,
  draft: draftFromVehicle(vehicle),
  equipmentText: equipmentTextFromLines(vehicle.equipment),
  reviewNote: vehicle.reviewNote,
});

describe("sin tocar nada, no hay nada que guardar", () => {
  it("el borrador recién cargado está limpio", () => {
    assert.equal(draftIsDirty(state(saved)), false);
  });

  it("un vehículo vacío recién cargado también", () => {
    assert.equal(draftIsDirty(state(makeVehicle())), false);
  });

  it("una pantalla de alta en blanco no está sucia", () => {
    assert.equal(
      draftIsDirty({
        persisted: null,
        draft: emptyDraft(),
        equipmentText: "",
        reviewNote: null,
      }),
      false,
    );
  });

  it("pero una de alta con algo escrito, sí", () => {
    assert.equal(
      draftIsDirty({
        persisted: null,
        draft: { ...emptyDraft(), make: "Ducati" },
        equipmentText: "",
        reviewNote: null,
      }),
      true,
    );
  });
});

describe("lo que cuenta como cambio", () => {
  const cases: { label: string; mutate: (s: ReturnType<typeof state>) => void }[] = [
    { label: "el precio", mutate: (s) => void (s.draft.price = 410_000_000) },
    { label: "la descripción", mutate: (s) => void (s.draft.description = "Otro texto.") },
    { label: "un dato técnico", mutate: (s) => void (s.draft.powerHp = 400) },
    { label: "las etiquetas", mutate: (s) => void (s.draft.tags = []) },
    { label: "el equipamiento", mutate: (s) => void (s.equipmentText += "\nSensor de lluvia") },
    { label: "el equipamiento especial", mutate: (s) => void (s.draft.specialEquipment = [{ name: "Bowers & Wilkins", description: null }]) },
    { label: "la documentación", mutate: (s) => void (s.draft.soatExpiresOn = "2027-03-01") },
    { label: "la disponibilidad", mutate: (s) => void (s.draft.availability = "sold") },
    { label: "el destacado", mutate: (s) => void (s.draft.featured = true) },
    { label: "el apunte editorial", mutate: (s) => void (s.draft.funFactEnabled = true) },
    { label: "el universo", mutate: (s) => void (s.draft.vehicleType = "moto") },
  ];

  for (const { label, mutate } of cases) {
    it(`cambiar ${label} ensucia`, () => {
      const next = state(saved);
      mutate(next);
      assert.equal(draftIsDirty(next), true);
    });
  }
});

describe("lo que NO cuenta como cambio", () => {
  it("un espacio de más que el servidor va a recortar igual", () => {
    // `city` se manda recortado, así que un espacio al final no llega a la
    // base y no debería encender el aviso.
    const next = state(saved);
    next.draft.city = `${next.draft.city}   `;
    assert.equal(draftIsDirty(next), false);
  });

  it("una línea de plantilla sin rellenar", () => {
    const next = state(saved);
    next.equipmentText += "\n\n";
    assert.equal(draftIsDirty(next), false);
  });

  it("un decimal escrito con coma en vez de punto", () => {
    const withAccel = makeVehicle({ specs: { accel0100: 4.5 } });
    const next = state(withAccel);
    next.draft.accel0100 = "4,5";
    assert.equal(draftIsDirty(next), false);
  });

  /**
   * Ajustar el encuadre o reordenar las fotos se guarda solo contra el
   * servidor y devuelve un vehículo nuevo. Ninguno de esos campos está en
   * el payload del formulario, así que no pueden encender ni apagar el
   * aviso de cambios pendientes.
   */
  it("guardar el encuadre de una foto no ensucia el formulario", () => {
    const before = makeVehicle({
      images: [
        { id: "i1", src: "/a.jpg", alt: "a", source: "storage", storagePath: "v/a.jpg", focal: { x: 50, y: 50 } },
      ],
    });
    const after: Vehicle = {
      ...before,
      images: [{ ...before.images[0], focal: { x: 20, y: 80 } }],
    };

    // El borrador sigue siendo el de antes; solo cambió `persisted`.
    assert.equal(
      draftIsDirty({ ...state(before), persisted: after }),
      false,
    );
  });

  it("reordenar las fotos tampoco", () => {
    const one = { id: "i1", src: "/a.jpg", alt: "a", source: "storage" as const, storagePath: "v/a.jpg", focal: { x: 50, y: 50 } };
    const two = { id: "i2", src: "/b.jpg", alt: "b", source: "storage" as const, storagePath: "v/b.jpg", focal: { x: 50, y: 50 } };
    const before = makeVehicle({ images: [one, two] });
    const after: Vehicle = { ...before, images: [two, one] };

    assert.equal(draftIsDirty({ ...state(before), persisted: after }), false);
  });
});

describe("guardar deja el formulario limpio", () => {
  it("adoptar lo que el servidor devolvió apaga el aviso", () => {
    // El servidor recorta: se escribe "BMW " y vuelve "BMW". Si el
    // formulario se quedara con lo tecleado, seguiría diciendo que hay
    // cambios por una diferencia que ya no existe en la base.
    const next = state(saved);
    next.draft.make = "BMW   ";
    const serverCopy: Vehicle = { ...saved, make: "BMW" };

    assert.equal(draftIsDirty(next), true, "antes de guardar está sucio");
    assert.equal(
      draftIsDirty(state(serverCopy)),
      false,
      "tras adoptar la respuesta, limpio",
    );
  });
});

describe("el payload es el mismo de siempre", () => {
  it("vehículo → borrador → payload conserva lo que importa", () => {
    const payload = vehiclePayload(
      draftFromVehicle(saved),
      equipmentTextFromLines(saved.equipment),
      saved.reviewNote,
    );
    assert.equal(payload.make, "BMW");
    assert.equal(payload.price, 420_000_000);
    assert.deepEqual(payload.equipment, ["[Exterior]", "Faros LED"]);
    assert.deepEqual(payload.tags, ["Familiar"]);
    assert.equal(payload.powerHp, 394);
  });
});
