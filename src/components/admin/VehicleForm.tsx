"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useAdminInventory } from "@/components/admin/AdminInventoryProvider";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { vehicleTitle } from "@/lib/format";
import {
  DRIVETRAINS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CATEGORIES,
  VEHICLE_STATUSES,
} from "@/types/vehicle";
import type { Vehicle, VehicleDraft, VehicleImage } from "@/types/vehicle";
import { statusMeta } from "@/lib/vehicle-status";

const DESCRIPTION_LIMIT = 1000;

function emptyDraft(): VehicleDraft {
  return {
    make: "",
    model: "",
    version: "",
    year: new Date().getFullYear(),
    price: 0,
    mileage: 0,
    category: "SUV",
    fuelType: "Gasolina",
    transmission: "Automática",
    drivetrain: "4x4 (AWD)",
    engine: "",
    power: "",
    exteriorColor: "",
    interiorColor: "",
    city: "Bogotá, CO",
    status: "available",
    featured: false,
    description: "",
    equipment: [],
    images: [],
  };
}

/** Exactly the fields the form owns. Id, slug and createdAt belong to the store. */
function toDraft(vehicle: Vehicle): VehicleDraft {
  return {
    make: vehicle.make,
    model: vehicle.model,
    version: vehicle.version,
    year: vehicle.year,
    price: vehicle.price,
    mileage: vehicle.mileage,
    category: vehicle.category,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    engine: vehicle.engine,
    power: vehicle.power,
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    city: vehicle.city,
    status: vehicle.status,
    featured: vehicle.featured,
    description: vehicle.description,
    equipment: vehicle.equipment,
    images: vehicle.images,
  };
}

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const router = useRouter();
  const { create, update } = useAdminInventory();
  const [draft, setDraft] = useState<VehicleDraft>(
    vehicle ? toDraft(vehicle) : emptyDraft(),
  );
  const [equipmentText, setEquipmentText] = useState(draft.equipment.join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const editing = Boolean(vehicle);
  const set = <K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!draft.make.trim()) next.make = "Indica la marca.";
    if (!draft.model.trim()) next.model = "Indica el modelo.";
    if (!draft.year || draft.year < 1950) next.year = "Año no válido.";
    if (!draft.price || draft.price <= 0) next.price = "Indica un precio.";
    if (draft.mileage < 0) next.mileage = "Kilometraje no válido.";
    if (!draft.description.trim()) next.description = "Escribe una descripción.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = (status: VehicleDraft["status"]) => {
    if (!validate()) return;
    const payload: VehicleDraft = {
      ...draft,
      status,
      equipment: equipmentText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      images:
        draft.images.length > 0
          ? draft.images
          : [
              {
                src: "/images/brand/night.jpg",
                alt: `${vehicleTitle(draft)} sin fotografía asignada`,
              },
            ],
    };

    if (vehicle) update(vehicle.id, payload);
    else create(payload);
    router.push("/admin/vehiculos");
  };

  const title = editing ? "Editar vehículo" : "Crear vehículo";

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title={title}
        subtitle="Completa la información y sube las fotos del vehículo."
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
          <Link
            href="/admin/vehiculos"
            className="label-caps inline-flex items-center gap-2 rounded-xs border border-stone px-4 py-2.5 text-ink transition-colors hover:border-ink/40"
          >
            <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
            Volver
          </Link>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(draft.status === "draft" ? "available" : draft.status);
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
            <Input
              label="Precio"
              type="number"
              required
              inputMode="numeric"
              value={draft.price || ""}
              error={errors.price}
              onChange={(e) => set("price", Number(e.target.value))}
            />
            <Input
              label="Kilometraje"
              type="number"
              required
              inputMode="numeric"
              value={draft.mileage || ""}
              error={errors.mileage}
              onChange={(e) => set("mileage", Number(e.target.value))}
            />

            <Select
              label="Combustible"
              required
              value={draft.fuelType}
              onChange={(e) =>
                set("fuelType", e.target.value as VehicleDraft["fuelType"])
              }
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
              onChange={(e) =>
                set("transmission", e.target.value as VehicleDraft["transmission"])
              }
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
              onChange={(e) =>
                set("drivetrain", e.target.value as VehicleDraft["drivetrain"])
              }
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
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
            />

            <Input
              label="Color exterior"
              required
              value={draft.exteriorColor}
              onChange={(e) => set("exteriorColor", e.target.value)}
            />
            <Input
              label="Color interior"
              value={draft.interiorColor}
              onChange={(e) => set("interiorColor", e.target.value)}
            />
            <Select
              label="Categoría"
              required
              value={draft.category}
              onChange={(e) =>
                set("category", e.target.value as VehicleDraft["category"])
              }
            >
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>

            <Select
              label="Estado"
              required
              value={draft.status}
              onChange={(e) =>
                set("status", e.target.value as VehicleDraft["status"])
              }
              containerClassName="sm:col-span-2"
            >
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusMeta[s].label}
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
              onChange={(e) => setEquipmentText(e.target.value)}
            />
          </div>
        </section>

        <section className="self-start border border-stone bg-paper px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="font-display text-2xl text-ink">Fotos del vehículo</h2>
          <div className="mt-7">
            <ImageUploader
              value={draft.images}
              onChange={(images: VehicleImage[]) => set("images", images)}
              altPrefix={vehicleTitle(draft) || "Vehículo MILLE"}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end xl:col-span-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => save("draft")}
          >
            <Save aria-hidden className="size-4" strokeWidth={1.5} />
            Guardar borrador
          </Button>
          <Button type="submit" size="lg">
            {editing ? "Guardar cambios" : "Publicar"}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
          </Button>
        </div>
      </form>
    </div>
  );
}
