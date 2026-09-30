"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Save,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { EquipmentPicker } from "@/components/admin/EquipmentPicker";
import { FormSection } from "@/components/admin/FormSection";
import { ImageManager } from "@/components/admin/ImageManager";
import { SpecialEquipmentEditor } from "@/components/admin/SpecialEquipmentEditor";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { PublicationPill } from "@/components/ui/PublicationPill";
import { adminJson } from "@/lib/admin-client";
import { typeLabel } from "@/lib/categories";
import { buildDescriptionTemplate } from "@/lib/description-template";
import { vehicleTitle } from "@/lib/format";
import { statusMeta } from "@/lib/vehicle-status";
import {
  ASPIRATIONS,
  AVAILABILITY_STATUSES,
  CHARGE_CONNECTORS,
  DRIVETRAINS,
  ELECTRIC_MOTOR_LAYOUTS,
  ENGINE_LAYOUTS,
  FUEL_TYPES,
  RANGE_STANDARDS,
  TAX_STATUSES,
  TRANSMISSIONS,
  VEHICLE_TAGS,
  VEHICLE_TYPES,
  hasCombustionEngine,
  hasElectricDrive,
  hasPlugCharging,
  hasTractionBattery,
  isFullyElectric,
} from "@/types/vehicle";
import type {
  AvailabilityStatus,
  SpecialEquipmentItem,
  Vehicle,
  VehicleCategory,
  VehicleType,
} from "@/types/vehicle";

const DESCRIPTION_LIMIT = 4000;
const FUN_FACT_LIMIT = 900;
const MAX_YEAR = new Date().getFullYear() + 2;

/**
 * Exactamente lo que el formulario posee. El slug y las fechas de sistema
 * son del servidor.
 *
 * Todo lo opcional es `null` y nunca `""` ni `0`: la base distingue "no lo
 * sabemos" de "cero", y la ficha pública oculta lo primero en vez de
 * escribir "N/A". Si el borrador usara cadenas vacías, esa distinción se
 * perdería aquí, antes de llegar al servidor.
 */
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
  exteriorColor: string;
  interiorColor: string;
  city: string;
  availability: AvailabilityStatus;
  featured: boolean;
  description: string;

  engineLayout: string;
  cylinders: number | null;
  displacementCc: number | null;
  aspiration: string;
  powerHp: number | null;
  torqueNm: number | null;
  accel0100: string;
  topSpeedKph: number | null;
  topSpeedLimited: boolean;
  topSpeedLimitedKph: number | null;
  curbWeightKg: number | null;

  icePowerHp: number | null;
  iceTorqueNm: number | null;
  electricMotorCount: number | null;
  electricPowerHp: number | null;
  electricTorqueNm: number | null;
  electricMotorLayout: string;
  hybridSystem: string;
  batteryGrossKwh: string;
  batteryNetKwh: string;
  electricRangeKm: number | null;
  rangeStandard: string;
  chargeAcKw: string;
  chargeDcKw: string;
  chargeConnector: string;
  chargeTimeNote: string;

  registrationCity: string;
  plateLastDigit: string;
  soatValid: boolean | null;
  soatExpiresOn: string;
  techInspectionApplies: boolean | null;
  techInspectionExpiresOn: string;
  taxStatus: string;
  taxesPaidThroughYear: number | null;
  documentationCheckedOn: string;
  documentationNotes: string;

  funFactEnabled: boolean;
  funFactTitle: string;
  funFactBody: string;

  features: string[];
  specialEquipment: SpecialEquipmentItem[];
  tags: string[];
}

/** Los campos que el borrador guarda como texto y la base como número. */
const DECIMAL_KEYS = [
  "accel0100",
  "batteryGrossKwh",
  "batteryNetKwh",
  "chargeAcKw",
  "chargeDcKw",
] as const satisfies readonly (keyof Draft)[];

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
    drivetrain: "Integral (AWD)",
    engine: "",
    exteriorColor: "",
    interiorColor: "",
    city: "Bogotá, CO",
    availability: "available",
    featured: false,
    description: "",

    engineLayout: "",
    cylinders: null,
    displacementCc: null,
    aspiration: "",
    powerHp: null,
    torqueNm: null,
    accel0100: "",
    topSpeedKph: null,
    topSpeedLimited: false,
    topSpeedLimitedKph: null,
    curbWeightKg: null,

    icePowerHp: null,
    iceTorqueNm: null,
    electricMotorCount: null,
    electricPowerHp: null,
    electricTorqueNm: null,
    electricMotorLayout: "",
    hybridSystem: "",
    batteryGrossKwh: "",
    batteryNetKwh: "",
    electricRangeKm: null,
    rangeStandard: "",
    chargeAcKw: "",
    chargeDcKw: "",
    chargeConnector: "",
    chargeTimeNote: "",

    registrationCity: "",
    plateLastDigit: "",
    soatValid: null,
    soatExpiresOn: "",
    techInspectionApplies: null,
    techInspectionExpiresOn: "",
    taxStatus: "",
    taxesPaidThroughYear: null,
    documentationCheckedOn: "",
    documentationNotes: "",

    funFactEnabled: false,
    funFactTitle: "",
    funFactBody: "",

    features: [],
    specialEquipment: [],
    tags: [],
  };
}

