"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Upload } from "lucide-react";
import { adminJson } from "@/lib/admin-client";
import { vehicleAfterAbortedUpload } from "@/lib/vehicle-draft";
import { createSupabaseBrowserClient } from "@/server/auth/supabase-browser";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { cn } from "@/lib/cn";
import type { Vehicle, VehicleImage } from "@/types/vehicle";

const MAX_IMAGES = 20;
/** El mismo tope que impone el bucket en Supabase. */
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Galería real: sube a Supabase Storage y guarda la fila correspondiente.
 *
 * A diferencia del maquetado anterior, aquí nada vive solo en el navegador.
 * Cada acción llama a su endpoint y usa el vehículo que la respuesta
 * devuelve, así que lo que se ve es lo que está guardado. El orden es el de
 * la galería pública y la primera imagen es la portada.
 *
 * Las imágenes marcadas como heredadas viven en /public desde antes de que
 * existiera la base: se pueden quitar de la ficha, pero el archivo no se
 * borra del repositorio desde aquí.
 *
 * Funciona igual en alta y en edición, y es el mismo componente en las dos.
 * La diferencia es que en el alta puede que todavía no exista la fila: las
 * imágenes cuelgan de un vehículo —la ruta en Storage es `vehicles/<id>`—
 * así que la primera subida pide por `ensureVehicle()` que se cree el
 * borrador. Nadie tiene que rellenar nada antes de empezar por las fotos.
 */
