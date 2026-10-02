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
import { FormSection } from "@/components/admin/FormSection";
import { ImageManager } from "@/components/admin/ImageManager";
import { useUnsavedChangesGuard } from "@/components/admin/useUnsavedChangesGuard";
import { SpecialEquipmentEditor } from "@/components/admin/SpecialEquipmentEditor";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { PublicationPill } from "@/components/ui/PublicationPill";
import { adminJson } from "@/lib/admin-client";
import { typeLabel } from "@/lib/categories";
import { buildDescriptionTemplate } from "@/lib/description-template";
import {
  equipmentLinesFromText,
  equipmentTemplate,
  equipmentTextFromLines,
} from "@/lib/equipment";
import { vehicleLabel } from "@/lib/format";
import { publicationBlockers } from "@/lib/publication";
import {
  DECIMAL_KEYS,
  decimalFromInput,
  draftFromVehicle,
  draftHasContent,
  draftIsDirty,
  draftPublicationCandidate,
  emptyDraft,
  vehiclePayload,
  type Draft,
} from "@/lib/vehicle-draft";
import { statusMeta } from "@/lib/vehicle-status";
import {
  ASPIRATIONS,
  AVAILABILITY_STATUSES,
  CHARGE_CONNECTORS,
  DRIVETRAINS,
  ELECTRIC_MOTOR_LAYOUTS,
  FINAL_DRIVES,
  FUEL_TYPES,
  MAX_GEAR_COUNT,
  RANGE_STANDARDS,
  TAX_STATUSES,
  VEHICLE_TYPES,
  categoryLabel,
  engineLayoutsFor,
  keepOnTypeChange,
  hasCombustionEngine,
  hasElectricDrive,
  hasPlugCharging,
  hasTractionBattery,
  isFullyElectric,
  tagsFor,
  transmissionsFor,
  usesDrivetrain,
  usesFinalDrive,
  usesInteriorColor,
} from "@/types/vehicle";
import type {
  AvailabilityStatus,
  Vehicle,
  VehicleCategory,
  VehicleType,
} from "@/types/vehicle";

