import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { pageWindow } from "@/lib/page-window";

/**
 * Las piezas que comparten todas las pantallas del Admin.
 *
 * Antes cada pantalla traía su propia copia del select, del campo, del chip y
 * del paginador —cuatro versiones del mismo botón con tamaños distintos—, y
 * por eso «Consultas» y «Vehículos» parecían de programas diferentes. Aquí
 * hay una sola: un mismo alto (36 px) para todo lo que se pulsa, el mismo
 * radio, el mismo foco y los mismos estados.
 *
 * Nada de esto lleva `"use client"`: son funciones de presentación. Las que
 * reciben manejadores solo se usan desde componentes de cliente; las que no
 * (`Panel`, `Pill`, `AdminTabs`, `Notice`) se pueden usar desde el servidor.
 */

// ---------------------------------------------------------------------------
// Clases
// ---------------------------------------------------------------------------

/** Un campo de una línea: input o select. */
export const fieldClass =
  "h-9 rounded-lg border border-stone-strong bg-paper text-[0.9375rem] text-ink transition-colors hover:border-ink/40 focus-visible:border-burgundy focus-visible:outline-none";

export const textareaClass =
  "w-full rounded-lg border border-stone-strong bg-paper px-3 py-2 text-[0.9375rem] leading-relaxed text-ink transition-colors hover:border-ink/40 focus-visible:border-burgundy focus-visible:outline-none";

/**
 * Un botón. Sin relleno horizontal a propósito: unos llevan texto y piden
 * `px-4`, otros son un icono cuadrado de `w-9`.
 */
export const buttonClass =
  "press inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-strong bg-paper text-sm font-medium whitespace-nowrap text-ink hover:border-ink/45 disabled:pointer-events-none disabled:opacity-50";

/** Se suma a `buttonClass` para el botón que hace lo principal de la fila. */
export const buttonPrimaryClass =
  "border-burgundy bg-burgundy text-cream hover:border-burgundy-dark hover:bg-burgundy-dark";

/** Un filtro de un clic. Activo, vinotinto; inactivo, neutro con borde fino. */
export const chipClass = (active: boolean) =>
  cn(
    "press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium whitespace-nowrap focus-visible:outline-offset-1",
    active
      ? "border-burgundy bg-burgundy text-cream"
      : "border-stone-strong bg-paper text-ink-soft hover:border-ink/40 hover:text-ink",
  );

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      aria-hidden
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      strokeWidth={1.8}
    />
  );
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  // El área de pulsación es la de un dedo, no la de la casilla.
  return (
    <label className="inline-flex size-10 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        ref={(element) => {
          if (element) element.indeterminate = Boolean(indeterminate);
        }}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 cursor-pointer accent-burgundy"
      />
    </label>
  );
}

/** Un campo con su rótulo encima. El control va dentro del `<label>`. */
export function AdminField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <span className="text-[0.8125rem] font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="text-[0.8125rem] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function AdminInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(fieldClass, "w-full px-3", className)} />;
}

export function AdminSelect({
  value,
  onChange,
  label,
  name,
  defaultValue,
  children,
}: {
  value?: string;
  defaultValue?: string;
  name?: string;
  onChange?: (value: string) => void;
  /** Lo que anuncia un lector de pantalla cuando no hay texto visible. */
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="relative block min-w-0 flex-1">
      <select
        name={name}
        value={value}
        defaultValue={defaultValue}
        aria-label={label}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={cn(fieldClass, "w-full cursor-pointer appearance-none pr-8 pl-3")}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted"
      />
    </span>
  );
}

/** Buscar se envía con Intro; no hace falta un botón que lo repita. */
export function SearchBox({
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  label: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={cn("relative w-full sm:w-80", className)}
    >
      <Search
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        enterKeyHint="search"
        autoComplete="off"
        aria-label={label}
        placeholder={placeholder}
        className={cn(fieldClass, "w-full pr-3 pl-9 placeholder:text-ink-muted/80")}
      />
    </form>
  );
}

