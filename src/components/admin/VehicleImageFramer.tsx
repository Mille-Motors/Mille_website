"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { FocalPointEditor } from "@/components/admin/FocalPointEditor";
import { Button } from "@/components/ui/Button";
import { adminJson } from "@/lib/admin-client";
import { roundFocal, sameFocal, type FocalPoint } from "@/lib/focal-point";
import { VEHICLE_DEFAULT_FOCAL, VEHICLE_FRAMES } from "@/lib/vehicle-frame";
import type { Vehicle, VehicleImage } from "@/types/vehicle";

/**
 * Ajustar el encuadre de UNA fotografía del vehículo.
 *
 * El editor es el mismo que encuadra las fotografías generales del sitio
 * —`FocalPointEditor`, sin una línea duplicada— y por eso se comporta igual:
 * la fotografía entera visible, un recuadro con lo que sobrevive al marco y
 * todo lo demás oscurecido. Tener dos recortadores que se parecen pero no se
 * comportan igual es peor que no tener ninguno.
 *
 * Lo único que cambia respecto al sitio es el marco: aquí hay uno solo y es
 * horizontal, así que no se ofrece pestaña de vista previa ni selector de
 * proporción. Quien administra decide QUÉ PARTE se ve, nunca qué forma tiene.
 *
 * Guardar escribe dos números. No sube nada, no recorta el archivo, no toca
 * la posición en la galería, ni la portada, ni el texto alternativo.
 */
export function VehicleImageFramer({
  vehicleId,
  image,
  index,
  onSaved,
  onClose,
}: {
  vehicleId: string;
  image: VehicleImage;
  /** Para poder nombrarla: "Fotografía 3". */
  index: number;
  onSaved: (vehicle: Vehicle) => void;
  onClose: () => void;
}) {
  const [focal, setFocal] = useState<FocalPoint>(image.focal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // El foco entra en el editor al abrirlo y vuelve a la rejilla al cerrarlo
  // (de eso se encarga quien lo monta). Sin esto, quien navega con teclado
  // seguiría en la lista de fotos mientras la pantalla enseña otra cosa.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const saved = sameFocal(focal, image.focal);
  const centered = sameFocal(focal, VEHICLE_DEFAULT_FOCAL);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const chosen = roundFocal(focal);
    const result = await adminJson<{ vehicle: Vehicle }>(
      `/api/admin/vehicles/${vehicleId}/images/${image.id}`,
      "PATCH",
      { focal: chosen },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(result.data.vehicle);
    onClose();
  }

  return (
    <div
      className="mt-5 border border-stone bg-paper p-4 sm:p-5"
      // Escape cierra sin guardar, que es lo que se espera de un editor que
      // se abre encima de lo que estabas haciendo.
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-xl text-ink outline-none"
        >
          Ajustar fotografía {index + 1}
        </h3>
        <p className="text-xs text-ink-muted">
          Se guarda el encuadre, no la fotografía. El archivo original no se
          toca.
        </p>
      </div>

      <div className="mt-4">
        <FocalPointEditor
          src={image.src}
          alt={image.alt}
          frames={VEHICLE_FRAMES}
          focal={focal}
          onChange={setFocal}
          disabled={busy}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-burgundy">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={busy || saved} onClick={() => void save()}>
          {busy ? "Guardando…" : "Guardar encuadre"}
        </Button>

        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>
          Cancelar
        </Button>

        {/* Restablecer devuelve al centro, que es "no haber decidido nada":
            el mismo recorte que hace `object-fit: cover` por su cuenta. No
            borra la fotografía ni deshace nada más. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy || centered}
          onClick={() => setFocal({ ...VEHICLE_DEFAULT_FOCAL })}
        >
          <Crosshair aria-hidden className="size-3.5" strokeWidth={1.5} />
          Restablecer encuadre
        </Button>

        {saved ? null : (
          <span className="label-caps rounded-xs border border-burgundy/30 bg-burgundy/5 px-2.5 py-1.5 text-[10px] text-burgundy">
            Ajuste sin guardar
          </span>
        )}
      </div>
    </div>
  );
}