const DESCRIPTION_LIMIT = 4000;
const FUN_FACT_LIMIT = 900;
const MAX_YEAR = new Date().getFullYear() + 2;

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
  /** Se entró por "Crear vehículo". No cambia aunque la fila ya exista. */
  const creating = !vehicle;

  /**
   * La fila que hay detrás, si ya existe.
   *
   * En edición es la que llega por props. En el alta empieza en `null` y
   * pasa a existir en cuanto algo necesita persistirse —la primera
   * fotografía— sin que la pantalla se recargue ni se pierda lo escrito.
   * A partir de ahí, guardar es un PATCH y no un POST.
   */
  const [persisted, setPersisted] = useState<Vehicle | null>(vehicle ?? null);

  const [draft, setDraft] = useState<Draft>(
    vehicle ? draftFromVehicle(vehicle) : emptyDraft(),
  );
  const [equipmentText, setEquipmentText] = useState(() =>
    equipmentTextFromLines(vehicle?.equipment ?? []),
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
  const isMoto = draft.vehicleType === "moto";
  /** Cuántas líneas sobrevivirían al guardado, sin huecos de plantilla. */
  const equipmentLines = equipmentLinesFromText(equipmentText).length;
  const showIce = hasCombustionEngine(draft.fuelType);
  const showElectric = hasElectricDrive(draft.fuelType);
  const showBattery = hasTractionBattery(draft.fuelType);
  const showCharging = hasPlugCharging(draft.fuelType);
  const fullyElectric = isFullyElectric(draft.fuelType);

  /**
   * ¿Se perdería algo al salir de aquí?
   *
   * Se compara el payload que se guardaría contra el derivado de lo último
   * persistido, así que no cuenta como pendiente ni un decimal a medio
   * escribir ni una línea de plantilla vacía. Ajustar el encuadre de una
   * foto o reordenarlas tampoco: eso ya se guardó solo y no está en este
   * payload.
   */
  const dirty = draftIsDirty({ persisted, draft, equipmentText, reviewNote });

  useUnsavedChangesGuard(
    dirty,
    "Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?",
  );

  /**
   * El vehículo al que colgar una fotografía, creándolo si aún no existe.
   *
   * Se llama desde el gestor de imágenes y solo cuando de verdad hace falta
   * persistir. Abrir /nuevo y marcharse no crea nada.
   */
  async function ensureVehicle(): Promise<Vehicle | null> {
    if (persisted) return persisted;

    const result = await adminJson<{ vehicle: Vehicle }>(
      "/api/admin/vehicles/draft",
      "POST",
    );
    if (!result.ok) {
      setFormError(result.message);
      return null;
    }
    setPersisted(result.data.vehicle);
    return result.data.vehicle;
  }

  /**
   * Lo que el formulario comprueba antes de guardar: la FORMA de lo escrito,
   * nunca si está completo.
   *
   * Un borrador puede estar a medias a propósito —se puede empezar por las
   * fotos y escribir la ficha otro día—, así que exigir marca o precio aquí
   * sería volver a imponer el orden que este cambio quita. Lo que decide si
   * un vehículo puede llegar al público es `publicationBlockers()`, y eso se
   * comprueba al publicar, no al guardar.
   */
  function validate(): boolean {
    const next: Record<string, string> = {};
    // El precio puede faltar en un borrador, pero si está escrito no puede
    // ser negativo ni cero: eso no es "sin rellenar", es un error.
    if (draft.price !== null && draft.price <= 0) {
      next.price = "El precio debe ser mayor que cero.";
    }
    // 0 km es un valor legítimo —un importado nuevo, una unidad sin uso—,
    // así que solo se rechaza lo imposible.
    if (draft.mileage !== null && draft.mileage < 0) {
      next.mileage = "Kilometraje no válido.";
    }
    // La carrocería ya no se exige para guardar: un borrador puede no
    // tenerla todavía, igual que no tiene marca. Publicar sí la exige.
    if (draft.year !== null && (draft.year < 1900 || draft.year > MAX_YEAR)) {
      next.year = "Año no válido.";
    }

    for (const key of DECIMAL_KEYS) {
      const raw = draft[key];
      if (raw !== "" && decimalFromInput(raw) === null) next[key] = "No es un número.";
    }
    const accel = decimalFromInput(draft.accel0100);
    if (accel !== null && accel <= 0) next.accel0100 = "Debe ser mayor que cero.";

    // En carro la terminación de placa es el dígito del pico y placa; en
    // moto los formatos colombianos han cambiado con los años y no se le
    // impone forma.
    if (draft.plateEnding !== "") {
      if (!/^[A-Z0-9-]{1,8}$/i.test(draft.plateEnding)) {
        next.plateEnding = "Usa solo letras y números.";
      } else if (!isMoto && !/^[0-9]$/.test(draft.plateEnding)) {
        next.plateEnding = "En un carro es un solo dígito, de 0 a 9.";
      }
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
  async function save() {
    if (saving) return;
    if (!validate()) return;

    // Guardar una pantalla en la que nadie escribió nada crearía una fila
    // vacía por cada visita. No es una regla de orden —las fotos ya la
    // habrían creado— sino que todavía no hay nada que guardar.
    if (!persisted && !draftHasContent(draft, equipmentText)) {
      setFormError(
        "Escribe algo o sube una fotografía antes de guardar el borrador.",
      );
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = vehiclePayload(draft, equipmentText, reviewNote);

    // Si ya hay fila —porque se subió una foto primero, o porque estamos
    // editando— se actualiza. El alta desde cero es lo único que crea.
    const result = persisted
      ? await adminJson<{ vehicle: Vehicle }>(
          `/api/admin/vehicles/${persisted.id}`,
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

    // Se adopta lo que el servidor devolvió, no lo que había en pantalla.
    // El servidor recorta espacios y normaliza, así que sin esto el
    // formulario se quedaría marcado como pendiente justo después de
    // guardar, por una diferencia que ya no existe en la base.
    setPersisted(result.data.vehicle);
    setDraft(draftFromVehicle(result.data.vehicle));
    setEquipmentText(equipmentTextFromLines(result.data.vehicle.equipment));
    setReviewNote(result.data.vehicle.reviewNote);

    if (creating) {
      // El borrador ya tiene URL propia. Se sustituye la del alta en vez de
      // apilarla, para que "atrás" no devuelva a un formulario en blanco que
      // volvería a empezar de cero.
      router.replace(`/admin/vehiculos/${result.data.vehicle.id}/editar`);
      router.refresh();
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function togglePublication() {
    if (!persisted || saving) return;
    setSaving(true);
    setFormError(null);

    const result = await adminJson<{ vehicle: Vehicle }>(
      `/api/admin/vehicles/${persisted.id}/publish`,
      "POST",
      {
        publication:
          persisted.publication === "published" ? "draft" : "published",
      },
    );

    setSaving(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setPersisted(result.data.vehicle);
    router.refresh();
  }

  const title = creating ? "Crear vehículo" : "Editar vehículo";

  /**
   * Qué le falta a este vehículo para poder publicarse.
   *
   * Se calcula con la MISMA función que el servidor usa para rechazar la
   * publicación, así que no puede decir una cosa aquí y otra allá. Se lee
   * sobre lo guardado y no sobre lo que se está escribiendo: mientras no se
   * guarde, lo que el servidor ve es lo de antes.
   */
  /**
   * Qué le falta a este vehículo para poder publicarse.
   *
   * Se calcula sobre el BORRADOR, que es lo que el administrador tiene
   * delante, y no sobre la copia que el servidor devolvió la última vez.
   * Antes se preguntaba por esa copia, así que mientras alguien rellenaba la
   * ficha el panel seguía enumerando como ausente todo lo que acababa de
   * escribir, y no se despejaba hasta guardar.
   *
   * Lo único que el borrador no sabe son las fotografías, porque se suben
   * una a una contra el servidor: ésas sí salen de `persisted`.
   *
   * Es la MISMA función que usa el servidor para rechazar la publicación,
   * así que no puede prometer algo que luego se deniegue. Y sigue siendo el
   * servidor quien decide: esto solo elige qué enseñar.
   */
  const blockers = publicationBlockers(
    draftPublicationCandidate(draft, persisted?.images ?? []),
  );
  const published = persisted?.publication === "published";
  /** Lo guardado, que es sobre lo que el servidor va a decidir al publicar. */
  const savedBlockers = persisted ? publicationBlockers(persisted) : [];
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
          creating
            ? "Puedes empezar por donde quieras: subir las fotos primero o escribir la ficha. Se guarda como borrador y no se publica solo."
            : "Edita la información y administra las fotos del vehículo."
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
                {creating && !persisted ? "Nuevo vehículo" : vehicleLabel(draft)}
              </li>
            </ol>
          </nav>
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
            {persisted ? (
              <PublicationPill status={persisted.publication} />
            ) : null}
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
                inputMode="numeric"
                min={1900}
                max={MAX_YEAR}
                placeholder="2021"
                // Vacío es vacío: el año no se presupone al abrir la
                // pantalla, porque el carro no tiene por qué ser de este año.
                value={draft.year ?? ""}
                error={errors.year}
                onChange={(e) =>
                  set("year", e.target.value === "" ? null : Number(e.target.value))
                }
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
                  // Cambiar de universo invalida lo que pertenecía al
                  // anterior. Se limpia aquí y el servidor lo repite al
                  // guardar: la pantalla no puede quedar enseñando una
                  // tracción integral sobre una moto.
                  //
                  // Lo que NO se toca: marca, modelo, precio, kilometraje,
                  // descripción y fotografías son del vehículo, no de su
                  // universo.
                  setDraft((current) => {
                    // La MISMA función que usa el servidor al guardar: si
                    // cada cara decidiera por su cuenta, acabarían
                    // discrepando — y ya pasó una vez.
                    const kept = keepOnTypeChange(type, {
                      transmission: current.transmission || null,
                      engineLayout: current.engineLayout || null,
                      drivetrain: current.drivetrain || null,
                      finalDrive: current.finalDrive || null,
                      interiorColor: current.interiorColor,
                      tags: current.tags,
                      categoryId: current.categoryId || null,
                    });
                    return {
                      ...current,
                      vehicleType: type,
                      transmission: kept.transmission ?? "",
                      engineLayout: kept.engineLayout ?? "",
                      drivetrain: kept.drivetrain ?? "",
                      finalDrive: kept.finalDrive ?? "",
                      interiorColor: kept.interiorColor,
                      tags: kept.tags,
                      categoryId: kept.categoryId ?? "",
                    };
                  });
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
              {/* "Carrocería: ADV" no significa nada: en moto el mismo
                  campo se titula "Tipo de moto". */}
              <Select
                label={categoryLabel(draft.vehicleType)}
                value={draft.categoryId}
                error={errors.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                containerClassName="sm:col-span-2"
              >
                {/* Sin preselección: la primera de la lista no es la del
                    vehículo que se está cargando. */}
                <option value="">
                  {typeCategories.length === 0
                    ? `No hay opciones para ${isMoto ? "motos" : "carros"}`
                    : `Seleccionar ${categoryLabel(draft.vehicleType).toLowerCase()}`}
                </option>
                {typeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.active ? "" : " (retirada)"}
                  </option>
                ))}
              </Select>

              <Select
                label="Combustible"
                value={draft.fuelType}
                error={errors.fuelType}
                onChange={(e) => set("fuelType", e.target.value)}
              >
                <option value="">Seleccionar combustible</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              {/* Cada universo tiene su vocabulario: "Automática" dice poco
                  de una moto y "Manual secuencial" no significa nada en un
                  carro. El quickshifter NO está en esta lista: no es un tipo
                  de caja, es equipamiento. */}
              <Select
                label="Transmisión"
                value={draft.transmission}
                error={errors.transmission}
                onChange={(e) => set("transmission", e.target.value)}
              >
                <option value="">Seleccionar transmisión</option>
                {transmissionsFor(draft.vehicleType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <NumberField
                label="Marchas"
                max={MAX_GEAR_COUNT}
                value={draft.gearCount}
                error={errors.gearCount}
                onChange={(next) => set("gearCount", next)}
              />

              {/* FWD/RWD/AWD es un concepto de carro; cadena, correa y
                  cardán es lo que publica una ficha de moto. Nunca los dos. */}
              {usesDrivetrain(draft.vehicleType) ? (
                <Select
                  label="Tracción"
                  value={draft.drivetrain}
                  error={errors.drivetrain}
                  onChange={(e) => set("drivetrain", e.target.value)}
                >
                  <option value="">Seleccionar tracción</option>
                  {DRIVETRAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              ) : null}
              {usesFinalDrive(draft.vehicleType) ? (
                <Select
                  label="Transmisión final"
                  value={draft.finalDrive}
                  error={errors.finalDrive}
                  onChange={(e) => set("finalDrive", e.target.value)}
                >
                  <option value="">Seleccionar transmisión final</option>
                  {FINAL_DRIVES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              ) : null}

              <Input
                label="Ciudad"
                placeholder="Bogotá, CO"
                // Marcador de posición, no valor: el campo llega vacío y lo
                // que se guarde será lo que alguien escriba.
                value={draft.city}
                error={errors.city}
                onChange={(e) => set("city", e.target.value)}
              />
              <Input
                label="Color exterior"
                value={draft.exteriorColor}
                onChange={(e) => set("exteriorColor", e.target.value)}
              />
              {/* Una moto no tiene habitáculo que tapizar. */}
              {usesInteriorColor(draft.vehicleType) ? (
                <Input
                  label="Color interior"
                  value={draft.interiorColor}
                  onChange={(e) => set("interiorColor", e.target.value)}
                />
              ) : null}

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
                {tagsFor(draft.vehicleType).map((tag) => (
                  <Checkbox
                    key={tag}
                    label={tag}
                    checked={draft.tags.includes(tag)}
                    onChange={(event) =>
                      set(
                        "tags",
                        event.target.checked
                          ? tagsFor(draft.vehicleType).filter(
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
            defaultOpen={!creating}
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
                    {engineLayoutsFor(draft.vehicleType).map((layout) => (
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
                Un eléctrico no tiene cilindrada, cilindros ni alimentación,
                así que esos campos no se piden. Su motor se describe abajo,
                en el sistema eléctrico.
              </p>
            )}

            {/* Las prestaciones son SIEMPRE las del sistema completo: en un
                híbrido, la combinada; en un eléctrico, la total. El reparto
                entre térmico y eléctrico vive abajo, en su sección, y no se
                pide dos veces. */}
            <fieldset className={showIce ? "mt-8" : "mt-2"}>
              <legend className="eyebrow mb-4 text-ink-muted">
                {showElectric ? "Prestaciones del sistema" : "Prestaciones"}
              </legend>
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
                      Reparto del motor térmico
                    </legend>
                    {/* Solo lo que entrega ESTE motor. Su cilindrada, su
                        arquitectura y su denominación ya están arriba, en
                        la sección Motor: aquí no se vuelven a pedir. */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <NumberField
                        label="Potencia del motor térmico"
                        suffix="hp"
                        max={3_000}
                        value={draft.icePowerHp}
                        onChange={(next) => set("icePowerHp", next)}
                      />
                      <NumberField
                        label="Torque del motor térmico"
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
            description="Lo que decide si se puede usar mañana. Las fechas se escriben DD/MM/AAAA o se eligen en el calendario."
            defaultOpen={!creating}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Ciudad de matrícula"
                value={draft.registrationCity}
                onChange={(e) => set("registrationCity", e.target.value)}
              />
              {/* En carro es el dígito del pico y placa. En moto no se le
                  impone forma: los formatos colombianos han cambiado con los
                  años y "número + letra" dejaría fuera placas válidas. Aquí
                  no se deduce ningún pico y placa; es un dato que se muestra. */}
              <Input
                label={isMoto ? "Terminación de placa" : "Último dígito de la placa"}
                inputMode={isMoto ? "text" : "numeric"}
                maxLength={isMoto ? 8 : 1}
                placeholder={isMoto ? "12F" : "0–9"}
                value={draft.plateEnding}
                error={errors.plateEnding}
                onChange={(e) =>
                  set(
                    "plateEnding",
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9-]/g, "")
                      .slice(0, isMoto ? 8 : 1),
                  )
                }
              />

              <TriState
                label="SOAT vigente"
                value={draft.soatValid}
                onChange={(value) => set("soatValid", value)}
              />
              <DateField
                label="Vence el SOAT"
                value={draft.soatExpiresOn || null}
                error={errors.soatExpiresOn}
                onChange={(value) => set("soatExpiresOn", value ?? "")}
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
                <DateField
                  label="Vence la técnico-mecánica"
                  value={draft.techInspectionExpiresOn || null}
                  error={errors.techInspectionExpiresOn}
                  onChange={(value) =>
                    set("techInspectionExpiresOn", value ?? "")
                  }
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

              <DateField
                label="Documentación verificada el"
                value={draft.documentationCheckedOn || null}
                error={errors.documentationCheckedOn}
                onChange={(value) => set("documentationCheckedOn", value ?? "")}
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

          {/* E. Equipamiento -------------------------------------------
              Texto, no un catálogo de casillas. Buscar una opción entre
              ochenta checkboxes salía más lento que escribirla, y el
              catálogo no podía nombrar una Skyhook ni unas Brembo Stylema:
              para motos no servía casi de nada. */}
          <FormSection
            title="Equipamiento"
            description="Una línea por elemento. Una línea entre corchetes —[Frenos]— abre una sección."
            badge={
              equipmentLines > 0 ? `${equipmentLines} líneas` : undefined
            }
            defaultOpen={!creating}
          >
            <Textarea
              label="Equipamiento"
              rows={16}
              value={equipmentText}
              className="font-mono text-[0.8125rem]"
              onChange={(e) => {
                setEquipmentText(e.target.value);
                setSaved(false);
              }}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {/* La plantilla depende del universo, y es un punto de
                  partida: lo que se deje sin rellenar no se guarda, así que
                  cargarla y no tocar nada no inventa equipamiento. */}
              <button
                type="button"
                onClick={() => {
                  const template = equipmentTemplate(draft.vehicleType);
                  setEquipmentText((current) =>
                    current.trim() === ""
                      ? template
                      : `${current.trimEnd()}\n\n${template}`,
                  );
                  setSaved(false);
                }}
                className="label-caps text-[10px] text-burgundy underline underline-offset-4"
              >
                Cargar plantilla de {isMoto ? "moto" : "carro"}
              </button>
              <p className="text-right text-xs text-ink-muted">
                Las líneas sin rellenar —«ABS:» a secas— no se guardan.
              </p>
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

        {/* H. Fotografías ----------------------------------------------
            Activas desde el primer segundo, sin haber escrito nada. El
            gestor pide por `ensureVehicle()` la fila que necesita para
            colgar los archivos, y es el mismo componente que en edición. */}
        <div className="grid gap-6 self-start">
          <FormSection
            title="Fotos del vehículo"
            collapsible={false}
            description={
              creating && !persisted
                ? "Puedes empezar por aquí: sube las fotos ahora y rellena la ficha después."
                : undefined
            }
          >
            <ImageManager
              vehicle={persisted}
              ensureVehicle={ensureVehicle}
              onVehicleChange={setPersisted}
            />
          </FormSection>

          {/* Qué falta para publicar, leído sobre lo que hay en pantalla.
              Cuando ya no falta nada el bloque no desaparece: decirlo es
              más útil que dejar un hueco donde antes había una lista. */}
          {persisted && !published ? (
            <div className="border border-stone bg-paper px-5 py-5 sm:px-7">
              {blockers.length > 0 ? (
                <>
                  <h2 className="eyebrow text-ink-muted">Falta para publicar</h2>
                  <ul className="mt-3 grid gap-1.5">
                    {blockers.map((blocker) => (
                      <li
                        key={blocker}
                        className="font-serif text-[0.9375rem] leading-snug text-ink-soft"
                      >
                        {blocker}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-ink-muted">
                    Mientras tanto se guarda como borrador y no se ve en el
                    sitio.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="eyebrow text-burgundy">Listo para publicar</h2>
                  <p className="mt-3 font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
                    {savedBlockers.length > 0 || dirty
                      ? "Guarda los cambios y el botón de publicar se activa."
                      : "Ya cumple todo lo que se le exige a una ficha pública."}
                  </p>
                </>
              )}
            </div>
          ) : null}
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
          {published && persisted ? (
            <a
              href={`/vehiculos/${persisted.slug}`}
              target="_blank"
              rel="noreferrer noopener"
              className="label-caps inline-flex h-13 items-center justify-center gap-2.5 rounded-xs border border-stone px-8 text-ink transition-colors hover:border-ink/40"
            >
              Ver ficha pública
              <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
            </a>
          ) : null}

          {persisted ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              // El botón mira lo GUARDADO, no lo que hay en pantalla: el
              // servidor va a decidir sobre la fila, no sobre el formulario,
              // y ofrecer publicar cambios sin guardar sería prometer un
              // 409. El panel de arriba sí mira la pantalla, y por eso dice
              // "guarda los cambios" cuando solo falta eso.
              // Con cambios sin guardar no se cambia de estado, en ninguna
              // de las dos direcciones. El servidor decide sobre la fila, no
              // sobre la pantalla: publicar aquí publicaría una versión que
              // quien administra ya no tiene delante.
              disabled={
                saving || dirty || (!published && savedBlockers.length > 0)
              }
              title={
                dirty
                  ? "Guarda los cambios antes de publicar."
                  : !published && savedBlockers.length > 0
                    ? `Falta: ${savedBlockers.join(" ")}`
                    : undefined
              }
              onClick={() => void togglePublication()}
            >
              {published ? "Despublicar" : "Publicar"}
            </Button>
          ) : null}

          {/* Discreto y en el sitio donde se decide: junto a Guardar y
              Publicar, que es lo que hay que hacer con ello. */}
          {dirty && !saving ? (
            <span className="label-caps rounded-xs border border-burgundy/30 bg-burgundy/5 px-3 py-2 text-[10px] text-burgundy">
              Cambios sin guardar
            </span>
          ) : null}

          <Button type="submit" size="lg" disabled={saving}>
            {saving ? (
              "Guardando…"
            ) : !creating || persisted ? (
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
