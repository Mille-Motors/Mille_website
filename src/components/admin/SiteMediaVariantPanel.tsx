"use client";

import { useRef, useState } from "react";
import { Check, Crosshair, Trash2, Upload } from "lucide-react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { FocalPointEditor } from "@/components/admin/FocalPointEditor";
import { Button } from "@/components/ui/Button";
import { adminJson, adminRequest } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import {
  CENTER_FOCAL,
  roundFocal,
  sameFocal,
  type FocalPoint,
} from "@/lib/focal-point";
import {
  formatBytes,
  formatSize,
  frameQuality,
  type QualityLevel,
} from "@/lib/image-quality";
import type { PixelSize, SiteMediaFrame } from "@/lib/site-media";
import type { SiteMediaVariantEntry } from "@/types/site-media";

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Qué color tiene cada veredicto. Discreto: un distintivo, no una alarma.
 */
const BADGE: Record<QualityLevel, string> = {
  excellent:
    "border-status-available/30 bg-status-available/10 text-status-available",
  recommended:
    "border-status-available/30 bg-status-available/10 text-status-available",
  acceptable: "border-stone-strong/40 bg-sand text-ink-soft",
  low: "border-status-sold/40 bg-status-sold/10 text-status-sold",
  below: "border-burgundy/30 bg-burgundy/5 text-burgundy",
};

/**
 * Una de las dos caras de un espacio del sitio: escritorio o teléfono.
 *
 * Las dos funcionan igual —previsualizar, encuadrar, reemplazar— así que son
 * el mismo componente. Lo que cambia es el marco contra el que se mide y
 * que la de teléfono puede no existir: entonces enseña la de escritorio y
 * ofrece añadirla, pero deja ajustar el encuadre vertical igualmente, que es
 * lo que la mayoría de los espacios van a usar.
 */
