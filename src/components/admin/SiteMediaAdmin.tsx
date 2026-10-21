"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, RotateCcw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { SiteMediaVariantPanel } from "@/components/admin/SiteMediaVariantPanel";
import { Pill, buttonClass, textareaClass } from "@/components/admin/kit";
import { Button } from "@/components/ui/Button";
import { adminJson } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { objectPosition, type FocalPoint } from "@/lib/focal-point";
import type { SiteMediaEntry } from "@/types/site-media";

/** Qué archivo y con qué encuadre se está enseñando ahora mismo. */
const variantKey = (src: string, focal: FocalPoint) =>
  `${src}|${focal.x},${focal.y}`;

/**
 * Una tarjeta por espacio. Cada una enseña lo que está vivo ahora mismo, de
 * dónde sale y qué resolución necesita, porque recortar bien una fotografía
 * es la mitad del trabajo y tener resolución de sobra es la otra mitad.
 *
 * Los espacios con dos composiciones —la portada y «Vende con MILLE»— se
 * ven aquí uno al lado del otro: la pregunta útil no es «¿se ve bien?» sino
 * «¿se ve bien en los dos sitios?», y esa solo se puede contestar mirando
 * las dos a la vez.
 */
function SlotCard({ slot }: { slot: SiteMediaEntry }) {
  const router = useRouter();
  const [alt, setAlt] = useState(slot.alt);
  const [busy, setBusy] = useState<null | "alt" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // Plegada: con ocho espacios abiertos a la vez la pantalla medía diez mil
  // píxeles. Se abre la que se va a trabajar.
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  const endpoint = `/api/admin/site-media/${encodeURIComponent(slot.key)}`;
  const changed = slot.desktop.source === "storage" || slot.mobile !== null;
  const mobileFrame = slot.frames.mobile;

  function saved(message: string) {
    setDone(message);
    setError(null);
    router.refresh();
  }

  async function saveAlt() {
    if (busy || alt.trim() === slot.alt) return;
    setBusy("alt");
    setError(null);
    setDone(null);
    const result = await adminJson(endpoint, "PATCH", { alt: alt.trim() });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    saved("Texto alternativo guardado.");
  }

  async function reset() {
    if (busy) return;
    setBusy("reset");
    setError(null);
    setDone(null);
    const result = await adminJson(endpoint, "DELETE");
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAlt(slot.alt);
    saved("Espacio devuelto a su fotografía original, centrada.");
  }

  return (
    <section
      className={cn("rounded-xl border border-stone bg-paper", busy && "opacity-60")}
      aria-busy={busy !== null}
    >
      {/* El resumen es lo que se ve siempre: la fotografía que hay ahora, qué
          espacio es y si es la original. Pulsarlo abre el editor. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-sand/40 focus-visible:outline-offset-[-2px]"
      >
        <span className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-sand">
          <Image
            src={slot.desktop.src}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
            style={{ objectPosition: objectPosition(slot.desktop.focal) }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">{slot.label}</span>
          <span className="block truncate text-[0.9375rem] text-ink-muted">
            {slot.description}
          </span>
        </span>
        <Pill tone={changed ? "success" : "neutral"} className="hidden sm:inline-flex">
          {changed ? "Personalizada" : "Original"}
        </Pill>
        <ChevronDown
          aria-hidden
          strokeWidth={1.6}
          className={cn(
            "size-5 shrink-0 text-ink-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div id={bodyId} className="border-t border-stone px-5 pt-5 pb-5 sm:px-6">
      <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
        {slot.description}
      </p>
      <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{slot.aspect}</p>
      {slot.updatedAt ? (
        <p className="mt-1.5 text-sm text-ink-muted">
          Última actualización: {formatDate(slot.updatedAt)}
        </p>
      ) : null}

      {/* Una fotografía decorativa se sirve con alt vacío a propósito, así
          que ofrecer el campo sería ofrecer un control que no cambia nada. */}
      {slot.decorative ? null : (
        <div className="mt-5 max-w-2xl">
          <label className="grid gap-1.5">
            <span className="text-[0.8125rem] font-medium text-ink-muted">Texto alternativo</span>
            <textarea
              value={alt}
              rows={2}
              onChange={(event) => setAlt(event.target.value)}
              className={textareaClass}
            />
            <span className="text-[0.8125rem] text-ink-muted">
              Describe la fotografía para quien no puede verla. No uses el
              nombre del archivo.
            </span>
          </label>
          <div className="mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={
                busy !== null || alt.trim() === slot.alt || alt.trim().length < 3
              }
              onClick={() => void saveAlt()}
            >
              {busy === "alt" ? "Guardando…" : "Guardar texto"}
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "mt-6 grid gap-7 border-t border-stone pt-6",
          mobileFrame && "lg:grid-cols-2 lg:gap-x-10",
        )}
      >
        <SiteMediaVariantPanel
          // La identidad de lo que se está viendo. Cuando el servidor
          // devuelve otro archivo u otro encuadre tras guardar, el borrador
          // local —encuadre a medias, archivo elegido, dimensiones medidas—
          // describe la fotografía ANTERIOR y no hay nada que conservar.
          // Montar de nuevo es la forma de React de decir eso, y solo pasa
          // después de un guardado: mientras se edita, las props no cambian.
          key={variantKey(slot.desktop.src, slot.desktop.focal)}
          slotKey={slot.key}
          variant="desktop"
          frame={slot.frames.desktop}
          file={slot.desktop}
          focal={slot.desktop.focal}
          inherited={false}
          recommendedVariant={false}
          recommendedMaxBytes={slot.recommendedMaxBytes}
          disabled={busy !== null}
          onSaved={saved}
        />

        {/* Sin marco de teléfono el espacio recorta igual en los dos
            tamaños: no hay segunda composición que revisar ni variante que
            subir, y ofrecerla sería inventar una decisión. */}
        {mobileFrame ? (
          <SiteMediaVariantPanel
            key={variantKey(
              (slot.mobile ?? slot.desktop).src,
              slot.mobileFocal,
            )}
            slotKey={slot.key}
            variant="mobile"
            frame={mobileFrame}
            file={slot.mobile ?? slot.desktop}
            focal={slot.mobileFocal}
            inherited={slot.mobile === null}
            recommendedVariant={slot.mobileVariantRecommended}
            recommendedMaxBytes={slot.recommendedMaxBytes}
            disabled={busy !== null}
            onSaved={saved}
          />
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone pt-5">
        <p className="mr-auto text-[0.8125rem] text-ink-muted">
          JPG, PNG, WebP o AVIF. Máx. 25 MB. El archivo se guarda entero: el
          recorte es solo de presentación.
        </p>
        {changed ? (
          <ConfirmButton
            question="Se volverá a la fotografía original del sitio y las que subiste se eliminarán definitivamente, incluida la variante de teléfono."
            confirmLabel="Sí, restaurar"
            disabled={busy !== null}
            onConfirm={() => void reset()}
            className={cn(buttonClass, "px-4")}
          >
            <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
            {busy === "reset" ? "Restaurando…" : "Restaurar original"}
          </ConfirmButton>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[0.9375rem] text-burgundy">
          {error}
        </p>
      ) : null}
      {done ? <p className="mt-3 text-[0.9375rem] text-ink-muted">{done}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

/** Los espacios agrupados como se piensan, no como están en el array. */
const GROUPS: { title: string; hint: string; match: (key: string) => boolean }[] =
  [
    {
      title: "Páginas",
      hint: "Las fotografías grandes de la home, contacto y la página de error.",
      match: (key) => key.startsWith("home.") || key.startsWith("contact.") || key.startsWith("error."),
    },
    {
      title: "Menú",
      hint: "La fotografía que acompaña a cada enlace al abrir el menú en escritorio. Cada una es independiente.",
      match: (key) => key.startsWith("nav."),
    },
    {
      title: "Compartir",
      hint: "Lo que se ve al pegar un enlace del sitio en WhatsApp o redes. 1.200 × 630 px en JPG ya es el tamaño óptimo. Al cambiarla, el sitio sirve la nueva al instante, pero una previsualización que WhatsApp ya guardó puede tardar en renovarse.",
      match: (key) => key.startsWith("seo."),
    },
  ];

export function SiteMediaAdmin({ media }: { media: SiteMediaEntry[] }) {
  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title="Imágenes del sitio"
        subtitle="Las fotografías que no pertenecen a un vehículo. El cambio se ve en el sitio de inmediato."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
        {GROUPS.map((group) => {
          const slots = media.filter((slot) => group.match(slot.key));
          if (slots.length === 0) return null;
          return (
            <div key={group.title}>
              <h2 className="text-lg font-semibold text-ink">{group.title}</h2>
              <p className="mt-0.5 mb-3 max-w-2xl text-[0.9375rem] text-ink-muted">
                {group.hint}
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                {slots.map((slot) => (
                  <SlotCard key={slot.key} slot={slot} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
