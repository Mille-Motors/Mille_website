"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Save } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ImageManager } from "@/components/admin/ImageManager";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { PublicationPill } from "@/components/ui/PublicationPill";
import { adminJson } from "@/lib/admin-client";
import { typeLabel } from "@/lib/categories";
import { vehicleTitle } from "@/lib/format";
import { statusMeta } from "@/lib/vehicle-status";
import {
  AVAILABILITY_STATUSES,
  DRIVETRAINS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TYPES,
} from "@/types/vehicle";
import type {
  AvailabilityStatus,
  Vehicle,
  VehicleCategory,
  VehicleType,
} from "@/types/vehicle";

const DESCRIPTION_LIMIT = 4000;

/** Exactamente lo que el formulario posee. El slug y las fechas son del servidor. */
interface Draft {
  vehicleType: VehicleType;
  make: string;
  model: string;
  version: string;
  year: number;
  /** `null` es "sin rellenar". 0 es cero de verdad, y en kilometraje es válido. */
  price: number | null;
  mileage: number | null;
  categoryId: string;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  engine: string;
  power: string;
  exteriorColor: string;
  interiorColor: string;
  city: string;
  availability: AvailabilityStatus;
  featured: boolean;
  description: string;
}

function emptyDraft(categories: VehicleCategory[]): Draft {
  const firstAuto = categories.find((c) => c.vehicleType === "auto");
  return {
    vehicleType: "auto",
    make: "",
    model: "",
    version: "",
    year: new Date().getFullYear(),
    price: null,
    mileage: null,
    categoryId: firstAuto?.id ?? categories[0]?.id ?? "",
    fuelType: "Gasolina",
    transmission: "Automática",
    drivetrain: "4x4 (AWD)",
    engine: "",
    power: "",
    exteriorColor: "",
    interiorColor: "",
    city: "Bogotá, CO",
    availability: "available",
    featured: false,
    description: "",
  };
}

function toDraft(vehicle: Vehicle): Draft {
  return {
    vehicleType: vehicle.vehicleType,
    make: vehicle.make,
    model: vehicle.model,
    version: vehicle.version,
    year: vehicle.year,
    price: vehicle.price,
    mileage: vehicle.mileage,
    categoryId: vehicle.category.id,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    engine: vehicle.engine,
    power: vehicle.power,
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    city: vehicle.city,
    availability: vehicle.availability,
    featured: vehicle.featured,
    description: vehicle.description,
  };
}

/**
 * Crear y editar son el mismo formulario.
 *
 * Al crear, el vehículo nace en borrador y no se publica solo: publicar es
 * una decisión aparte que se toma desde la lista o desde aquí, cuando ya
 * tiene fotos. Las imágenes solo se pueden gestionar sobre un vehículo que
 * ya existe, porque hay que subirlas a algún sitio.
 *
 * Si guardar falla, el borrador se queda como estaba: nada se pierde por un
 * error de red.
 */