/** `null` se convierte en el vacío que el control sabe mostrar. */
const str = (value: string | null): string => value ?? "";
const num = (value: number | null): string => (value === null ? "" : String(value));

/**
 * Cargar un vehículo para editarlo.
 *
 * Es el reverso exacto de `toPayload`: cada campo que se puede crear se
 * puede editar, y se carga con el valor que tiene. Las dos funciones viven
 * juntas a propósito — si una gana un campo y la otra no, el dato se
 * escribe y se pierde al volver a guardar.
 */
function toDraft(vehicle: Vehicle): Draft {
  const { specs, electrification: e, documentation: d, funFact } = vehicle;
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
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    city: vehicle.city,
    availability: vehicle.availability,
    featured: vehicle.featured,
    description: vehicle.description,

    engineLayout: str(specs.engineLayout),
    cylinders: specs.cylinders,
    displacementCc: specs.displacementCc,
    aspiration: str(specs.aspiration),
    powerHp: specs.powerHp,
    torqueNm: specs.torqueNm,
    accel0100: num(specs.accel0100),
    topSpeedKph: specs.topSpeedKph,
    topSpeedLimited: specs.topSpeedLimited,
    topSpeedLimitedKph: specs.topSpeedLimitedKph,
    curbWeightKg: specs.curbWeightKg,

    icePowerHp: e.icePowerHp,
    iceTorqueNm: e.iceTorqueNm,
    electricMotorCount: e.electricMotorCount,
    electricPowerHp: e.electricPowerHp,
    electricTorqueNm: e.electricTorqueNm,
    electricMotorLayout: str(e.electricMotorLayout),
    hybridSystem: str(e.hybridSystem),
    batteryGrossKwh: num(e.batteryGrossKwh),
    batteryNetKwh: num(e.batteryNetKwh),
    electricRangeKm: e.electricRangeKm,
    rangeStandard: str(e.rangeStandard),
    chargeAcKw: num(e.chargeAcKw),
    chargeDcKw: num(e.chargeDcKw),
    chargeConnector: str(e.chargeConnector),
    chargeTimeNote: str(e.chargeTimeNote),

    registrationCity: str(d.registrationCity),
    plateLastDigit: num(d.plateLastDigit),
    soatValid: d.soatValid,
    soatExpiresOn: str(d.soatExpiresOn),
    techInspectionApplies: d.techInspectionApplies,
    techInspectionExpiresOn: str(d.techInspectionExpiresOn),
    taxStatus: str(d.taxStatus),
    taxesPaidThroughYear: d.taxesPaidThroughYear,
    documentationCheckedOn: str(d.documentationCheckedOn),
    documentationNotes: str(d.documentationNotes),

    funFactEnabled: funFact.enabled,
    funFactTitle: str(funFact.title),
    funFactBody: str(funFact.body),

    features: vehicle.features,
    specialEquipment: vehicle.specialEquipment,
    tags: vehicle.tags,
  };
}

/** Una cadena vacía es ausencia de dato; un decimal escrito con coma vale. */
function decimal(value: string): number | null {
  const clean = value.replace(",", ".").trim();
  if (clean === "") return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Tres estados de verdad: sí, no, y todavía no lo sabemos. */
function TriState({
  label,
  value,
  onChange,
  yes = "Sí",
  no = "No",
  containerClassName,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  yes?: string;
  no?: string;
  containerClassName?: string;
}) {
  return (
    <Select
      label={label}
      containerClassName={containerClassName}
      value={value === null ? "" : value ? "yes" : "no"}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === "" ? null : next === "yes");
      }}
    >
      {/* "Sin dato" es una respuesta legítima y por eso va primero: obligar a
          elegir sí o no produciría un dato inventado. */}
      <option value="">Sin dato</option>
      <option value="yes">{yes}</option>
      <option value="no">{no}</option>
    </Select>
  );
}

