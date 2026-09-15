"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crosshair, RotateCcw, Upload } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
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
import { formatDate } from "@/lib/format";
import type { SiteMediaEntry } from "@/types/site-media";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Una tarjeta por slot. Cada una enseña la imagen que está viva ahora mismo,
 * de dónde sale y qué proporción ocupa en la página, porque recortar bien una
 * fotografía es la mitad del trabajo.
 *
 * El archivo elegido se previsualiza antes de subirlo: cambiar la portada del
 * sitio no debería ser un acto de fe.
 */
function SlotCard({ slot }: { slot: SiteMediaEntry }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState(slot.alt);
  const [focal, setFocal] = useState<FocalPoint>(slot.focal);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [busy, setBusy] = useState<null | "upload" | "alt" | "focal" | "reset">(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function choose(selected: File | null) {
    setError(null);
    setDone(null);
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      setError("Solo JPG, PNG, WebP o AVIF.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("La imagen debe pesar menos de 10 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function discard() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    // El encuadre que se estuviera ajustando describía el archivo que se
    // acaba de descartar. Se vuelve al de la imagen que sigue publicada.
    setFocal(slot.focal);
  }

  async function upload() {
    if (!file || busy) return;
    setBusy("upload");
    setError(null);
    setDone(null);

    const chosen = roundFocal(focal);
    const form = new FormData();
    form.append("file", file);
    form.append("alt", alt.trim() || slot.alt);
    // Subir y encuadrar son un solo gesto: la imagen nueva llega ya con la
    // parte que se quiere ver, sin un segundo guardado.
    form.append("focal", JSON.stringify(chosen));

    const result = await adminRequest(
      `/api/admin/site-media/${encodeURIComponent(slot.key)}`,
      { method: "POST", body: form },
    );
    setBusy(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setFocal(chosen);
    setDone("Imagen y encuadre actualizados. Ya se ven en el sitio.");
    router.refresh();
  }

  async function saveFocal() {
    if (busy || focalSaved) return;
    setBusy("focal");
    setError(null);
    setDone(null);
    const chosen = roundFocal(focal);
    const result = await adminJson(
      `/api/admin/site-media/${encodeURIComponent(slot.key)}`,
      "PATCH",
      { focal: chosen },
    );
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setFocal(chosen);
    setDone("Encuadre guardado. Ya se ve así en la página.");
    router.refresh();
  }

  async function saveAlt() {
    if (busy || alt.trim() === slot.alt) return;
    setBusy("alt");
    setError(null);
    setDone(null);
    const result = await adminJson(
      `/api/admin/site-media/${encodeURIComponent(slot.key)}`,
      "PATCH",
      { alt: alt.trim() },
    );
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDone("Texto alternativo guardado.");
    router.refresh();
  }

  async function reset() {
    if (busy) return;
    setBusy("reset");
    setError(null);
    setDone(null);
    const result = await adminJson(
      `/api/admin/site-media/${encodeURIComponent(slot.key)}`,
      "DELETE",
    );
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setAlt(slot.alt);
    setFocal({ ...CENTER_FOCAL });
    setDone("Slot devuelto a su fotografía original, centrada.");
    router.refresh();
  }

  const changed = slot.source === "storage";
  const focalSaved = sameFocal(focal, slot.focal);

  return (
    <section
      className={cn(
        "grid gap-6 border border-stone bg-paper p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
        busy && "opacity-60",
      )}
      aria-busy={busy !== null}
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">{slot.label}</h2>
          <span
            className={cn(
              "label-caps rounded-xs border px-2.5 py-1.5 text-[10px]",
              changed
                ? "border-status-available/30 bg-status-available/10 text-status-available"
                : "border-stone-strong/40 bg-sand text-ink-muted",
            )}
          >
            {changed ? "Personalizada" : "Original"}
          </span>
        </div>

        <p className="mt-3 font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
          {slot.description}
        </p>
        <p className="mt-2 text-xs text-ink-muted">{slot.aspect}</p>
        {slot.updatedAt ? (
          <p className="mt-2 text-xs text-ink-muted">
            Última actualización: {formatDate(slot.updatedAt)}
          </p>
        ) : null}

        <label className="mt-6 grid gap-2">
          <span className="label-caps text-ink-soft">Texto alternativo</span>
          <textarea
            value={alt}
            rows={2}
            onChange={(event) => setAlt(event.target.value)}
            className="w-full rounded-xs border border-stone bg-paper px-4 py-3 text-sm leading-relaxed text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none"
          />
          <span className="text-xs text-ink-muted">
            Describe la fotografía para quien no puede verla. No uses el nombre
            del archivo.
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy !== null || alt.trim() === slot.alt || alt.trim().length < 3}
            onClick={() => void saveAlt()}
          >
            {busy === "alt" ? "Guardando…" : "Guardar texto"}
          </Button>
          {changed ? (
            <ConfirmButton
              question="Se volverá a la fotografía original del sitio y la que subiste se eliminará definitivamente."
              confirmLabel="Sí, restaurar"
              disabled={busy !== null}
              onConfirm={() => void reset()}
              className="label-caps inline-flex h-9 items-center justify-center gap-2.5 rounded-xs border border-stone px-4 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:pointer-events-none disabled:opacity-50"
            >
              <RotateCcw aria-hidden className="size-3.5" strokeWidth={1.5} />
              {busy === "reset" ? "Restaurando…" : "Restaurar original"}
            </ConfirmButton>
          ) : null}
        </div>
      </div>

      <div>
        <p className="label-caps mb-3 text-ink-soft">
          {preview ? "Vista previa del archivo elegido" : "Imagen actual"}
        </p>

        <FocalPointEditor
          src={preview ?? slot.src}
          alt={preview ? "Vista previa" : slot.alt}
          frames={slot.frames}
          focal={focal}
          onChange={setFocal}
          onNatural={setNatural}
          unoptimized={Boolean(preview)}
          disabled={busy !== null}
        />

        {/* El aviso que faltaba. Una fotografía por debajo de este ancho se
            estira para cubrir el hueco, y eso se ve blando en pantallas
            Retina por mucho que se suba la calidad de compresión: los
            píxeles no están. Es lo único que no se puede arreglar desde el
            código. */}
        {natural ? (
          natural.width < slot.recommendedWidth ? (
            <p className="mt-3 text-xs text-burgundy">
              Esta fotografía mide {natural.width} px de ancho y este espacio
              necesita al menos {slot.recommendedWidth} px para verse nítida en
              pantallas Retina. Se verá algo blanda.
            </p>
          ) : (
            <p className="mt-3 text-xs text-ink-muted">
              {natural.width} × {natural.height} px. Resolución suficiente para
              este espacio.
            </p>
          )
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy !== null || sameFocal(focal, CENTER_FOCAL)}
            onClick={() => setFocal({ ...CENTER_FOCAL })}
          >
            <Crosshair aria-hidden className="size-3.5" strokeWidth={1.5} />
            Centrar imagen
          </Button>

          {/* Con un archivo elegido no hay dos guardados: el encuadre viaja
              con la imagen y ofrecer un botón aparte invitaría a guardar un
              encuadre de una fotografía que todavía no está subida. */}
          {preview ? (
            <span className="text-xs text-ink-muted">
              El encuadre se guarda junto con la imagen.
            </span>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy !== null || focalSaved}
                onClick={() => void saveFocal()}
              >
                {busy === "focal" ? "Guardando…" : "Guardar encuadre"}
              </Button>
              {focalSaved ? null : (
                <span className="label-caps rounded-xs border border-burgundy/30 bg-burgundy/5 px-2.5 py-1.5 text-[10px] text-burgundy">
                  Ajuste sin guardar
                </span>
              )}
            </>
          )}
        </div>

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

        <div className="mt-4 flex flex-wrap gap-3">
          {preview ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy !== null}
                onClick={() => void upload()}
              >
                <Check aria-hidden className="size-3.5" strokeWidth={1.6} />
                {busy === "upload" ? "Subiendo…" : "Guardar imagen"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={discard}
              >
                Descartar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden className="size-3.5" strokeWidth={1.5} />
              Cambiar imagen
            </Button>
          )}
        </div>

        <p className="mt-3 text-xs text-ink-muted">
          JPG, PNG, WebP o AVIF. Máx. 10 MB. Para este espacio, al menos{" "}
          {slot.recommendedWidth} px de ancho.
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-burgundy">
            {error}
          </p>
        ) : null}
        {done ? <p className="mt-3 text-xs text-ink-muted">{done}</p> : null}
      </div>
    </section>
  );
}

export function SiteMediaAdmin({ media }: { media: SiteMediaEntry[] }) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Imágenes del sitio"
        subtitle="Las fotografías de la home que no pertenecen a ningún vehículo"
      />

      <p className="mb-8 max-w-2xl font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
        Estos cuatro espacios están definidos en el diseño del sitio. Puedes
        cambiar la fotografía de cada uno y su texto alternativo; el cambio se
        ve en el sitio público de inmediato, sin volver a publicar.
      </p>

      <div className="grid gap-6">
        {media.map((slot) => (
          <SlotCard key={slot.key} slot={slot} />
        ))}
      </div>
    </div>
  );
}
