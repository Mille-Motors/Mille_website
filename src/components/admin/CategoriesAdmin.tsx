"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
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
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Categorías"
        subtitle="Cómo se agrupa el inventario en el sitio público"
        action={
          <Button size="sm" onClick={() => setCreating((open) => !open)}>
            <Plus aria-hidden className="size-3.5" strokeWidth={1.6} />
            Nueva categoría
          </Button>
        }
      />

      {creating ? (
        <form
          onSubmit={create}
          className="mb-8 grid gap-5 border border-stone bg-paper px-5 py-6 sm:grid-cols-4 sm:px-7"
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
        <p role="alert" className="mb-6 text-xs text-burgundy">
          {error}
        </p>
      ) : null}

      <div className={cn("grid gap-8", busy && "opacity-60")} aria-busy={busy}>
        {grouped.map(({ type, rows }) => (
          <section key={type}>
            <h2 className="mb-4 font-display text-2xl text-ink">
              {typeLabel[type]}
            </h2>

            {rows.length === 0 ? (
              <p className="border border-stone bg-paper px-5 py-8 font-serif text-sm text-ink-muted">
                Todavía no hay categorías para este tipo.
              </p>
            ) : (
              <ul className="divide-y divide-stone border border-stone bg-paper">
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
                        className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-35"
                      >
                        <ArrowUp aria-hidden className="size-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === rows.length - 1}
                        onClick={() => void move(row, 1)}
                        aria-label={`Bajar ${row.name}`}
                        className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-35"
                      >
                        <ArrowDown aria-hidden className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[0.9375rem] text-ink">
                        {row.name}
                        {row.pluralName !== row.name ? (
                          <span className="text-ink-muted"> · {row.pluralName}</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        /{row.slug} · {row.vehicleCount}{" "}
                        {row.vehicleCount === 1 ? "vehículo" : "vehículos"}
                      </p>
                    </div>

                    <label className="flex items-center gap-2.5 font-serif text-sm text-ink-soft">
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

                    <button
                      type="button"
                      disabled={busy || row.vehicleCount > 0}
                      title={
                        row.vehicleCount > 0
                          ? "Tiene vehículos: desactívala en vez de borrarla."
                          : "Eliminar categoría"
                      }
                      onClick={() =>
                        void run(() =>
                          adminJson(`/api/admin/categories/${row.id}`, "DELETE"),
                        )
                      }
                      aria-label={`Eliminar ${row.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/40 hover:text-burgundy disabled:opacity-35"
                    >
                      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.4} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