/** El botón «Filtros», con cuántos criterios hay dentro del panel. */
export function FilterButton({
  open,
  count,
  controls,
  onClick,
}: {
  open: boolean;
  count: number;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={cn(
        fieldClass,
        "press inline-flex items-center gap-2 px-3.5 font-medium",
        (open || count > 0) && "border-burgundy/60",
      )}
    >
      <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
      Filtros
      {count > 0 ? (
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-burgundy text-xs text-cream tabular">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** El panel que se abre bajo la barra. */
export function FilterPanel({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        "mt-3 grid gap-x-4 gap-y-3.5 rounded-xl border border-stone bg-paper p-4 sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Los chips que caben en una fila: en pantallas estrechas se desplazan en
 * horizontal en vez de partirse en tres líneas. El relleno de 4 px deja sitio
 * al anillo de foco, que un contenedor con scroll recortaría.
 */
export function ChipRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "-m-1 w-[calc(100%+0.5rem)] overflow-x-auto p-1 scrollbar-none",
        className,
      )}
    >
      <div role="group" aria-label={label} className="flex w-max items-center gap-1.5">
        {children}
      </div>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={chipClass(active)}
    >
      {children}
      {count !== undefined ? (
        <span className="tabular opacity-70">{count}</span>
      ) : null}
    </button>
  );
}

/** Un renglón que solo existe cuando hay algo que limpiar. */
export function ActiveFilters({
  summary,
  onClear,
}: {
  summary: string;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
      <p className="tabular">{summary}</p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 rounded-md py-1 font-medium text-ink underline-offset-4 transition-colors hover:text-burgundy hover:underline"
      >
        Limpiar filtros
        <X aria-hidden className="size-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}

/**
 * Pie de lista: cuántos se ven de cuántos hay, y las páginas. Con una sola
 * página el paginador sigue ahí, quieto y apagado, para que la pantalla no
 * cambie de forma según el tamaño de lo que haya.
 */
export function Pager({
  page,
  pages,
  total,
  shown,
  limit,
  noun,
  onPage,
  pending,
}: {
  page: number;
  pages: number;
  total: number;
  /** Cuántas filas trae esta página. */
  shown: number;
  limit: number;
  noun: readonly [singular: string, plural: string];
  onPage: (page: number) => void;
  pending?: boolean;
}) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = from + Math.max(shown, 1) - 1;

  const box =
    "press inline-flex size-9 items-center justify-center rounded-lg border text-sm font-medium tabular transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center justify-between gap-3",
        pending && "opacity-60",
      )}
    >
      <p className="text-sm text-ink-muted tabular">
        Mostrando {from === to ? from : `${from}–${to}`} de {total}{" "}
        {total === 1 ? noun[0] : noun[1]}
      </p>

      <nav aria-label="Paginación" className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={cn(box, "border-stone-strong bg-paper text-ink hover:border-ink/40")}
        >
          <ChevronLeft aria-hidden className="size-4" strokeWidth={1.6} />
        </button>

        {pageWindow(page, pages).map((item, index) =>
          item === "…" ? (
            <span
              key={`gap-${index}`}
              aria-hidden
              className="inline-flex size-6 items-center justify-center text-ink-muted"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Página ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => item !== page && onPage(item)}
              className={cn(
                box,
                item === page
                  ? "border-burgundy bg-burgundy text-cream"
                  : "border-stone-strong bg-paper text-ink hover:border-ink/40",
              )}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Página siguiente"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className={cn(box, "border-stone-strong bg-paper text-ink hover:border-ink/40")}
        >
          <ChevronRight aria-hidden className="size-4" strokeWidth={1.6} />
        </button>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

/** El contenedor de toda lista o bloque: borde fino, sin sombra. */
export function Panel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("rounded-xl border border-stone bg-paper", className)}
    >
      {children}
    </div>
  );
}

type Tone = "success" | "info" | "warning" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "border-status-available/30 bg-status-available/10 text-status-available",
  info: "border-status-reserved/30 bg-status-reserved/10 text-status-reserved",
  warning: "border-status-sold/30 bg-status-sold/10 text-status-sold",
  neutral: "border-stone-strong/40 bg-sand text-ink-muted",
};

/** La insignia de una fila. Los colores solo dicen estado. */
export function Pill({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8125rem] leading-none font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Un aviso que no se puede pasar por alto, sin llegar a ser un error. */
export function Notice({
  tone = "warning",
  icon,
  className,
  children,
}: {
  tone?: "warning" | "neutral";
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-[0.9375rem]",
        tone === "warning"
          ? "border-status-sold/30 bg-status-sold/10 text-status-sold"
          : "border-stone bg-sand/60 text-ink-soft",
        className,
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** El vacío de una lista: dice qué pasa y qué hacer, en poco espacio. */
export function EmptyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
        {icon}
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-base text-ink-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** El título de un bloque dentro de una pantalla. */
export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

/**
 * Las pestañas de una sección que tiene más de una pantalla. Son enlaces: cada
 * pestaña es su propia URL, así que atrás, recargar y compartir funcionan sin
 * estado que mantener.
 */
export function AdminTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { label: string; href: string; active: boolean; badge?: number }[];
}) {
  return (
    <nav
      aria-label={label}
      className="-mt-2 mb-6 flex gap-6 overflow-x-auto border-b border-stone scrollbar-none"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex items-center gap-2 border-b-2 pb-3 text-[0.9375rem] font-medium whitespace-nowrap transition-colors focus-visible:outline-offset-2",
            tab.active
              ? "border-burgundy text-ink"
              : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {tab.label}
          {tab.badge ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-burgundy px-1.5 py-0.5 text-xs leading-none text-cream tabular">
              {tab.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
