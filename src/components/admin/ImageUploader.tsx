"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VehicleImage } from "@/types/vehicle";

const MAX_IMAGES = 20;
const MAX_BYTES = 10 * 1024 * 1024;

interface Item extends VehicleImage {
  /** Present only for files picked in this session, so we can revoke them. */
  objectUrl?: string;
}

/**
 * Preview-only uploader. Files never leave the browser: each pick becomes an
 * object URL so the gallery, reordering and cover selection can be designed
 * before storage exists.
 */
export function ImageUploader({
  value,
  onChange,
  altPrefix,
}: {
  value: VehicleImage[];
  onChange: (images: VehicleImage[]) => void;
  altPrefix: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createdUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = createdUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const accepted: Item[] = [];
      let rejected = false;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          rejected = true;
          continue;
        }
        if (file.size > MAX_BYTES) {
          rejected = true;
          continue;
        }
        if (value.length + accepted.length >= MAX_IMAGES) break;
        const objectUrl = URL.createObjectURL(file);
        createdUrls.current.push(objectUrl);
        accepted.push({
          src: objectUrl,
          alt: `${altPrefix}, ${file.name}`,
          objectUrl,
        });
      }

      setError(
        rejected ? "Solo imágenes JPG o PNG de máximo 10 MB." : null,
      );
      if (accepted.length > 0) onChange([...value, ...accepted]);
    },
    [altPrefix, onChange, value],
  );

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xs border border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-burgundy bg-burgundy/5" : "border-stone-strong bg-sand/40",
        )}
      >
        <Upload
          aria-hidden
          strokeWidth={1.2}
          className="mx-auto size-7 text-burgundy"
        />
        <p className="mt-4 font-serif text-[0.9375rem] text-ink">
          Arrastra y suelta tus imágenes aquí
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 font-serif text-[0.9375rem] text-burgundy underline underline-offset-4"
        >
          o haz clic para seleccionar archivos
        </button>
        <p className="mt-3 text-xs text-ink-muted">
          JPG, PNG. Máx. 10 MB por imagen.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <p className="mt-3 text-xs text-burgundy">{error}</p> : null}

      {value.length > 0 ? (
        <>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {value.map((image, index) => (
              <li key={image.src} className="group relative">
                <span className="relative block aspect-[4/3] overflow-hidden bg-sand">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 640px) 20vw, 45vw"
                    unoptimized={image.src.startsWith("blob:")}
                    className="object-cover"
                  />
                  {index === 0 ? (
                    <span className="label-caps absolute top-0 left-0 bg-burgundy px-2 py-1 text-[9px] text-cream">
                      Portada
                    </span>
                  ) : null}
                </span>

                <div className="mt-2 flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Mover antes"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-35"
                    >
                      <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === value.length - 1}
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
                      disabled={index === 0}
                      aria-label="Marcar como portada"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/50 hover:text-burgundy disabled:opacity-35"
                    >
                      <Check aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      aria-label="Eliminar imagen"
                      className="inline-flex size-7 items-center justify-center rounded-xs border border-stone text-ink-muted transition-colors hover:border-burgundy/50 hover:text-burgundy"
                    >
                      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </li>
            ))}

            {value.length < MAX_IMAGES ? (
              <li>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-stone-strong text-ink-muted transition-colors hover:border-burgundy hover:text-burgundy"
                >
                  <Plus aria-hidden className="size-5" strokeWidth={1.4} />
                  <span className="font-serif text-xs">Agregar más fotos</span>
                </button>
              </li>
            ) : null}
          </ul>

          <p className="mt-4 text-xs text-ink-muted tabular">
            {value.length} de {MAX_IMAGES} imágenes
          </p>
        </>
      ) : null}
    </div>
  );
}
