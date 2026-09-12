"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { createSupabaseBrowserClient } from "@/server/auth/supabase-browser";

/**
 * Correo y contraseña contra Supabase Auth. Nada de magic link, nada de
 * OAuth, y no existe registro público: las cuentas del equipo se crean en
 * Supabase y se autorizan con `npm run admin:grant`.
 *
 * El error de credenciales es deliberadamente genérico: distinguir "ese
 * correo no existe" de "esa contraseña no es" le regala a quien prueba una
 * lista de correos válidos.
 */
export function AdminLogin({ denied }: { denied?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    denied
      ? "Esa cuenta no tiene acceso de administración."
      : null,
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    setPending(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setPending(false);
      setError("Correo o contraseña incorrectos.");
      return;
    }

    // `refresh` obliga al servidor a releer la sesión recién escrita en las
    // cookies antes de que el layout del panel decida si hay permiso.
    router.refresh();
    router.replace("/admin");
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-charcoal px-5 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex justify-center">
          <Logo tone="cream" size="sm" href="/" />
        </div>

        <div className="mt-10 border border-cream/12 bg-cream px-6 py-8 sm:px-8">
          <h1 className="font-display text-[1.75rem] leading-tight text-ink">
            Administración
          </h1>
          <p className="mt-2 font-serif text-[0.9375rem] text-ink-muted">
            Acceso del equipo de MILLE.
          </p>

          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
            <Input
              label="Correo"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />

            <Button type="submit" size="lg" disabled={pending} className="mt-1">
              {pending ? "Entrando…" : "Entrar"}
              {pending ? null : (
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              )}
            </Button>

            {error ? (
              <p role="alert" className="text-xs text-burgundy">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