export function ImageManager({
  vehicle,
  ensureVehicle,
  onVehicleChange,
}: {
  /** `null` en el alta, mientras no exista todavía la fila. */
  vehicle: Vehicle | null;
  /**
   * Devuelve el vehículo al que colgar las imágenes, creándolo si hace
   * falta. `null` si no se pudo, con el motivo ya mostrado por quien llama.
   */
  ensureVehicle: () => Promise<Vehicle | null>;
  /**
   * El vehículo tal como quedó tras la última operación.
   *
   * `null` significa que ya no hay fila: pasa cuando una subida falla y el
   * borrador que se había creado para alojarla se descarta. El formulario
   * NO puede seguir apuntando a un vehículo que acaba de dejar de existir.
   */
  onVehicleChange: (vehicle: Vehicle | null) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * En qué va el lote, para que uno grande no parezca colgado.
   *
   * `uploading` es el ÍNDICE del archivo en curso, de 1 a total. Antes se
   * guardaba cuántos iban hechos y se pintaba `done + 1`, así que al
   * terminar el último se leía "Subiendo 5 de 4". `registering` es el tramo
   * final, cuando el servidor ya está comprobando los bytes.
   */
  const [progress, setProgress] = useState<
    { uploading: number; total: number } | { registering: true } | null
  >(null);

  const images =
    vehicle?.images.filter((image) => image.id !== "placeholder") ?? [];

  /**
   * Toda operación sigue el mismo camino: una sola a la vez, y la pantalla
   * se actualiza con el vehículo que responde el servidor.
   *
   * El cerrojo `busy` es también el control de concurrencia: soltar ocho
   * archivos es UNA petición, y un segundo arrastre mientras la primera
   * sigue en vuelo se descarta en vez de pelearse por las posiciones.
   */
  async function run(
    call: () => Promise<
      { ok: true; data: { vehicle: Vehicle } } | { ok: false; message: string }
    >,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await call();
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onVehicleChange(result.data.vehicle);
    // La pantalla de edición lee el vehículo del servidor: sin esto, volver
    // atrás o recargar enseñaría la galería de antes.
    router.refresh();
  }

  /**
   * Subir, en una petición POR ARCHIVO y directo a Supabase Storage.
   *
   * Antes el lote entero iba en un solo multipart contra la API de Next:
   * hasta doce archivos de 10 MB en un único cuerpo, atravesando una
   * función serverless que corta mucho antes. Como ahora se piden
   * originales de alta resolución a propósito, eso dejaba de ser teórico.
   *
   * El camino es: el servidor reserva las rutas (y de paso autoriza y
   * cuenta), el navegador escribe cada archivo con su propia sesión —las
   * políticas del bucket exigen Superadmin, así que esto no abre nada— y
   * al final la API registra las filas comprobando los bytes que de verdad
   * llegaron.
   *
   * Nada se recomprime ni se redimensiona por el camino: lo que se sube es
   * el archivo original tal cual.
   */
  async function upload(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;

    const chosen: File[] = [];
    let rejected = false;
    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) {
        rejected = true;
        continue;
      }
      if (images.length + chosen.length >= MAX_IMAGES) break;
      chosen.push(file);
    }

    if (rejected) {
      setError("Solo JPG, JPEG, PNG, WebP o AVIF de máximo 10 MB.");
    }
    if (chosen.length === 0) return;

    setBusy(true);
    setError(null);

    // En el alta la fila puede no existir todavía. Se crea aquí y no al
    // abrir la pantalla: abrir /nuevo y marcharse no debe dejar rastro.
    let target = vehicle;
    const createdDraft = target === null;
    if (!target) {
      target = await ensureVehicle();
      if (!target) {
        setBusy(false);
        setError("No se pudo preparar el vehículo para las fotos.");
        return;
      }
    }
    const vehicleId = target.id;

    /**
     * Salir por error dejando el estado coherente.
     *
     * Si el borrador se creó SOLO para esta subida, se descarta. Y entonces
     * el formulario tiene que quedarse sin vehículo: seguir apuntando a una
     * fila recién borrada dejaba la pantalla en un estado imposible —el
     * siguiente intento subiría contra un id que ya no existe—.
     *
     * Si el descarte falla, no se afirma que se borró: el borrador sigue
     * ahí y el estado lo sigue reflejando.
     */
    const abort = async (message: string) => {
      if (createdDraft && target) {
        const discarded = await adminJson(
          `/api/admin/vehicles/draft?id=${vehicleId}`,
          "DELETE",
        );
        onVehicleChange(
          vehicleAfterAbortedUpload({
            createdDraft,
            draftDiscarded: discarded.ok,
            vehicle: target,
          }),
        );
      }
      setBusy(false);
      setProgress(null);
      setError(message);
    };

    const reserved = await adminJson<{
      bucket: string;
      uploads: {
        reservationId: string;
        storagePath: string;
        contentType: string;
      }[];
    }>(`/api/admin/vehicles/${vehicleId}/images/reserve`, "POST", {
      contentTypes: chosen.map((file) => file.type),
    });
    if (!reserved.ok) return abort(reserved.message);

    const batch = reserved.data.uploads;

    /**
     * Devolver el lote entero al servidor para que lo retire.
     *
     * La limpieza la hace SIEMPRE el servidor, nunca este componente: él es
     * quien sabe qué reservas son de este vehículo, y borrar desde aquí por
     * ruta era justo lo que permitía tocar el objeto pendiente de otro.
     * Además deja una sola autoridad, sin dos limpiezas pisándose.
     */
    const cancelBatch = () =>
      adminJson(`/api/admin/vehicles/${vehicleId}/images/reserve`, "DELETE", {
        reservationIds: batch.map((slot) => slot.reservationId),
      });

    const supabase = createSupabaseBrowserClient();

    for (const [index, file] of chosen.entries()) {
      setProgress({ uploading: index + 1, total: chosen.length });
      const slot = batch[index];
      const { error: uploadError } = await supabase.storage
        .from(reserved.data.bucket)
        .upload(slot.storagePath, file, {
          contentType: slot.contentType,
          // La ruta lleva un UUID recién generado: no puede existir ya, y
          // sobrescribir solo escondería un error.
          upsert: false,
        });

      if (uploadError) {
        // El cierre no va a ocurrir, así que el servidor no se enteraría:
        // se le pide que retire el lote —objetos y plazas— antes de salir.
        await cancelBatch();
        return abort(`No se pudo subir «${file.name}». ${uploadError.message}`);
      }
    }

    // Solo ahora la API mira los bytes que de verdad llegaron y crea las
    // filas, todas o ninguna. Si rechaza algo, ella misma retira la tanda:
    // aquí NO se vuelve a cancelar, o sería una segunda limpieza sobre algo
    // que ya no existe.
    setProgress({ registering: true });
    const registered = await adminJson<{ vehicle: Vehicle }>(
      `/api/admin/vehicles/${vehicleId}/images`,
      "POST",
      { reservationIds: batch.map((slot) => slot.reservationId) },
    );

    if (!registered.ok) return abort(registered.message);

    setBusy(false);
    setProgress(null);
    onVehicleChange(registered.data.vehicle);
    router.refresh();
  }

  /** Reordenar manda el orden entero: el servidor no adivina posiciones. */
  function reorder(next: VehicleImage[]) {
    if (!vehicle) return;
    return run(() =>
      adminJson<{ vehicle: Vehicle }>(
        `/api/admin/vehicles/${vehicle.id}/images`,
        "PATCH",
        {
          images: next.map((image, index) => ({
            id: image.id,
            position: index,
          })),
        },
      ),
    );
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    void reorder(next);
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    void reorder([picked, ...next]);
  }

  function remove(image: VehicleImage) {
    if (!vehicle) return;
    void run(() =>
      adminJson<{ vehicle: Vehicle }>(
        `/api/admin/vehicles/${vehicle.id}/images/${image.id}`,
        "DELETE",
      ),
    );
  }

  return (
    <div className={cn(busy && "opacity-60")} aria-busy={busy}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-xs border border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-burgundy bg-burgundy/5"
            : "border-stone-strong bg-sand/40",
        )}
      >
        <Upload
          aria-hidden
          strokeWidth={1.2}
          className="mx-auto size-7 text-burgundy"
        />
        <p className="mt-4 font-serif text-[0.9375rem] text-ink">
          {progress === null
            ? busy
              ? "Subiendo…"
              : "Arrastra y suelta tus imágenes aquí"
            : "registering" in progress
              ? "Procesando imágenes…"
              : `Subiendo ${progress.uploading} de ${progress.total}…`}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 font-serif text-[0.9375rem] text-burgundy underline underline-offset-4 disabled:opacity-50"
        >
          o haz clic para seleccionar archivos
        </button>
        <p className="mt-3 text-xs text-ink-muted">
          JPG, JPEG, PNG, WebP o AVIF. Máx. 10 MB por imagen. Otros formatos,
          incluido HEIC, no se admiten todavía.
        </p>
        {/* El archivo se guarda sin recomprimir, así que lo que se sube es
            exactamente lo que se verá: una foto pequeña no se puede
            arreglar después. */}
        <p className="mt-1 text-xs text-ink-muted">
          Sube el original: mínimo 1.000 × 700 px, idealmente 2.000 o más en
          el lado largo. No se recomprime ni se reduce.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-burgundy">
          {error}
        </p>
      ) : null}

      {images.length > 0 ? (
        <>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id} className="group relative">
                <span className="relative block aspect-[4/3] overflow-hidden bg-sand">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 640px) 20vw, 45vw"
                    className="object-cover"
                  />
                  {index === 0 ? (
                    <span className="label-caps absolute top-0 left-0 bg-burgundy px-2 py-1 text-[9px] text-cream">
                      Portada
                    </span>
                  ) : null}
                  {image.source === "legacy" ? (
                    <span className="label-caps absolute right-0 bottom-0 bg-ink/80 px-2 py-1 text-[9px] text-cream">
                      Heredada
                    </span>
                  ) : null}
                </span>

                <div className="mt-2 flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={busy || index === 0}
                      aria-label="Mover antes"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-35"
                    >
                      <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={busy || index === images.length - 1}
                      aria-label="Mover después"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-35"
                    >
                      <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => makeCover(index)}
                      disabled={busy || index === 0}
                      aria-label="Marcar como portada"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/50 hover:text-burgundy disabled:opacity-35"
                    >
                      <Check aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <ConfirmButton
                      question="¿Eliminar esta imagen definitivamente? Esta acción no se puede deshacer."
                      onConfirm={() => remove(image)}
                      disabled={busy}
                      ariaLabel="Eliminar imagen"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/50 hover:text-burgundy disabled:opacity-35"
                    >
                      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </ConfirmButton>
                  </div>
                </div>
              </li>
            ))}

            {images.length < MAX_IMAGES ? (
              <li>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-stone-strong text-ink-muted transition-colors hover:border-burgundy hover:text-burgundy disabled:opacity-50"
                >
                  <Plus aria-hidden className="size-5" strokeWidth={1.4} />
                  <span className="font-serif text-xs">Agregar más fotos</span>
                </button>
              </li>
            ) : null}
          </ul>

          <p className="mt-4 text-xs text-ink-muted tabular">
            {images.length} de {MAX_IMAGES} imágenes
          </p>

          {/* Las fotos subidas antes de que existiera el mínimo de
              resolución pueden ser demasiado pequeñas. No se tocan ni se
              borran solas, y aquí no se descargan para medirlas: hacerlo en
              cada render traería megas por nada. Se avisa y decide quien
              administra. */}
          <p className="mt-2 text-xs text-ink-muted">
            Si alguna foto antigua se ve borrosa en la ficha, su archivo era
            pequeño de origen: no se puede mejorar desde aquí, hay que
            sustituirla por el original.
          </p>
        </>
      ) : (
        <p className="mt-4 text-xs text-ink-muted">
          Un vehículo necesita al menos una fotografía para poder publicarse.
          Puedes subirlas ahora y rellenar la ficha después.
        </p>
      )}
    </div>
  );
}
