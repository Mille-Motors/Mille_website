"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Crop,
  GripVertical,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { adminJson } from "@/lib/admin-client";
import { vehicleAfterAbortedUpload } from "@/lib/vehicle-draft";
import { createSupabaseBrowserClient } from "@/server/auth/supabase-browser";
import { VehicleImageFramer } from "@/components/admin/VehicleImageFramer";
import { objectPosition } from "@/lib/focal-point";
import { moveItem, reconcileOrder, sameOrder } from "@/lib/image-order";
import { VEHICLE_FRAME_CLASS } from "@/lib/vehicle-frame";
import { cn } from "@/lib/cn";
import {
  MAX_VEHICLE_IMAGE_BYTES,
  MAX_VEHICLE_IMAGE_LABEL,
} from "@/lib/image-dimensions";
import type { Vehicle, VehicleImage } from "@/types/vehicle";

const MAX_IMAGES = 20;
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
  /** La fotografía cuyo encuadre se está ajustando, por id. */
  const [adjusting, setAdjusting] = useState<string | null>(null);
  /** La foto que está pidiendo confirmación para borrarse. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  /**
   * El orden que se enseña mientras el servidor todavía no ha confirmado el
   * cambio. `null` es «el que está guardado».
   */
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  /** Una foto en el aire: cuál es, y cómo quedaría la fila si se soltara ahí. */
  const [drag, setDrag] = useState<{ id: string; preview: string[] } | null>(null);
  const reorderBusy = useRef(false);
  const queuedOrder = useRef<string[] | null>(null);
  const [, setReordering] = useState(false);
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
  // Se busca por id y no se guarda el objeto: tras guardar llega un vehículo
  // nuevo y una copia antigua dejaría el editor enseñando el encuadre de
  // antes. Si la foto desaparece —se borró desde otra pestaña— el editor se
  // cierra solo en vez de quedarse apuntando a nada.
  const adjustingImage = images.find((image) => image.id === adjusting) ?? null;

  const order = reconcileOrder(
    localOrder,
    images.map((image) => image.id),
  );
  const byId = new Map(images.map((image) => [image.id, image]));
  /** Lo que se pinta: la fila como quedaría si se soltara la foto que se arrastra. */
  const shown = (drag ? drag.preview : order).flatMap((id) => {
    const image = byId.get(id);
    return image ? [image] : [];
  });
  /** Subir y borrar son de una en una; reordenar no se bloquea nunca. */
  const locked = busy;
  const canDrag = !busy && images.length > 1;
  const iconButton =
    "inline-flex size-7 items-center justify-center rounded-md bg-cream/92 text-ink shadow-sm transition-colors hover:bg-cream disabled:opacity-40";

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
   * hasta doce archivos pesados en un único cuerpo, atravesando una
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
      if (!ACCEPTED.includes(file.type) || file.size > MAX_VEHICLE_IMAGE_BYTES) {
        rejected = true;
        continue;
      }
      if (images.length + chosen.length >= MAX_IMAGES) break;
      chosen.push(file);
    }

    if (rejected) {
      setError(
        `Solo JPG, JPEG, PNG, WebP o AVIF de máximo ${MAX_VEHICLE_IMAGE_LABEL}.`,
      );
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

  /**
   * Reordenar es instantáneo: la fila cambia al soltar y la petición viaja
   * detrás.
   *
   * Antes cada movimiento esperaba al servidor, bloqueaba la pantalla y
   * volvía a pintarla, y solo se podía mover una foto una posición por vez:
   * llevar la última a la segunda eran doce clics de doce idas y vueltas.
   *
   * El servidor recibe siempre el orden ENTERO, así que lo único que importa
   * es que la última petición que sale sea la última que se pidió. Si llega
   * otro movimiento mientras una petición viaja, no se manda otra a la vez:
   * se guarda como pendiente y sale en cuanto vuelve la primera. Si el
   * servidor rechaza, la fila vuelve a lo que de verdad está guardado.
   */
  async function commitOrder(next: string[]) {
    if (!vehicle) return;
    if (sameOrder(next, order)) return;
    setLocalOrder(next);
    if (reorderBusy.current) {
      queuedOrder.current = next;
      return;
    }

    reorderBusy.current = true;
    setReordering(true);
    setError(null);
    let current: string[] | null = next;
    while (current) {
      queuedOrder.current = null;
      const result = await adminJson<{ vehicle: Vehicle }>(
        `/api/admin/vehicles/${vehicle.id}/images`,
        "PATCH",
        { images: current.map((id, position) => ({ id, position })) },
      );
      if (!result.ok) {
        setError(result.message);
        queuedOrder.current = null;
        break;
      }
      onVehicleChange(result.data.vehicle);
      current = queuedOrder.current;
    }
    reorderBusy.current = false;
    setReordering(false);
    // Sin nada pendiente, el orden que manda es el del servidor.
    if (!queuedOrder.current) setLocalOrder(null);
    router.refresh();
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    void commitOrder(moveItem(order, index, target));
  }

  function makeCover(index: number) {
    if (index === 0) return;
    void commitOrder(moveItem(order, index, 0));
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
          JPG, JPEG, PNG, WebP o AVIF. Máx. {MAX_VEHICLE_IMAGE_LABEL} por
          imagen. Otros formatos, incluido HEIC, no se admiten todavía.
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
          {images.length > 1 ? (
            <p className="mt-5 text-xs text-ink-muted">
              Arrastra una foto para cambiar su orden. La primera es la portada.
            </p>
          ) : null}
          <ul
            // Soltar en un hueco entre dos fotos cuenta igual que soltar sobre
            // una: la fila ya enseña cómo quedaría.
            onDragOver={(event) => {
              if (!drag) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              if (!drag) return;
              event.preventDefault();
              const final = drag.preview;
              setDrag(null);
              void commitOrder(final);
            }}
            className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {shown.map((image, index) => (
              <li
                key={image.id}
                draggable={canDrag}
                onDragStart={(event) => {
                  if (!canDrag) return;
                  event.dataTransfer.effectAllowed = "move";
                  // Firefox no inicia el arrastre sin un dato.
                  event.dataTransfer.setData("text/plain", image.id);
                  setDrag({ id: image.id, preview: order });
                }}
                // Al pasar sobre otra foto, la levantada se coloca ahí: la fila
                // se reordena mientras se arrastra y se ve cómo va a quedar.
                onDragEnter={(event) => {
                  if (!drag) return;
                  event.preventDefault();
                  const from = drag.preview.indexOf(drag.id);
                  const to = drag.preview.indexOf(image.id);
                  if (from !== to && to >= 0) {
                    setDrag({ ...drag, preview: moveItem(drag.preview, from, to) });
                  }
                }}
                onDragEnd={() => setDrag(null)}
                className={cn(
                  "group relative select-none",
                  canDrag && "cursor-grab active:cursor-grabbing",
                  drag?.id === image.id && "opacity-40",
                )}
              >
                {/* Todo lo que se puede hacer con una foto vive DENTRO de su
                    marco: nada sale de la celda ni pisa a la vecina. Los
                    controles aparecen al pasar el cursor o al enfocar, y en
                    pantallas táctiles están siempre. */}
                <span
                  className={cn(
                    "relative block overflow-hidden rounded-md bg-sand",
                    VEHICLE_FRAME_CLASS,
                  )}
                >
                  {/* La miniatura enseña el MISMO encuadre que la ficha: si
                      aquí se viera centrada y allí desplazada, ajustar una
                      foto parecería no hacer nada. `draggable={false}`: lo que
                      se arrastra es la foto entera, no la imagen suelta. */}
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    draggable={false}
                    sizes="(min-width: 1024px) 16vw, (min-width: 640px) 20vw, 45vw"
                    className="object-cover"
                    style={{ objectPosition: objectPosition(image.focal) }}
                  />

                  <span className="pointer-events-none absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span
                      className={cn(
                        "label-caps rounded-md px-2 py-1 text-[9px] tabular",
                        index === 0 ? "bg-burgundy text-cream" : "bg-ink/65 text-cream",
                      )}
                    >
                      {index === 0 ? "Portada" : index + 1}
                    </span>
                    {image.source === "legacy" ? (
                      <span className="label-caps rounded-md bg-ink/65 px-2 py-1 text-[9px] text-cream">
                        Heredada
                      </span>
                    ) : null}
                  </span>

                  {canDrag ? (
                    <span
                      aria-hidden
                      title="Arrastra para cambiar el orden"
                      className="pointer-events-none absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-md bg-ink/55 text-cream"
                    >
                      <GripVertical className="size-4" strokeWidth={1.5} />
                    </span>
                  ) : null}

                  {/* Mover antes y después: dos flechas en los bordes, a media
                      altura, como las de una galería. Libera la barra de abajo
                      para lo que se hace con la foto, que así cabe en una sola
                      fila incluso en una celda estrecha. */}
                  <span className="pointer-events-none absolute inset-x-1 top-1/2 flex -translate-y-1/2 items-center justify-between opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={locked || index === 0}
                      aria-label={`Mover la fotografía ${index + 1} antes`}
                      title="Mover antes"
                      className={cn(iconButton, "pointer-events-auto rounded-full", index === 0 && "invisible")}
                    >
                      <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={locked || index === shown.length - 1}
                      aria-label={`Mover la fotografía ${index + 1} después`}
                      title="Mover después"
                      className={cn(
                        iconButton,
                        "pointer-events-auto rounded-full",
                        index === shown.length - 1 && "invisible",
                      )}
                    >
                      <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.6} />
                    </button>
                  </span>

                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-linear-to-t from-ink/70 to-transparent p-1.5 pt-5 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    <button
                      type="button"
                      onClick={() => setAdjusting(image.id)}
                      disabled={locked}
                      aria-label={`Ajustar encuadre de la fotografía ${index + 1}`}
                      title="Ajustar encuadre"
                      className={cn(iconButton, "pointer-events-auto")}
                    >
                      <Crop aria-hidden className="size-3.5" strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => makeCover(index)}
                      disabled={locked || index === 0}
                      aria-label={`Usar la fotografía ${index + 1} como portada`}
                      title="Usar como portada"
                      className={cn(iconButton, "pointer-events-auto")}
                    >
                      <Star aria-hidden className="size-3.5" strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(image.id)}
                      disabled={locked}
                      aria-label={`Eliminar la fotografía ${index + 1}`}
                      title="Eliminar"
                      className={cn(iconButton, "pointer-events-auto hover:text-burgundy")}
                    >
                      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.6} />
                    </button>
                  </span>

                  {/* La confirmación de borrar ocupa el marco entero: una
                      pregunta en línea no cabía en la celda y se montaba sobre
                      las fotos de al lado. */}
                  {confirmingId === image.id ? (
                    <span className="absolute inset-0 z-10 grid place-content-center justify-items-center gap-2.5 bg-ink/88 p-3 text-center text-cream">
                      <span className="text-sm leading-snug">
                        ¿Eliminar esta foto? No se puede deshacer.
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            setConfirmingId(null);
                            remove(image);
                          }}
                          className="press inline-flex h-8 items-center rounded-md bg-burgundy px-3 text-sm font-medium text-cream hover:bg-burgundy-dark disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="press inline-flex h-8 items-center rounded-md bg-cream/90 px-3 text-sm font-medium text-ink hover:bg-cream"
                        >
                          Cancelar
                        </button>
                      </span>
                    </span>
                  ) : null}
                </span>
              </li>
            ))}

            {images.length < MAX_IMAGES ? (
              <li>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-stone-strong text-ink-muted transition-colors hover:border-burgundy hover:text-burgundy disabled:opacity-50"
                >
                  <Plus aria-hidden className="size-5" strokeWidth={1.4} />
                  <span className="font-serif text-xs">Agregar más fotos</span>
                </button>
              </li>
            ) : null}
          </ul>

          {/* `vehicle` no puede ser null si hay imágenes, pero el tipo no
              lo sabe y afirmarlo con `!` sería pedirle que se calle. */}
          {adjustingImage && vehicle ? (
            <VehicleImageFramer
              key={adjustingImage.id}
              vehicleId={vehicle.id}
              image={adjustingImage}
              index={images.findIndex((item) => item.id === adjustingImage.id)}
              onSaved={(updated) => {
                onVehicleChange(updated);
                router.refresh();
              }}
              onClose={() => setAdjusting(null)}
            />
          ) : null}

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