/**
 * Crear y editar son el mismo formulario.
 *
 * Al crear, el vehículo nace en borrador y no se publica solo: publicar es
 * una decisión aparte que se toma desde la lista o desde aquí, cuando ya
 * tiene fotos. Las imágenes solo se pueden gestionar sobre un vehículo que
 * ya existe, porque hay que subirlas a algún sitio.
 *
 * La ficha creció de doce campos a casi noventa, y por eso está repartida
 * en secciones: lo que se rellena siempre arriba y abierto, lo técnico en
 * bloques plegados. El sistema híbrido/eléctrico no se pliega: directamente
 * no existe si el combustible no lo pide, porque pedir la capacidad de la
 * batería de un carro a gasolina es invitar a inventarse un número.
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
  // El aviso que dejó la migración de taxonomía. Se quita al guardar, y solo
  // si quien edita lo marca como resuelto.
  const [reviewNote, setReviewNote] = useState(vehicle?.reviewNote ?? null);
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

  // Qué secciones tienen sentido para esta propulsión. Se calcula una vez y
  // lo usan tanto el formulario como, con las mismas funciones, la ficha
  // pública: no hay dos criterios distintos de "esto es un híbrido".
  const showIce = hasCombustionEngine(draft.fuelType);
  const showElectric = hasElectricDrive(draft.fuelType);
  const showBattery = hasTractionBattery(draft.fuelType);
  const showCharging = hasPlugCharging(draft.fuelType);
  const fullyElectric = isFullyElectric(draft.fuelType);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.make.trim()) next.make = "Indica la marca.";
    if (!draft.model.trim()) next.model = "Indica el modelo.";
    if (!draft.year || draft.year < 1900 || draft.year > MAX_YEAR) {
      next.year = "Año no válido.";
    }
    if (draft.price === null || draft.price <= 0) next.price = "Indica un precio.";
    // Se compara contra null explícitamente: 0 km es un valor legítimo —un
    // importado nuevo, una unidad sin uso— y `!draft.mileage` lo rechazaría.
    if (draft.mileage === null) next.mileage = "Indica el kilometraje.";
    else if (draft.mileage < 0) next.mileage = "Kilometraje no válido.";
    if (!draft.categoryId) next.categoryId = "Elige una carrocería.";
    if (!draft.description.trim()) next.description = "Escribe una descripción.";
    if (!draft.city.trim()) next.city = "Indica la ciudad.";

    for (const key of DECIMAL_KEYS) {
      const raw = draft[key];
      if (raw !== "" && decimal(raw) === null) next[key] = "No es un número.";
    }
    const accel = decimal(draft.accel0100);
    if (accel !== null && accel <= 0) next.accel0100 = "Debe ser mayor que cero.";

    if (draft.plateLastDigit !== "" && !/^[0-9]$/.test(draft.plateLastDigit)) {
      next.plateLastDigit = "Un solo dígito, de 0 a 9.";
    }
    if (draft.funFactEnabled && !draft.funFactBody.trim()) {
      next.funFactBody = "Escribe el apunte o desactívalo.";
    }
    if (draft.specialEquipment.some((item) => !item.name.trim())) {
      next.specialEquipment = "Cada extra necesita un nombre.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /**
   * El borrador, en la forma que espera el servidor.
   *
   * Los campos que no aplican a esta propulsión se mandan en `null` en vez
   * de omitirse: cambiar un PHEV a gasolina tiene que BORRAR su batería, no
   * dejarla escondida en la base esperando a que alguien la vuelva a ver.
   */
  function toPayload() {
    const text = (value: string) => value.trim() || null;
    const electric = showElectric;

    return {
      vehicleType: draft.vehicleType,
      make: draft.make,
      model: draft.model,
      version: draft.version,
      year: draft.year,
      // validate() ya garantizó que ninguno es null.
      price: draft.price ?? 0,
      mileage: draft.mileage ?? 0,
      categoryId: draft.categoryId,
      fuelType: draft.fuelType,
      transmission: draft.transmission,
      drivetrain: draft.drivetrain,
      engine: draft.engine,
      exteriorColor: draft.exteriorColor,
      interiorColor: draft.interiorColor,
      city: draft.city,
      availability: draft.availability,
      featured: draft.featured,
      description: draft.description,

      engineLayout: showIce ? text(draft.engineLayout) : null,
      cylinders: showIce ? draft.cylinders : null,
      displacementCc: showIce ? draft.displacementCc : null,
      aspiration: showIce ? text(draft.aspiration) : null,
      powerHp: draft.powerHp,
      torqueNm: draft.torqueNm,
      accel0100: decimal(draft.accel0100),
      topSpeedKph: draft.topSpeedKph,
      topSpeedLimited: draft.topSpeedLimited,
      topSpeedLimitedKph: draft.topSpeedLimited ? draft.topSpeedLimitedKph : null,
      curbWeightKg: draft.curbWeightKg,

      icePowerHp: electric && showIce ? draft.icePowerHp : null,
      iceTorqueNm: electric && showIce ? draft.iceTorqueNm : null,
      electricMotorCount: electric ? draft.electricMotorCount : null,
      electricPowerHp: electric ? draft.electricPowerHp : null,
      electricTorqueNm: electric ? draft.electricTorqueNm : null,
      electricMotorLayout: electric ? text(draft.electricMotorLayout) : null,
      hybridSystem: electric ? text(draft.hybridSystem) : null,
      batteryGrossKwh: showBattery ? decimal(draft.batteryGrossKwh) : null,
      batteryNetKwh: showBattery ? decimal(draft.batteryNetKwh) : null,
      electricRangeKm: showBattery ? draft.electricRangeKm : null,
      rangeStandard: showBattery ? text(draft.rangeStandard) : null,
      chargeAcKw: showCharging ? decimal(draft.chargeAcKw) : null,
      chargeDcKw: showCharging ? decimal(draft.chargeDcKw) : null,
      chargeConnector: showCharging ? text(draft.chargeConnector) : null,
      chargeTimeNote: showCharging ? text(draft.chargeTimeNote) : null,

      registrationCity: text(draft.registrationCity),
      plateLastDigit:
        draft.plateLastDigit === "" ? null : Number(draft.plateLastDigit),
      soatValid: draft.soatValid,
      soatExpiresOn: text(draft.soatExpiresOn),
      techInspectionApplies: draft.techInspectionApplies,
      // Si la tecnomecánica no aplica, una fecha de vencimiento no significa
      // nada: se borra en vez de quedarse contradiciendo al campo de al lado.
      techInspectionExpiresOn:
        draft.techInspectionApplies === false
          ? null
          : text(draft.techInspectionExpiresOn),
      taxStatus: text(draft.taxStatus),
      taxesPaidThroughYear: draft.taxesPaidThroughYear,
      documentationCheckedOn: text(draft.documentationCheckedOn),
      documentationNotes: text(draft.documentationNotes),

      funFactEnabled: draft.funFactEnabled,
      funFactTitle: draft.funFactEnabled ? text(draft.funFactTitle) : null,
      funFactBody: draft.funFactEnabled ? text(draft.funFactBody) : null,

      features: draft.features,
      equipment: equipmentText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      specialEquipment: draft.specialEquipment
        .filter((item) => item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          description: item.description?.trim() || null,
        })),
      tags: draft.tags,
      ...(reviewNote === null ? { reviewNote: null } : {}),
    };
  }

  async function save() {
    if (saving) return;
    if (!validate()) return;

    setSaving(true);
    setFormError(null);

    const payload = toPayload();

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
  const powerLabel = fullyElectric
    ? "Potencia total"
    : showElectric
      ? "Potencia combinada"
      : "Potencia";

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

      {/* El aviso que dejó la migración de taxonomía sobre un vehículo cuya
          carrocería no se podía deducir. Nunca se muestra en público. */}
      {reviewNote ? (
        <div className="mb-6 flex items-start gap-3 border border-burgundy/40 bg-burgundy/5 px-5 py-4">
          <AlertTriangle
            aria-hidden
            strokeWidth={1.5}
            className="mt-0.5 size-4 shrink-0 text-burgundy"
          />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[0.9375rem] leading-relaxed text-ink">
              {reviewNote}
            </p>
            <button
              type="button"
              onClick={() => {
                setReviewNote(null);
                setSaved(false);
              }}
              className="label-caps mt-2 text-[10px] text-burgundy underline underline-offset-4"
            >
              Ya lo revisé — quitar aviso al guardar
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <div className="grid gap-6">
          {/* A. Información básica ------------------------------------- */}
          <FormSection
            title="Información básica"
            collapsible={false}
            description="Lo que todo vehículo necesita para existir en el inventario."
          >
            <div className="grid gap-5 sm:grid-cols-3">
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
                min={1900}
                max={MAX_YEAR}
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
                label="Tipo"
                required
                value={draft.vehicleType}
                onChange={(e) => {
                  const type = e.target.value as VehicleType;
                  // La carrocería pertenece al tipo: cambiar de universo la
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
              {/* Carrocería, no "categoría": el campo se llama `categoryId`
                  en la base por historia, pero lo que describe es la forma
                  del vehículo. Un híbrido no es una carrocería. */}
              <Select
                label="Carrocería"
                required
                value={draft.categoryId}
                error={errors.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                containerClassName="sm:col-span-2"
              >
                {typeCategories.length === 0 ? (
                  <option value="">No hay carrocerías para este tipo</option>
                ) : null}
                {typeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.active ? "" : " (retirada)"}
                  </option>
                ))}
              </Select>

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
                <Checkbox
                  label="Destacado"
                  checked={draft.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />
              </div>
            </div>

            {/* Carácter. Va aquí y no en un desplegable porque un vehículo
                puede ser varias cosas a la vez —deportivo y de lujo— y
                porque ninguna de ellas es su carrocería. */}
            <fieldset className="mt-7 border-t border-stone pt-6">
              <legend className="label-caps mb-1 text-ink-soft">
                Carácter del vehículo
              </legend>
              <p className="mb-4 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                Opcional y múltiple. Un M3 es un sedán deportivo; un Golf GTI,
                un hatchback deportivo. La carrocería va arriba; esto es otra
                cosa.
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {VEHICLE_TAGS.map((tag) => (
                  <Checkbox
                    key={tag}
                    label={tag}
                    checked={draft.tags.includes(tag)}
                    onChange={(event) =>
                      set(
                        "tags",
                        event.target.checked
                          ? VEHICLE_TAGS.filter(
                              (t) => t === tag || draft.tags.includes(t),
                            )
                          : draft.tags.filter((t) => t !== tag),
                      )
                    }
                  />
                ))}
              </div>
            </fieldset>
          </FormSection>

          {/* B. Especificaciones técnicas ------------------------------ */}
          <FormSection
            title="Especificaciones técnicas"
            description="Todo opcional. Lo que se deje vacío no se muestra en la ficha: vale más un dato ausente que uno inventado."
            defaultOpen={editing}
          >
            {showIce ? (
              <fieldset>
                <legend className="eyebrow mb-4 text-ink-muted">Motor</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="Nombre del motor"
                    placeholder="3.0 L I6 TwinPower Turbo"
                    value={draft.engine}
                    containerClassName="sm:col-span-2"
                    onChange={(e) => set("engine", e.target.value)}
                  />
                  <Select
                    label="Arquitectura"
                    value={draft.engineLayout}
                    onChange={(e) => set("engineLayout", e.target.value)}
                  >
                    <option value="">Sin dato</option>
                    {ENGINE_LAYOUTS.map((layout) => (
                      <option key={layout} value={layout}>
                        {layout}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Alimentación"
                    value={draft.aspiration}
                    onChange={(e) => set("aspiration", e.target.value)}
                  >
                    <option value="">Sin dato</option>
                    {ASPIRATIONS.map((aspiration) => (
                      <option key={aspiration} value={aspiration}>
                        {aspiration}
                      </option>
                    ))}
                  </Select>
                  <NumberField
                    label="Cilindros"
                    max={16}
                    value={draft.cylinders}
                    onChange={(next) => set("cylinders", next)}
                  />
                  <NumberField
                    label="Cilindrada"
                    suffix="cc"
                    max={12_000}
                    value={draft.displacementCc}
                    onChange={(next) => set("displacementCc", next)}
                  />
                </div>
              </fieldset>
            ) : (
              <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                Un eléctrico no tiene cilindrada ni cilindros, así que esos
                campos no se piden. Su motor se describe abajo, en el sistema
                eléctrico.
              </p>
            )}

            <fieldset className={showIce ? "mt-8" : "mt-2"}>
              <legend className="eyebrow mb-4 text-ink-muted">Prestaciones</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <NumberField
                  label={powerLabel}
                  suffix="hp"
                  max={3_000}
                  value={draft.powerHp}
                  onChange={(next) => set("powerHp", next)}
                />
                <NumberField
                  label="Torque"
                  suffix="Nm"
                  max={5_000}
                  value={draft.torqueNm}
                  onChange={(next) => set("torqueNm", next)}
                />
                <Input
                  label="0–100 km/h (segundos)"
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  placeholder="5.6"
                  value={draft.accel0100}
                  error={errors.accel0100}
                  onChange={(e) => set("accel0100", e.target.value)}
                />
                <NumberField
                  label="Velocidad máxima"
                  suffix="km/h"
                  max={600}
                  value={draft.topSpeedKph}
                  onChange={(next) => set("topSpeedKph", next)}
                />
                <NumberField
                  label="Peso en orden de marcha"
                  suffix="kg"
                  max={10_000}
                  value={draft.curbWeightKg}
                  onChange={(next) => set("curbWeightKg", next)}
                />
                <div className="flex items-end pb-1">
                  <Checkbox
                    label="Velocidad limitada electrónicamente"
                    checked={draft.topSpeedLimited}
                    onChange={(e) => set("topSpeedLimited", e.target.checked)}
                  />
                </div>
                {draft.topSpeedLimited ? (
                  <NumberField
                    label="Límite electrónico"
                    suffix="km/h"
                    max={600}
                    value={draft.topSpeedLimitedKph}
                    onChange={(next) => set("topSpeedLimitedKph", next)}
                    error={errors.topSpeedLimitedKph}
                  />
                ) : null}
              </div>
              {/* La relación peso/potencia no se pide: con potencia y peso se
                  calcula, y pedirla a mano solo abre la puerta a que no cuadre. */}
              {draft.powerHp && draft.curbWeightKg ? (
                <p className="mt-4 font-serif text-[0.9375rem] text-ink-muted">
                  Relación peso/potencia:{" "}
                  <span className="text-ink tabular">
                    {(draft.curbWeightKg / draft.powerHp).toFixed(1)} kg/hp
                  </span>
                  . Se calcula sola y se muestra en la ficha.
                </p>
              ) : null}
            </fieldset>
          </FormSection>

          {/* C. Sistema híbrido / eléctrico ---------------------------- */}
          {showElectric ? (
            <FormSection
              title={fullyElectric ? "Sistema eléctrico" : "Sistema híbrido"}
              description="Aparece porque el combustible elegido lo lleva. Cambiar a gasolina o diésel borra estos datos al guardar."
              defaultOpen
            >
              <div className="grid gap-8">
                <Input
                  label="Nombre del sistema (opcional)"
                  placeholder="eDrive · Plug-in Hybrid"
                  value={draft.hybridSystem}
                  onChange={(e) => set("hybridSystem", e.target.value)}
                />

                {showIce ? (
                  <fieldset>
                    <legend className="eyebrow mb-4 text-ink-muted">
                      Motor de combustión
                    </legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <NumberField
                        label="Potencia ICE"
                        suffix="hp"
                        max={3_000}
                        value={draft.icePowerHp}
                        onChange={(next) => set("icePowerHp", next)}
                      />
                      <NumberField
                        label="Torque ICE"
                        suffix="Nm"
                        max={5_000}
                        value={draft.iceTorqueNm}
                        onChange={(next) => set("iceTorqueNm", next)}
                      />
                    </div>
                  </fieldset>
                ) : null}

                <fieldset>
                  <legend className="eyebrow mb-4 text-ink-muted">
                    Motor eléctrico
                  </legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <NumberField
                      label="Número de motores"
                      max={8}
                      value={draft.electricMotorCount}
                      onChange={(next) => set("electricMotorCount", next)}
                    />
                    <Select
                      label="Disposición"
                      value={draft.electricMotorLayout}
                      onChange={(e) => set("electricMotorLayout", e.target.value)}
                    >
                      <option value="">Sin dato</option>
                      {ELECTRIC_MOTOR_LAYOUTS.map((layout) => (
                        <option key={layout} value={layout}>
                          {layout}
                        </option>
                      ))}
                    </Select>
                    <NumberField
                      label="Potencia eléctrica"
                      suffix="hp"
                      max={3_000}
                      value={draft.electricPowerHp}
                      onChange={(next) => set("electricPowerHp", next)}
                    />
                    <NumberField
                      label="Torque eléctrico"
                      suffix="Nm"
                      max={10_000}
                      value={draft.electricTorqueNm}
                      onChange={(next) => set("electricTorqueNm", next)}
                    />
                  </div>
                </fieldset>

                {showBattery ? (
                  <fieldset>
                    <legend className="eyebrow mb-4 text-ink-muted">Batería</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input
                        label="Capacidad bruta (kWh)"
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        value={draft.batteryGrossKwh}
                        error={errors.batteryGrossKwh}
                        onChange={(e) => set("batteryGrossKwh", e.target.value)}
                      />
                      <Input
                        label="Capacidad útil (kWh)"
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        value={draft.batteryNetKwh}
                        error={errors.batteryNetKwh}
                        onChange={(e) => set("batteryNetKwh", e.target.value)}
                      />
                      <NumberField
                        label="Autonomía eléctrica"
                        suffix="km"
                        max={2_000}
                        value={draft.electricRangeKm}
                        onChange={(next) => set("electricRangeKm", next)}
                      />
                      {/* Sin ciclo, una autonomía no se puede comparar con
                          ninguna otra: 500 WLTP y 500 CLTC no son lo mismo. */}
                      <Select
                        label="Ciclo de homologación"
                        value={draft.rangeStandard}
                        onChange={(e) => set("rangeStandard", e.target.value)}
                      >
                        <option value="">Sin dato</option>
                        {RANGE_STANDARDS.map((standard) => (
                          <option key={standard} value={standard}>
                            {standard}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </fieldset>
                ) : null}

                {showCharging ? (
                  <fieldset>
                    <legend className="eyebrow mb-4 text-ink-muted">Carga</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Select
                        label="Conector"
                        value={draft.chargeConnector}
                        onChange={(e) => set("chargeConnector", e.target.value)}
                      >
                        <option value="">Sin dato</option>
                        {CHARGE_CONNECTORS.map((connector) => (
                          <option key={connector} value={connector}>
                            {connector}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Tiempo de carga (opcional)"
                        placeholder="3,5 h en AC de 11 kW"
                        value={draft.chargeTimeNote}
                        onChange={(e) => set("chargeTimeNote", e.target.value)}
                      />
                      <Input
                        label="Carga AC máxima (kW)"
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        value={draft.chargeAcKw}
                        error={errors.chargeAcKw}
                        onChange={(e) => set("chargeAcKw", e.target.value)}
                      />
                      <Input
                        label="Carga DC máxima (kW)"
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        value={draft.chargeDcKw}
                        error={errors.chargeDcKw}
                        onChange={(e) => set("chargeDcKw", e.target.value)}
                      />
                    </div>
                  </fieldset>
                ) : null}
              </div>
            </FormSection>
          ) : null}

          {/* D. Documentación y matrícula ------------------------------ */}
          <FormSection
            title="Documentación y matrícula"
            description="Lo que decide si el carro se puede usar mañana. Las fechas usan calendario; en la ficha se leen en español."
            defaultOpen={editing}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Ciudad de matrícula"
                value={draft.registrationCity}
                onChange={(e) => set("registrationCity", e.target.value)}
              />
              <Input
                label="Último dígito de la placa"
                inputMode="numeric"
                maxLength={1}
                placeholder="0–9"
                value={draft.plateLastDigit}
                error={errors.plateLastDigit}
                onChange={(e) =>
                  set("plateLastDigit", e.target.value.replace(/[^0-9]/g, "").slice(0, 1))
                }
              />

              <TriState
                label="SOAT vigente"
                value={draft.soatValid}
                onChange={(value) => set("soatValid", value)}
              />
              <Input
                label="Vence el SOAT"
                type="date"
                value={draft.soatExpiresOn}
                error={errors.soatExpiresOn}
                onChange={(e) => set("soatExpiresOn", e.target.value)}
              />

              <TriState
                label="Técnico-mecánica"
                yes="Aplica"
                no="No aplica todavía"
                value={draft.techInspectionApplies}
                onChange={(value) => set("techInspectionApplies", value)}
              />
              {/* Si no aplica no se pide fecha: obligar a inventar una es
                  justo lo que esta sección existe para evitar. */}
              {draft.techInspectionApplies === false ? (
                <p className="self-end pb-3 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                  En la ficha se leerá «No aplica actualmente».
                </p>
              ) : (
                <Input
                  label="Vence la técnico-mecánica"
                  type="date"
                  value={draft.techInspectionExpiresOn}
                  error={errors.techInspectionExpiresOn}
                  onChange={(e) => set("techInspectionExpiresOn", e.target.value)}
                />
              )}

              <Select
                label="Impuestos"
                value={draft.taxStatus}
                onChange={(e) => set("taxStatus", e.target.value)}
              >
                <option value="">Sin dato</option>
                {TAX_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              {/* Año y no fecha: el impuesto vehicular colombiano es anual. */}
              <NumberField
                label="Impuestos pagados hasta (año)"
                max={MAX_YEAR}
                value={draft.taxesPaidThroughYear}
                onChange={(next) => set("taxesPaidThroughYear", next)}
              />

              <Input
                label="Documentación verificada el"
                type="date"
                value={draft.documentationCheckedOn}
                error={errors.documentationCheckedOn}
                onChange={(e) => set("documentationCheckedOn", e.target.value)}
              />
            </div>

            <div className="mt-5">
              <Textarea
                label="Observaciones (opcional)"
                rows={3}
                maxLength={600}
                value={draft.documentationNotes}
                onChange={(e) => set("documentationNotes", e.target.value)}
              />
            </div>
          </FormSection>

          {/* E. Equipamiento ------------------------------------------- */}
          <FormSection
            title="Equipamiento"
            description="Del catálogo, para que dos carros con lo mismo se describan igual."
            badge={
              draft.features.length > 0
                ? `${draft.features.length} seleccionados`
                : undefined
            }
            defaultOpen={editing}
          >
            <EquipmentPicker
              selected={draft.features}
              onChange={(features) => set("features", features)}
            />
            <div className="mt-8 border-t border-stone pt-6">
              <Textarea
                label="Equipamiento adicional (una línea por ítem)"
                rows={4}
                value={equipmentText}
                onChange={(e) => {
                  setEquipmentText(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
          </FormSection>

          <FormSection
            title="Equipamiento destacado"
            description="Las opciones que distinguen a ESTA unidad. Se muestran primero en la ficha, antes del equipamiento normal."
            badge={
              draft.specialEquipment.length > 0
                ? `${draft.specialEquipment.length}`
                : undefined
            }
            defaultOpen={draft.specialEquipment.length > 0}
          >
            <SpecialEquipmentEditor
              items={draft.specialEquipment}
              onChange={(items) => set("specialEquipment", items)}
              error={errors.specialEquipment}
            />
          </FormSection>

          {/* F. Descripción -------------------------------------------- */}
          <FormSection
            title="Descripción"
            collapsible={false}
            description="Cuenta la unidad: qué la hace interesante, su estado, su historia. Las especificaciones y la documentación ya salen de los campos de arriba, así que no hace falta repetirlas."
          >
            <Textarea
              label="Descripción"
              required
              rows={10}
              maxLength={DESCRIPTION_LIMIT}
              value={draft.description}
              error={errors.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              {/* La plantilla solo aparece con el campo vacío: sobrescribir
                  un texto ya escrito por pulsar un botón sería imperdonable. */}
              {draft.description.trim() === "" ? (
                <button
                  type="button"
                  onClick={() =>
                    set("description", buildDescriptionTemplate(draft))
                  }
                  className="label-caps text-[10px] text-burgundy underline underline-offset-4"
                >
                  Empezar desde una plantilla
                </button>
              ) : (
                <span />
              )}
              <p className="text-right text-xs text-ink-muted tabular">
                {draft.description.length}/{DESCRIPTION_LIMIT}
              </p>
            </div>
          </FormSection>

          {/* G. Sabías que --------------------------------------------- */}
          <FormSection
            title="¿Sabías que?"
            description="Un apunte editorial opcional. Apagado no ocupa ni un pixel en la ficha."
            defaultOpen={draft.funFactEnabled}
          >
            <Checkbox
              label="Activar el apunte en la ficha pública"
              hint="Solo si hay algo real que contar. No se inventa para llenar espacio."
              checked={draft.funFactEnabled}
              onChange={(e) => set("funFactEnabled", e.target.checked)}
            />
            {draft.funFactEnabled ? (
              <div className="mt-6 grid gap-5">
                <Input
                  label="Título (opcional)"
                  value={draft.funFactTitle}
                  onChange={(e) => set("funFactTitle", e.target.value)}
                />
                <div>
                  <Textarea
                    label="El apunte"
                    rows={5}
                    maxLength={FUN_FACT_LIMIT}
                    value={draft.funFactBody}
                    error={errors.funFactBody}
                    onChange={(e) => set("funFactBody", e.target.value)}
                  />
                  <p className="mt-1.5 text-right text-xs text-ink-muted tabular">
                    {draft.funFactBody.length}/{FUN_FACT_LIMIT}
                  </p>
                </div>
              </div>
            ) : null}
          </FormSection>
        </div>

        {/* H. Fotografías ---------------------------------------------- */}
        <div className="grid gap-6 self-start">
          <FormSection title="Fotos del vehículo" collapsible={false}>
            {vehicle ? (
              <ImageManager vehicle={vehicle} />
            ) : (
              <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
                Guarda el vehículo primero. Las fotos se suben a su ficha, así
                que necesitan que exista.
              </p>
            )}
          </FormSection>
        </div>

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
