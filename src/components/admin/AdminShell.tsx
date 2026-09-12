"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Layers,
  Car,
  X,
} from "lucide-react";
import { Logo, Shield } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/server/auth/supabase-browser";
import type { AdminSession } from "@/types/admin";

const nav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Vehículos", href: "/admin/vehiculos", icon: Car, exact: true },
  { label: "Nuevo vehículo", href: "/admin/vehiculos/nuevo", icon: Plus, exact: true },
  { label: "Solicitudes", href: "/admin/solicitudes", icon: Inbox, exact: false },
  { label: "Categorías", href: "/admin/categorias", icon: Layers, exact: false },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings, exact: false },
];

function NavList({ pathname }: { pathname: string }) {
  return (
    <ul className="grid gap-1">
      {nav.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3.5 rounded-xs px-4 py-3 font-serif text-[0.9375rem] transition-colors",
                active
                  ? "bg-cream/10 text-cream"
                  : "text-cream/60 hover:bg-cream/5 hover:text-cream/90",
              )}
            >
              <Icon aria-hidden className="size-[1.125rem]" strokeWidth={1.3} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Cerrar sesión de verdad: borra la sesión de Supabase y, con ella, las
 * cookies. El `refresh` posterior obliga al servidor a reevaluar la ruta, de
 * modo que volver atrás con el botón del navegador no devuelve una pantalla
 * privada renderizada de antes.
 */
function SidebarFooter({ session }: { session: AdminSession }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const initials = session.email.slice(0, 2).toUpperCase();

  async function signOut() {
    if (pending) return;
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.replace("/admin/login");
  }

  return (
    <div className="mt-auto border-t border-cream/10 px-4 py-5">
      <div className="flex items-center gap-3">
        <span className="label-caps inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-cream/10 text-[10px] text-cream">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif text-sm text-cream" title={session.email}>
            {session.name ?? session.email}
          </p>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-cream/50 transition-colors hover:text-cream/80 disabled:opacity-50"
          >
            {pending ? "Cerrando…" : "Cerrar sesión"}
            <LogOut aria-hidden className="size-3" strokeWidth={1.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);

  // Close on navigation without an effect, which would cascade renders.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-cream lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-charcoal lg:flex">
        <div className="px-5 py-6">
          <Logo tone="cream" size="sm" href="/admin" />
        </div>
        <nav aria-label="Administración" className="px-3">
          <NavList pathname={pathname} />
        </nav>
        <SidebarFooter session={session} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-stone bg-cream px-5 lg:hidden">
        <Link href="/admin" className="inline-flex items-center gap-2.5">
          <Shield size={26} />
          <span className="font-display text-lg tracking-[0.24em] text-ink uppercase">
            MILLE
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú de administración"
          aria-expanded={open}
          className="-mr-2 inline-flex size-10 items-center justify-center text-ink"
        >
          <Menu aria-hidden className="size-6" strokeWidth={1.25} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-100 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-charcoal">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo tone="cream" size="sm" href="/admin" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="-mr-2 inline-flex size-10 items-center justify-center text-cream"
              >
                <X aria-hidden className="size-5" strokeWidth={1.25} />
              </button>
            </div>
            <nav aria-label="Administración" className="px-3">
              <NavList pathname={pathname} />
            </nav>
            <SidebarFooter session={session} />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="mb-9">
      {breadcrumb ? <div className="mb-5">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.875rem,3.4vw,2.5rem)] leading-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 font-serif text-[0.9375rem] text-ink-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