export function VehicleForm({
  vehicle,
  categories,
}: {
  vehicle?: Vehicle;
  categories: VehicleCategory[];
}) {
  const router = useRouter();
  const editing = Boolean(vehicle);

  const [draft, setDraft] = useState<Draft>(
    vehicle ? toDraft(vehicle) : emptyDraft(categories),
  );
  const [equipmentText, setEquipmentText] = useState(
    (vehicle?.equipment ?? []).join("\n"),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const typeCategories = categories.filter(
    (category) => category.vehicleType === draft.vehicleType,
  );

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.make.trim()) next.make = "Indica la marca.";
    if (!draft.model.trim()) next.model = "Indica el modelo.";
    if (!draft.year || draft.year < 1900) next.year = "Año no válido.";
    if (draft.price === null || draft.price <= 0) next.price = "Indica un precio.";
    // Se compara contra null explícitamente: 0 km es un valor legítimo —un
    // importado nuevo, una unidad sin uso— y `!draft.mileage` lo rechazaría.
    if (draft.mileage === null) next.mileage = "Indica el kilometraje.";
    else if (draft.mileage < 0) next.mileage = "Kilometraje no válido.";
    if (!draft.categoryId) next.categoryId = "Elige una categoría.";
    if (!draft.description.trim()) next.description = "Escribe una descripción.";
    if (!draft.city.trim()) next.city = "Indica la ciudad.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (saving) return;
    if (!validate()) return;

    setSaving(true);
    setFormError(null);

    const payload = {
      ...draft,
      // validate() ya garantizó que ninguno es null.
      price: draft.price ?? 0,
      mileage: draft.mileage ?? 0,
      equipment: equipmentText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };

    const result = editing
      ? await adminJson<{ vehicle: Vehicle }>(
          `/api/admin/vehicles/${vehicle!.id}`,
          "PATCH",
          payload,
        )
      : await adminJson<{ vehicle: Vehicle }>(
          "/api/admin/vehicles",
          "POST",
          payload,
        );

    setSaving(false);

    if (!result.ok) {
      setFormError(result.message);
      // El servidor valida de nuevo y puede tener razón donde el formulario
      // no la tenía: sus errores por campo mandan.
      if (result.fields) setErrors(result.fields);
      return;
    }

    if (!editing) {
      // Recién creado: se va a su pantalla de edición, que es donde se
      // pueden subir las fotos y publicarlo.
      router.push(`/admin/vehiculos/${result.data.vehicle.id}/editar`);
      router.refresh();
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function togglePublication() {
    if (!vehicle || saving) return;
    setSaving(true);
    setFormError(null);

    const result = await adminJson(
      `/api/admin/vehicles/${vehicle.id}/publish`,
      "POST",
      {
        publication: vehicle.publication === "published" ? "draft" : "published",
      },
    );

    setSaving(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    router.refresh();
  }

  const title = editing ? "Editar vehículo" : "Crear vehículo";

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title={title}
        subtitle={
          editing
            ? "Edita la información y administra las fotos del vehículo."
            : "Completa la información. El vehículo se guarda como borrador y las fotos se suben en el siguiente paso."
        }
        breadcrumb={
          <nav aria-label="Ruta">
            <ol className="flex items-center gap-2 text-xs text-ink-muted">
              <li>
                <Link
                  href="/admin/vehiculos"
                  className="transition-colors hover:text-burgundy"
                >
                  Vehículos
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li aria-current="page" className="text-ink-soft">
                {editing ? vehicleTitle(draft) : "Nuevo vehículo"}
              </li>
            </ol>
          </nav>
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
            {vehicle ? <PublicationPill status={vehicle.publication} /> : null}
            <Link
              href="/admin/vehiculos"
              className="label-caps inline-flex items-center gap-2 rounded-xs border border-stone px-4 py-2.5 text-ink transition-colors hover:border-ink/40"
            >
              <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
              Volver
            </Link>
          </div>
        }
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <section className="border border-stone bg-paper px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="font-display text-2xl text-ink">Información básica</h2>

          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            <Input
              label="Marca"
              required
              value={draft.make}
              error={errors.make}
              onChange={(e) => set("make", e.target.value)}
            />
            <Input
              label="Modelo"
              required
              value={draft.model}
              error={errors.model}
              onChange={(e) => set("model", e.target.value)}
            />
            <Input
              label="Versión"
              value={draft.version}
              error={errors.version}
              onChange={(e) => set("version", e.target.value)}
            />
            <Input
              label="Año"
              type="number"
              required
              inputMode="numeric"
              value={draft.year || ""}
              error={errors.year}
              onChange={(e) => set("year", Number(e.target.value))}
            />
            <NumberField
              label="Precio"
              required
              prefix="$"
              max={100_000_000_000}
              value={draft.price}
              error={errors.price}
              onChange={(next) => set("price", next)}
            />
            <NumberField
              label="Kilometraje"
              required
              suffix="km"
              max={2_000_000}
              value={draft.mileage}
              error={errors.mileage}
              onChange={(next) => set("mileage", next)}
            />

            <Select
              label="Combustible"
              required
              value={draft.fuelType}
              error={errors.fuelType}
              onChange={(e) => set("fuelType", e.target.value)}
            >
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            <Select
              label="Transmisión"
              required
              value={draft.transmission}
              error={errors.transmission}
              onChange={(e) => set("transmission", e.target.value)}
            >
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select
              label="Tracción"
              required
              value={draft.drivetrain}
              error={errors.drivetrain}
              onChange={(e) => set("drivetrain", e.target.value)}
            >
              {DRIVETRAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>

            <Input
              label="Motor"
              value={draft.engine}
              onChange={(e) => set("engine", e.target.value)}
            />
            <Input
              label="Potencia"
              value={draft.power}
              onChange={(e) => set("power", e.target.value)}
            />
            <Input
              label="Ciudad"
              required
              value={draft.city}
              error={errors.city}
              onChange={(e) => set("city", e.target.value)}
            />

            <Input
              label="Color exterior"
              value={draft.exteriorColor}
              onChange={(e) => set("exteriorColor", e.target.value)}
            />
            <Input
              label="Color interior"
              value={draft.interiorColor}
              onChange={(e) => set("interiorColor", e.target.value)}
            />
            <Select
              label="Tipo"
              required
              value={draft.vehicleType}
              onChange={(e) => {
                const type = e.target.value as VehicleType;
                // La categoría pertenece al tipo: cambiar de universo la
                // reinicia a la primera del nuevo.
                const first = categories.find((c) => c.vehicleType === type);
                setDraft((current) => ({
                  ...current,
                  vehicleType: type,
                  categoryId: first?.id ?? "",
                }));
                setSaved(false);
              }}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel[t]}
                </option>
              ))}
            </Select>
            <Select
              label="Categoría"
              required
              value={draft.categoryId}
              error={errors.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              {typeCategories.length === 0 ? (
                <option value="">No hay categorías para este tipo</option>
              ) : null}
              {typeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.active ? "" : " (inactiva)"}
                </option>
              ))}
            </Select>

            <Select
              label="Disponibilidad"
              required
              value={draft.availability}
              onChange={(e) =>
                set("availability", e.target.value as AvailabilityStatus)
              }
              containerClassName="sm:col-span-2"
            >
              {AVAILABILITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusMeta[status].label}
                </option>
              ))}
            </Select>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 font-serif text-[0.9375rem] text-ink-soft">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="size-4 accent-[color:var(--color-burgundy)]"
                />
                Destacado
              </label>
            </div>
          </div>

          <div className="mt-5">
            <Textarea
              label="Descripción"
              required
              rows={5}
              maxLength={DESCRIPTION_LIMIT}
              value={draft.description}
              error={errors.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <p className="mt-1.5 text-right text-xs text-ink-muted tabular">
              {draft.description.length}/{DESCRIPTION_LIMIT}
            </p>
          </div>

          <div className="mt-5">
            <Textarea
              label="Equipamiento (una línea por ítem)"
              rows={5}
              value={equipmentText}
              onChange={(e) => {
                setEquipmentText(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </section>

        <section className="self-start border border-stone bg-paper px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="font-display text-2xl text-ink">Fotos del vehículo</h2>
          {vehicle ? (
            <div className="mt-7">
              <ImageManager vehicle={vehicle} />
            </div>
          ) : (
            <p className="mt-6 font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
              Guarda el vehículo primero. Las fotos se suben a su ficha, así que
              necesitan que exista.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:col-span-2">
          {formError ? (
            <p role="alert" className="mr-auto text-xs text-burgundy">
              {formError}
            </p>
          ) : saved ? (
            <p className="mr-auto text-xs text-ink-muted">Cambios guardados.</p>
          ) : null}

          {/* Solo cuando está publicado: el sitio público únicamente sirve
              PUBLISHED, así que en borrador o archivado este enlace abría
              deliberadamente una pestaña con un 404. */}
          {vehicle?.publication === "published" ? (
            <a
              href={`/vehiculos/${vehicle.slug}`}
                target="_blank"
                rel="noreferrer noopener"
                className="label-caps inline-flex h-13 items-center justify-center gap-2.5 rounded-xs border border-stone px-8 text-ink transition-colors hover:border-ink/40"
              >
              Ver ficha pública
              <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
            </a>
          ) : null}

          {vehicle ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={saving}
              onClick={() => void togglePublication()}
            >
              {vehicle.publication === "published" ? "Despublicar" : "Publicar"}
            </Button>
          ) : null}

          <Button type="submit" size="lg" disabled={saving}>
            {saving ? (
              "Guardando…"
            ) : editing ? (
              <>
                <Save aria-hidden className="size-4" strokeWidth={1.5} />
                Guardar cambios
              </>
            ) : (
              <>
                Guardar borrador
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
