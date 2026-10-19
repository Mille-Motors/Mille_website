"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";
import {
  ImageRightsForm,
  type ImageRightsDraft,
} from "@/components/admin/ImageRightsForm";
import { adminJson } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import {
  IMAGE_RIGHTS_ORIGIN_LABELS,
  IMAGE_SOURCE_TYPE_LABELS,
  type ResolvedImageRights,
} from "@/lib/image-provenance";
import type { VehicleProvenance } from "@/types/provenance";

/**
 * «¿Por qué podemos usar esta foto?», respondido por fotografía.
 *
 * Es el panel que cierra la trazabilidad de derechos: muestra qué responde
 * cada fotografía, de dónde sale esa respuesta —de la foto, del lote o de los
 * créditos del repositorio— y qué sigue sin registrar.
 *
 * Lo pendiente se dice, no se esconde ni se bloquea. Una fotografía sin
 * procedencia registrada sigue publicándose: las fotos que ya estaban no
 * reciben una autorización inventada por el hecho de existir.
 */

/** La respuesta ya resuelta, en una lista de definiciones. */
function RightsSummary({ resolved }: { resolved: ResolvedImageRights }) {
  if (resolved.status === "pending") {
    return (
      <p className="inline-flex items-center gap-2 font-serif text-sm text-ink-muted">
        <CircleDashed aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        Procedencia pendiente de registrar.
      </p>
    );
  }

  const { rights, origin } = resolved;
  const rows: [string, React.ReactNode][] = [
    ["Fuente", IMAGE_SOURCE_TYPE_LABELS[rights.sourceType]],
    ["Entregada por", rights.sourceName],
    ["Autor", rights.author],
    [
      "Licencia",
      rights.licenseUrl ? (
        <a
          href={rights.licenseUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-burgundy underline underline-offset-2"
        >
          {rights.licenseType ?? rights.licenseUrl}
          <ExternalLink aria-hidden className="size-3" strokeWidth={1.6} />
        </a>
      ) : (
        rights.licenseType
      ),
    ],
    [
      "Origen del archivo",
      rights.sourceUrl ? (
        <a
          href={rights.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 break-all text-burgundy underline underline-offset-2"
        >
          Ver origen
          <ExternalLink aria-hidden className="size-3" strokeWidth={1.6} />
        </a>
      ) : null,
    ],
    ["Obtenida el", rights.acquiredOn],
    ["Autorizada por", rights.authorizedBy],
    ["Prueba", rights.proofRef],
    [
      "Atribución",
      rights.licenseRequiresAttribution
        ? "La licencia EXIGE citar al autor donde se publique"
        : "La licencia no exige atribución",
    ],
    ["Notas", rights.notes],
  ];

  return (
    <div>
      <p className="inline-flex items-center gap-2 font-serif text-sm text-ink-soft">
        <CheckCircle2
          aria-hidden
          className="size-4 shrink-0 text-status-available"
          strokeWidth={1.5}
        />
        {IMAGE_RIGHTS_ORIGIN_LABELS[origin]}
      </p>
      <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows
          .filter(([, value]) => value !== null && value !== undefined && value !== "")
          .map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="font-serif text-xs text-ink-muted">{label}:</dt>
              <dd className="min-w-0 font-serif text-xs text-ink-soft">{value}</dd>
            </div>
          ))}
      </dl>

      {/* Una licencia de banco cubre al FOTÓGRAFO y a nadie más. Decirlo aquí
          evita la lectura cómoda de «tiene licencia, luego está todo
          resuelto»: la autorización del propietario, las marcas visibles y la
          imagen de las personas son tres derechos distintos con tres
          titulares distintos. */}
      {rights.sourceType === "stock" ? (
        <p className="mt-2 font-serif text-xs leading-relaxed text-ink-muted">
          La licencia cubre los derechos del fotógrafo. No cubre autorización
          del propietario del vehículo, derechos sobre las marcas visibles ni
          uso de imagen de personas que aparezcan.
        </p>
      ) : null}
    </div>
  );
}

