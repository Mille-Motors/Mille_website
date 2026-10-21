"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { FieldDensity, Input, Select } from "@/components/ui/Field";
import { Panel, buttonClass } from "@/components/admin/kit";
import { CategorySketch } from "@/components/vehicle/sketch";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { adminJson } from "@/lib/admin-client";
import { typeLabel } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { VEHICLE_TYPES } from "@/types/vehicle";
import type { VehicleCategory, VehicleType } from "@/types/vehicle";

type Row = VehicleCategory & { vehicleCount: number };

/**
 * Taxonomía, no un CMS.
 *
 * Se puede crear, renombrar, reordenar y activar o desactivar. Borrar solo
 * está permitido si no hay vehículos detrás; con vehículos, el servidor
 * responde que la desactives, que es lo que de verdad se quiere hacer: una
 * categoría inactiva deja de ofrecerse al crear vehículos pero no rompe los
 * que ya existen ni sus URLs.
 *
 * Para los carros, estas filas son CARROCERÍAS —Camioneta, Sedán, Pickup,
 * Coupé— y el conjunto con el que arranca una base limpia vive en
 * src/lib/body-types.ts. Son las mismas que ve el público en la portada y en
 * el filtro del inventario, y cada una lleva el boceto con el que se dibuja
 * allí. "Híbrido", "Eléctrico" y "4x4" ya no caben aquí:
 * son propulsión y tracción, y tienen sus propias columnas en el vehículo.
 * Si aparecen en la lista como inactivas, son filas antiguas que la
 * migración conservó porque todavía tienen vehículos colgando.
 */
export function CategoriesAdmin({ categories }: { categories: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    pluralName: string;
    vehicleType: VehicleType;
  }>({ name: "", pluralName: "", vehicleType: "auto" });

  async function run(call: () => Promise<{ ok: boolean; message?: string }>) {
    if (busy) return false;
    setBusy(true);
    setError(null);
    const result = await call();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "No se pudo completar.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Indica el nombre de la categoría.");
      return;
    }
    const done = await run(() =>
      adminJson("/api/admin/categories", "POST", {
        name: form.name.trim(),
        pluralName: form.pluralName.trim() || undefined,
        vehicleType: form.vehicleType,
        active: true,
      }),
    );
    if (done) {
      setForm({ name: "", pluralName: "", vehicleType: form.vehicleType });
      setCreating(false);
    }
  }

  const patch = (id: string, body: Record<string, unknown>) =>
    run(() => adminJson(`/api/admin/categories/${id}`, "PATCH", body));

  /**
   * Reordenar intercambia posiciones con el vecino del mismo universo. Se
   * hace en dos peticiones porque son dos filas independientes; si la
   * segunda fallara, la pantalla se refresca y muestra el estado real.
   */
  async function move(row: Row, delta: number) {
    const siblings = categories
      .filter((c) => c.vehicleType === row.vehicleType)
      .sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((c) => c.id === row.id);
    const target = siblings[index + delta];
    if (!target) return;

    await run(async () => {
      const first = await adminJson(`/api/admin/categories/${row.id}`, "PATCH", {
        position: target.position,
      });
      if (!first.ok) return first;
      return adminJson(`/api/admin/categories/${target.id}`, "PATCH", {
        position: row.position,
      });
    });
  }

  const grouped = VEHICLE_TYPES.map((type) => ({
    type,
    rows: categories
      .filter((c) => c.vehicleType === type)
      .sort((a, b) => a.position - b.position),
  }));

  return (
    <FieldDensity value="compact">
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        eyebrow="Inventario"
        title="Categorías"
        subtitle="La carrocería de los carros y la categoría de las motos"
        action={
          <Button size="sm" onClick={() => setCreating((open) => !open)}>
            <Plus aria-hidden className="size-4" strokeWidth={1.8} />
            Nueva categoría
          </Button>
        }
      />

      {creating ? (
        <form
          onSubmit={create}
          className="mb-8 grid gap-4 rounded-xl border border-stone bg-paper p-5 sm:grid-cols-4"
        >
          <Input
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Plural"
            placeholder="Sedanes"
            value={form.pluralName}
            onChange={(e) => setForm({ ...form, pluralName: e.target.value })}
          />
          <Select
            label="Tipo"
            value={form.vehicleType}
            onChange={(e) =>
              setForm({ ...form, vehicleType: e.target.value as VehicleType })
            }
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel[type]}
              </option>
            ))}
          </Select>
          <div className="flex items-end gap-3 pb-0.5">
            <Button type="submit" disabled={busy}>
              {busy ? "Creando…" : "Crear"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreating(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mb-6 text-[0.9375rem] text-burgundy">
          {error}
        </p>
      ) : null}

      <div className={cn("grid gap-8", busy && "opacity-60")} aria-busy={busy}>
        {grouped.map(({ type, rows }) => (
          <section key={type}>
            <h2 className="mb-3 text-lg font-semibold text-ink">
              {typeLabel[type]}
            </h2>

            {rows.length === 0 ? (
              <Panel className="px-5 py-8 text-[0.9375rem] text-ink-muted">
                Todavía no hay categorías para este tipo.
              </Panel>
            ) : (
              <ul className="divide-y divide-stone rounded-xl border border-stone bg-paper">
                {rows.map((row, index) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4"
                  >
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() => void move(row, -1)}
                        aria-label={`Subir ${row.name}`}
                        className={cn(buttonClass, "size-8 h-8 px-0 text-ink-muted hover:text-ink")}
                      >
                        <ArrowUp aria-hidden className="size-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === rows.length - 1}
                        onClick={() => void move(row, 1)}
                        aria-label={`Bajar ${row.name}`}
                        className={cn(buttonClass, "size-8 h-8 px-0 text-ink-muted hover:text-ink")}
                      >
                        <ArrowDown aria-hidden className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* El mismo dibujo que ve el público en la portada. */}
                    <CategorySketch
                      slug={row.slug}
                      vehicleType={row.vehicleType}
                      variant="mark"
                      className={cn(
                        "hidden h-auto w-14 shrink-0 sm:block",
                        row.active ? "text-burgundy" : "text-ink-muted/50",
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-ink">
                        {row.name}
                        {row.pluralName !== row.name ? (
                          <span className="font-normal text-ink-muted"> · {row.pluralName}</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        /{row.slug} · {row.vehicleCount}{" "}
                        {row.vehicleCount === 1 ? "vehículo" : "vehículos"}
                      </p>
                    </div>

                    <label className="flex items-center gap-2.5 text-[0.9375rem] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={row.active}
                        disabled={busy}
                        onChange={(e) =>
                          void patch(row.id, { active: e.target.checked })
                        }
                        className="size-4 accent-[color:var(--color-burgundy)]"
                      />
                      Activa
                    </label>

                    <ConfirmButton
                      question={`¿Eliminar la categoría ${row.name} definitivamente? Esta acción no se puede deshacer.`}
                      disabled={busy || row.vehicleCount > 0}
                      onConfirm={() =>
                        void run(() =>
                          adminJson(`/api/admin/categories/${row.id}`, "DELETE"),
                        )
                      }
                      ariaLabel={`Eliminar ${row.name}`}
                      className={cn(buttonClass, "size-9 px-0 text-ink-muted hover:border-burgundy/40 hover:text-burgundy")}
                    >
                      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.4} />
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
    </FieldDensity>
  );
}
