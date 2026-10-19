"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  IMAGE_SOURCE_TYPES,
  IMAGE_SOURCE_TYPE_LABELS,
  type ImageRights,
  type ImageSourceType,
} from "@/lib/image-provenance";

/**
 * El formulario de procedencia de una fotografía o de un lote.
 *
 * Solo la fuente es obligatoria. Es el campo que convierte «no sabemos» en
 * «lo sabemos», y pedir autor, licencia y prueba para registrar que un
 * propietario mandó las fotos por WhatsApp garantizaría que nadie registrara
 * nada. Lo demás se rellena cuando se sabe, y lo que no se sabe se queda
 * vacío: ningún campo se autocompleta con algo plausible.
 *
 * Es el mismo formulario para el lote de un vehículo, para una fotografía
 * suelta y para un espacio del sitio, porque la pregunta que responden es la
 * misma.
 */

const inputClass =
  "h-10 w-full rounded-xs border border-stone bg-paper px-3 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-xs border border-stone bg-paper px-3 pr-8 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

const textareaClass =
  "w-full rounded-xs border border-stone bg-paper px-3 py-2 font-serif text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="eyebrow text-ink-muted/80">{label}</span>
      {children}
      {hint ? (
        <span className="font-serif text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** Lo que el formulario devuelve: el bloque entero, o `null` para vaciarlo. */
export type ImageRightsDraft = ImageRights | null;

export function ImageRightsForm({
  initial,
  busy,
  onSubmit,
  onCancel,
  /** Qué se está documentando, para que el texto diga la verdad. */
  scope,
}: {
  initial: ImageRights | null;
  busy: boolean;
  onSubmit: (rights: ImageRightsDraft) => void;
  onCancel?: () => void;
  scope: "lot" | "image" | "slot";
}) {
  const [sourceType, setSourceType] = useState<ImageSourceType | "">(
    initial?.sourceType ?? "",
  );
  const [sourceName, setSourceName] = useState(initial?.sourceName ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [licenseType, setLicenseType] = useState(initial?.licenseType ?? "");
  const [licenseUrl, setLicenseUrl] = useState(initial?.licenseUrl ?? "");
  const [attribution, setAttribution] = useState(
    initial?.licenseRequiresAttribution ?? false,
  );
  const [acquiredOn, setAcquiredOn] = useState(initial?.acquiredOn ?? "");
  const [authorizedBy, setAuthorizedBy] = useState(initial?.authorizedBy ?? "");
  const [proofRef, setProofRef] = useState(initial?.proofRef ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const scopeCopy = {
    lot: "Se aplica a todas las fotografías de este vehículo que no tengan una procedencia propia.",
    image: "Se aplica solo a esta fotografía y manda sobre la del vehículo.",
    slot: "Se aplica a la fotografía de este espacio, en sus dos variantes.",
  }[scope];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!sourceType) return;
        onSubmit({
          sourceType,
          sourceName: sourceName.trim() || null,
          author: author.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
          licenseType: licenseType.trim() || null,
          licenseUrl: licenseUrl.trim() || null,
          licenseRequiresAttribution: attribution,
          acquiredOn: acquiredOn || null,
          authorizedBy: authorizedBy.trim() || null,
          proofRef: proofRef.trim() || null,
          notes: notes.trim() || null,
        });
      }}
      className="grid gap-4"
    >
      <p className="font-serif text-sm text-ink-muted">{scopeCopy}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fuente" hint="Lo único obligatorio.">
          <span className="relative block">
            <select
              required
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as ImageSourceType | "")
              }
              className={selectClass}
            >
              <option value="">Elige una fuente…</option>
              {IMAGE_SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {IMAGE_SOURCE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted"
            />
          </span>
        </Field>

        <Field
          label="Quién entregó el material"
          hint="El nombre del propietario, del dealer o del banco de imágenes."
        >
          <input
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Autor de la fotografía">
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="URL de origen">
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Licencia o autorización">
          <input
            value={licenseType}
            onChange={(event) => setLicenseType(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="URL de la licencia">
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={licenseUrl}
            onChange={(event) => setLicenseUrl(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Fecha en que se obtuvo">
          <input
            type="date"
            value={acquiredOn}
            onChange={(event) => setAcquiredOn(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Quién autorizó el uso">
          <input
            value={authorizedBy}
            onChange={(event) => setAuthorizedBy(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Dónde está la prueba"
          hint="No se guarda la prueba, se señala: un hilo de correo, un contrato, un archivo."
        >
          <input
            value={proofRef}
            onChange={(event) => setProofRef(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={attribution}
          onChange={(event) => setAttribution(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-burgundy"
        />
        <span className="font-serif text-sm text-ink-soft">
          La licencia <strong className="text-ink">exige</strong> citar al autor
          donde se publique la fotografía. Márcalo solo si la licencia lo
          obliga: hoy ninguna de las que usa el sitio lo hace, y por eso el
          sitio público no muestra créditos.
        </span>
      </label>

      <Field label="Notas">
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={textareaClass}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || !sourceType}
          className="label-caps rounded-xs bg-burgundy px-4 py-2.5 text-[10px] text-cream disabled:opacity-40"
        >
          {busy ? "Guardando…" : "Guardar procedencia"}
        </button>

        {initial ? (
          // Borrar un registro equivocado es legítimo y distinto de no tocar
          // nada: corregirlo no puede obligar a inventar otro, y conservar un
          // dato que se sabe falso es peor que no tener ninguno.
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit(null)}
            className={cn(
              "label-caps rounded-xs border border-stone px-4 py-2.5 text-[10px] text-ink transition-colors",
              "hover:border-burgundy/40 hover:text-burgundy disabled:opacity-40",
            )}
          >
            Quitar procedencia
          </button>
        ) : null}

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="label-caps rounded-xs border border-stone px-4 py-2.5 text-[10px] text-ink transition-colors hover:border-ink/40"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