export function SiteMediaVariantPanel({
  slotKey,
  variant,
  frame,
  file,
  focal,
  inherited,
  recommendedVariant,
  disabled,
  onSaved,
}: {
  slotKey: string;
  variant: "desktop" | "mobile";
  frame: SiteMediaFrame;
  /** El archivo que se está viendo. En teléfono puede ser el de escritorio. */
  file: SiteMediaVariantEntry;
  /** El encuadre que manda en este viewport. */
  focal: FocalPoint;
  /** El teléfono está usando la fotografía de escritorio. */
  inherited: boolean;
  /** El Admin recomienda subir una fotografía propia para el teléfono. */
  recommendedVariant: boolean;
  disabled: boolean;
  onSaved: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [draftFocal, setDraftFocal] = useState<FocalPoint>(focal);
  const [natural, setNatural] = useState<PixelSize | null>(file.size);
  const [busy, setBusy] = useState<null | "upload" | "focal" | "remove">(null);
  const [error, setError] = useState<string | null>(null);

  const isMobile = variant === "mobile";
  const endpoint = `/api/admin/site-media/${encodeURIComponent(slotKey)}`;
  const locked = disabled || busy !== null;
  const focalSaved = sameFocal(draftFocal, focal);
  // El veredicto se calcula sobre lo que mide el archivo DE VERDAD: lo que
  // dice la base si se subió por aquí, y si no, lo que el navegador mide al
  // cargarlo. Así también se puntúan las fotografías heredadas de /public.
  const verdict = natural ? frameQuality(natural, frame) : null;

  function choose(selected: File | null) {
    setError(null);
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      setError("Solo JPG, PNG, WebP o AVIF.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("La imagen debe pesar menos de 25 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPending(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function discard() {
    if (preview) URL.revokeObjectURL(preview);
    setPending(null);
    setPreview(null);
    setNatural(file.size);
    // El encuadre que se estuviera ajustando describía el archivo que se
    // acaba de descartar. Se vuelve al de la imagen que sigue publicada.
    setDraftFocal(focal);
  }

  async function upload() {
    if (!pending || locked) return;
    setBusy("upload");
    setError(null);

    const form = new FormData();
    form.append("file", pending);
    form.append("variant", variant);
    // Subir y encuadrar son un solo gesto: la imagen nueva llega ya con la
    // parte que se quiere ver, sin un segundo guardado.
    form.append("focal", JSON.stringify(roundFocal(draftFocal)));

    const result = await adminRequest(endpoint, { method: "POST", body: form });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPending(null);
    setPreview(null);
    onSaved(
      isMobile
        ? "Fotografía de teléfono guardada."
        : "Fotografía de escritorio guardada.",
    );
  }

  async function saveFocal() {
    if (locked || focalSaved) return;
    setBusy("focal");
    setError(null);
    const chosen = roundFocal(draftFocal);
    const result = await adminJson(endpoint, "PATCH", {
      [isMobile ? "mobileFocal" : "focal"]: chosen,
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved("Encuadre guardado. Ya se ve así en la página.");
  }

  async function removeVariant() {
    if (locked) return;
    setBusy("remove");
    setError(null);
    const result = await adminJson(`${endpoint}?variant=mobile`, "DELETE");
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved("Variante de teléfono eliminada. Vuelve a usarse la de escritorio.");
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-caps text-ink-soft">
          {isMobile ? "Teléfono" : "Escritorio"}
        </p>
        {verdict ? (
          <span
            className={cn(
              "label-caps rounded-xs border px-2.5 py-1.5 text-[10px]",
              BADGE[verdict.level],
            )}
          >
            {verdict.label}
          </span>
        ) : null}
      </div>

      {/* Lo que hay que buscar y lo que hay cargado, uno encima del otro:
          la comparación es la única forma de saber si hace falta otra foto. */}
      <dl className="grid gap-1 text-xs text-ink-muted">
        <div className="flex justify-between gap-4">
          <dt>Recomendado</dt>
          <dd className="tabular text-ink-soft">
            {formatSize(frame.recommended)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Mínimo</dt>
          <dd className="tabular">{formatSize(frame.minimum)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Actual</dt>
          <dd className="tabular text-ink-soft">
            {inherited && !pending
              ? "Usando imagen de escritorio"
              : [
                  natural ? formatSize(natural) : "midiendo…",
                  file.contentType?.replace("image/", "").toUpperCase(),
                  file.bytes ? formatBytes(file.bytes) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </dd>
        </div>
      </dl>

      <FocalPointEditor
        src={preview ?? file.src}
        alt=""
        frames={{ desktop: frame, mobile: null }}
        focal={draftFocal}
        onChange={setDraftFocal}
        onNatural={setNatural}
        unoptimized={Boolean(preview)}
        disabled={locked}
      />

      {verdict && verdict.level === "below" ? (
        <p className="text-xs text-burgundy">
          Después del recorte quedan {formatSize(verdict.effective)}, por
          debajo del mínimo de este espacio. Se verá blanda y no hay ajuste
          que lo arregle: los píxeles no están.
        </p>
      ) : null}
      {verdict && verdict.aggressiveCrop ? (
        <p className="text-xs text-ink-muted">
          Este marco se queda con menos de dos tercios de la fotografía.
          Comprueba en el recuadro que no se corte nada importante.
        </p>
      ) : null}
      {recommendedVariant && inherited && !pending ? (
        <p className="text-xs text-ink-muted">
          Aquí la composición es muy distinta a la de escritorio. Con una
          fotografía propia se ve bastante mejor, pero el encuadre de abajo
          ya ayuda.
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(event) => {
          choose(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        {pending ? (
          <>
            <Button type="button" size="sm" disabled={locked} onClick={() => void upload()}>
              <Check aria-hidden className="size-3.5" strokeWidth={1.6} />
              {busy === "upload" ? "Subiendo…" : "Guardar imagen"}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={locked} onClick={discard}>
              Descartar
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={locked}
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden className="size-3.5" strokeWidth={1.5} />
              {inherited
                ? "Añadir imagen móvil"
                : isMobile
                  ? "Reemplazar imagen móvil"
                  : "Reemplazar imagen"}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={locked || focalSaved}
              onClick={() => void saveFocal()}
            >
              {busy === "focal" ? "Guardando…" : "Guardar encuadre"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={locked || sameFocal(draftFocal, CENTER_FOCAL)}
              onClick={() => setDraftFocal({ ...CENTER_FOCAL })}
            >
              <Crosshair aria-hidden className="size-3.5" strokeWidth={1.5} />
              Centrar
            </Button>

            {isMobile && !inherited ? (
              <ConfirmButton
                question="Se eliminará la fotografía de teléfono y el espacio volverá a usar la de escritorio."
                confirmLabel="Sí, eliminar"
                disabled={locked}
                onConfirm={() => void removeVariant()}
                ariaLabel="Eliminar variante móvil"
                className="label-caps inline-flex h-9 items-center justify-center gap-2.5 rounded-xs border border-stone px-4 text-[10px] text-ink transition-colors hover:border-burgundy/50 hover:text-burgundy disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 aria-hidden className="size-3.5" strokeWidth={1.5} />
                {busy === "remove" ? "Eliminando…" : "Eliminar variante"}
              </ConfirmButton>
            ) : null}
          </>
        )}

        {focalSaved || pending ? null : (
          <span className="label-caps rounded-xs border border-burgundy/30 bg-burgundy/5 px-2.5 py-1.5 text-[10px] text-burgundy">
            Ajuste sin guardar
          </span>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-burgundy">
          {error}
        </p>
      ) : null}
    </div>
  );
}