export function VehicleProvenancePanel({
  vehicleId,
  initial,
}: {
  vehicleId: string;
  initial: VehicleProvenance;
}) {
  const router = useRouter();
  const [provenance, setProvenance] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<"lot" | string | null>(null);

  // Si el servidor vuelve a pintar la página con otros datos —se subió una
  // foto, se recargó—, el panel los sigue en vez de quedarse enseñando los de
  // antes.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setProvenance(initial);
  }

  async function save(path: string, rights: ImageRightsDraft) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await adminJson<{ provenance: VehicleProvenance }>(
      path,
      "PATCH",
      { rights },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setProvenance(result.data.provenance);
    setEditing(null);
    router.refresh();
  }

  const saveLot = (rights: ImageRightsDraft) =>
    save(`/api/admin/vehicles/${vehicleId}/provenance`, rights);

  const saveImage = (imageId: string, rights: ImageRightsDraft) =>
    save(
      `/api/admin/vehicles/${vehicleId}/images/${imageId}/provenance`,
      rights,
    );

  return (
    <div className="grid gap-6">
      {error ? (
        <p role="alert" className="font-serif text-sm text-burgundy">
          {error}
        </p>
      ) : null}

      {/* El lote: lo que se rellena una vez y cubre todas las fotos. */}
      <section className="border border-stone bg-sand/30 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-ink">
              Lote fotográfico del vehículo
            </h3>
            <p className="mt-1 font-serif text-sm text-ink-muted">
              Así llegan las fotos de un carro: todas del propietario, o todas
              del dealer. Se rellena una vez y cubre las que no tengan
              procedencia propia.
            </p>
          </div>
          {editing !== "lot" ? (
            <button
              type="button"
              onClick={() => setEditing("lot")}
              className="label-caps shrink-0 rounded-xs border border-stone bg-paper px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
            >
              {provenance.lot ? "Editar" : "Registrar"}
            </button>
          ) : null}
        </div>

        <div className="mt-3">
          {editing === "lot" ? (
            <ImageRightsForm
              scope="lot"
              initial={provenance.lot}
              busy={busy}
              onSubmit={saveLot}
              onCancel={() => setEditing(null)}
            />
          ) : provenance.lot ? (
            <RightsSummary
              resolved={{
                status: "documented",
                origin: "vehicle",
                rights: provenance.lot,
              }}
            />
          ) : (
            <p className="font-serif text-sm text-ink-muted">
              Sin registrar. No bloquea nada: las fotografías se publican igual
              y cada una puede tener la suya.
            </p>
          )}
        </div>
      </section>

      {/* Las fotografías, una por una. */}
      {provenance.images.length === 0 ? (
        <p className="font-serif text-sm text-ink-muted">
          Este vehículo todavía no tiene fotografías.
        </p>
      ) : (
        <section className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg text-ink">
              Fotografías ({provenance.images.length})
            </h3>
            <p
              className={cn(
                "font-serif text-sm",
                provenance.pendingCount > 0 ? "text-ink-soft" : "text-ink-muted",
              )}
            >
              {provenance.pendingCount === 0
                ? "Todas tienen procedencia."
                : `${provenance.pendingCount} sin procedencia registrada.`}
            </p>
          </div>

          <ul className="grid gap-2">
            {provenance.images.map((image) => (
              <li
                key={image.imageId}
                className="border border-stone bg-paper px-4 py-3"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xs bg-sand">
                    <Image
                      src={image.src}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm text-ink">
                      {image.position === 0
                        ? "Portada"
                        : `Fotografía ${image.position + 1}`}
                      {image.source === "legacy" ? (
                        <span className="label-caps ml-2 rounded-xs border border-stone-strong/40 bg-sand px-2 py-0.5 text-[10px] text-ink-muted">
                          Repositorio
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-1.5">
                      <RightsSummary resolved={image.resolved} />
                    </div>
                  </div>

                  {editing !== image.imageId ? (
                    <button
                      type="button"
                      onClick={() => setEditing(image.imageId)}
                      className="label-caps shrink-0 rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
                    >
                      {image.own ? "Editar esta foto" : "Distinguir esta foto"}
                    </button>
                  ) : null}
                </div>

                {editing === image.imageId ? (
                  <div className="mt-4 border-t border-stone pt-4">
                    <ImageRightsForm
                      scope="image"
                      initial={image.own}
                      busy={busy}
                      onSubmit={(rights) => saveImage(image.imageId, rights)}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
