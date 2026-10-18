import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * La línea bajo el botón de enviar: dice qué pasa con los datos antes de que
 * la persona los mande, y lleva a la política completa. Se abre en otra
 * pestaña porque estos formularios están a medio rellenar —uno dentro de un
 * modal— y navegar a otra página los vaciaría.
 */
export function PrivacyNotice({ className }: { className?: string }) {
  return (
    <p className={cn("font-serif text-xs leading-relaxed text-ink-muted", className)}>
      Al enviar aceptas que usemos tus datos para responderte, según nuestra{" "}
      <Link
        href="/privacidad"
        target="_blank"
        className="text-burgundy underline decoration-burgundy/40 underline-offset-2 transition-colors hover:decoration-burgundy"
      >
        Política de tratamiento de datos
      </Link>
      .
    </p>
  );
}
