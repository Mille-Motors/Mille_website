"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Upload } from "lucide-react";
import { adminJson, adminRequest } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import type { Vehicle, VehicleImage } from "@/types/vehicle";

const MAX_IMAGES = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Galería real: sube a Supabase Storage y guarda la fila correspondiente.
 *
 * A diferencia del maquetado anterior, aquí nada vive solo en el navegador.
 * Cada acción llama a su endpoint y refresca desde el servidor, así que lo
 * que se ve es lo que está guardado. El orden es el de la galería pública y
 * la primera imagen es la portada.
 *
 * Las imágenes marcadas como heredadas viven en /public desde antes de que
 * existiera la base: se pueden quitar de la ficha, pero el archivo no se
 * borra del repositorio desde aquí.
 */
export function ImageManager({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const images = vehicle.images.filter((image) => image.id !== "placeholder");

  async function run(call: () => Promise<{ ok: boolean; message?: string }>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await call();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "No se pudo completar.");
      return;
    }
    router.refresh();
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

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
      setError("Solo JPG, PNG, WebP o AVIF de máximo 10 MB.");
    }
    if (chosen.length === 0) return;

    const form = new FormData();
    for (const file of chosen) form.append("files", file);

    await run(() =>
      adminRequest(`/api/admin/vehicles/${vehicle.id}/images`, {
        method: "POST",
        body: form,
      }),
    );
  }

  /** Reordenar manda el orden entero: el servidor no adivina posiciones. */
  function reorder(next: VehicleImage[]) {
    return run(() =>
      adminJson(`/api/admin/vehicles/${vehicle.id}/images`, "PATCH", {
        images: next.map((image, index) => ({ id: image.id, position: index })),
      }),
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
    void run(() =>
      adminJson(
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
          {busy ? "Subiendo…" : "Arrastra y suelta tus imágenes aquí"}
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
          JPG, PNG, WebP o AVIF. Máx. 10 MB por imagen.
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
                    <button
                      type="button"
                      onClick={() => remove(image)}
                      disabled={busy}
                      aria-label="Eliminar imagen"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/50 hover:text-burgundy disabled:opacity-35"
                    >
                      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
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
        </>
      ) : (
        <p className="mt-4 text-xs text-ink-muted">
          Un vehículo necesita al menos una fotografía para poder publicarse.
        </p>
      )}
    </div>
  );
}
