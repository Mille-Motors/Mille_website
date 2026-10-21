"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Layers,
  Car,
  X,
} from "lucide-react";
import { Logo, Shield } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { useDialog } from "@/components/ui/use-dialog";
import { createSupabaseBrowserClient } from "@/server/auth/supabase-browser";
import type { AdminNavBadges, AdminSession } from "@/types/admin";

type BadgeKey = "inquiries" | "privacy";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Car;
  /** Qué rutas encienden esta entrada: editar un vehículo sigue siendo Vehículos. */
  match: (pathname: string) => boolean;
  badge?: BadgeKey;
}

/**
 * El menú, en tres grupos que se leen como se trabaja: lo de todos los días,
 * lo que se ve en el sitio, y lo legal.
 *
 * Nueve entradas pasaron a siete. «Nuevo vehículo» era un botón disfrazado de
 * destino —ya está en la pantalla de Vehículos—, y las dos pantallas de datos
 * personales son una sola entrada con dos pestañas: unas son personas que
 * piden algo con un plazo de ley, las otras son la prueba de lo que
 * autorizaron.
 *
 * Y «Consultas» es lo que antes se llamaba «Solicitudes»: gente que escribe
 * por el formulario. Con «Solicitudes de privacidad» al lado, los dos nombres
 * se confundían.
 */
const navGroups: NavItem[][] = [
  [
    {
      label: "Panel",
      href: "/admin",
      icon: LayoutDashboard,
      match: (path) => path === "/admin",
    },
    {
      label: "Vehículos",
      href: "/admin/vehiculos",
      icon: Car,
      match: (path) => path.startsWith("/admin/vehiculos"),
    },
    {
      label: "Consultas",
      href: "/admin/solicitudes",
      icon: Inbox,
      match: (path) => path.startsWith("/admin/solicitudes"),
      badge: "inquiries",
    },
  ],
  [
    {
      label: "Imágenes del sitio",
      href: "/admin/contenido",
      icon: ImageIcon,
      match: (path) => path.startsWith("/admin/contenido"),
    },
    {
      label: "Categorías",
      href: "/admin/categorias",
      icon: Layers,
      match: (path) => path.startsWith("/admin/categorias"),
    },
  ],
  [
    {
      label: "Privacidad",
      href: "/admin/privacidad",
      icon: ShieldCheck,
      match: (path) =>
        path.startsWith("/admin/privacidad") ||
        path.startsWith("/admin/consentimientos"),
      badge: "privacy",
    },
    {
      label: "Configuración",
      href: "/admin/configuracion",
      icon: Settings,
      match: (path) => path.startsWith("/admin/configuracion"),
    },
  ],
];

/** El número que espera respuesta junto a una entrada, si lo hay. */
function navBadge(
  key: BadgeKey | undefined,
  badges: AdminNavBadges,
): { count: number; urgent: boolean; label: string } | null {
  if (key === "inquiries" && badges.newInquiries > 0) {
    return {
      count: badges.newInquiries,
      urgent: false,
      label: `${badges.newInquiries} sin atender`,
    };
  }
  if (key === "privacy") {
    // Con plazos vencidos se cuentan los vencidos: es lo que no puede esperar.
    if (badges.privacyOverdue > 0) {
      return {
        count: badges.privacyOverdue,
        urgent: true,
        label: `${badges.privacyOverdue} vencidas`,
      };
    }
    if (badges.privacyOpen > 0) {
      return {
        count: badges.privacyOpen,
        urgent: false,
        label: `${badges.privacyOpen} abiertas`,
      };
    }
  }
  return null;
}

function NavList({
  pathname,
  badges,
}: {
  pathname: string;
  badges: AdminNavBadges;
}) {
  return (
    <div className="grid gap-3">
      {navGroups.map((group, index) => (
        <ul
          key={group[0].href}
          className={cn("grid gap-0.5", index > 0 && "border-t border-cream/10 pt-3")}
        >
          {group.map(({ label, href, icon: Icon, match, badge }) => {
            const active = match(pathname);
            const pill = navBadge(badge, badges);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.9375rem] transition-colors",
                    active
                      ? "bg-cream/10 font-medium text-cream"
                      : "text-cream/60 hover:bg-cream/5 hover:text-cream/90",
                  )}
                >
                  <Icon aria-hidden className="size-[1.125rem] shrink-0" strokeWidth={1.4} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {pill ? (
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs leading-none font-medium tabular",
                        pill.urgent
                          ? "bg-status-sold text-cream"
                          : "bg-cream text-burgundy",
                      )}
                    >
                      {pill.count}
                      <span className="sr-only"> {pill.label}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
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
  badges,
  children,
}: {
  session: AdminSession;
  badges: AdminNavBadges;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [seenPath, setSeenPath] = useState(pathname);

  // Close on navigation without an effect, which would cascade renders.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  // Antes solo bloqueaba el scroll: no cerraba con Escape ni llevaba el foco
  // al panel. Mismo comportamiento que el resto de diálogos del proyecto.
  useDialog(panelRef, open, () => setOpen(false));

  return (
    <div className="min-h-dvh bg-cream lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-charcoal lg:flex">
        <div className="px-5 py-6">
          <Logo tone="cream" size="sm" href="/admin" />
        </div>
        <nav aria-label="Administración" className="px-3">
          <NavList pathname={pathname} badges={badges} />
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
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de administración"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-charcoal"
          >
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
              <NavList pathname={pathname} badges={badges} />
            </nav>
            <SidebarFooter session={session} />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * El encabezado de cada pantalla del admin. Una escala fija y no fluida: es
 * software de trabajo, se mira siempre a la misma distancia, y la jerarquía
 * la da el peso y no el tamaño.
 *
 * `eyebrow` es la sección a la que pertenece la pantalla («Inventario»); sin
 * él, el título va solo.
 */
export function AdminPageHeader({
  title,
  subtitle,
  eyebrow,
  action,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      {breadcrumb ? <div className="mb-4">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="label-caps mb-2 text-ink-muted">{eyebrow}</p>
          ) : null}
          <h1 className="text-[2.25rem] leading-[1.08] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-base text-ink-muted">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
