"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xs border border-stone bg-paper px-4 text-sm text-ink transition-colors placeholder:text-ink-muted/70 hover:border-stone-strong focus:border-burgundy focus:outline-none";

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="label-caps mb-2 block text-ink-soft">
      {children}
      {required ? <span className="ml-1 text-burgundy">*</span> : null}
    </label>
  );
}

function Hint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-xs text-burgundy">
      {children}
    </p>
  );
}

interface BaseProps {
  label: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  containerClassName,
  className,
  id,
  required,
  ...rest
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  return (
    <div className={containerClassName}>
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(control, "h-12", error && "border-burgundy", className)}
        {...rest}
      />
      {error ? <Hint id={errorId}>{error}</Hint> : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  containerClassName,
  className,
  id,
  required,
  ...rest
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  return (
    <div className={containerClassName}>
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      <textarea
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(control, "py-3.5 leading-relaxed", error && "border-burgundy", className)}
        {...rest}
      />
      {error ? <Hint id={errorId}>{error}</Hint> : null}
    </div>
  );
}

export function Select({
  label,
  error,
  containerClassName,
  className,
  id,
  required,
  children,
  ...rest
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  return (
    <div className={containerClassName}>
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      <div className="relative">
        <select
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            control,
            "h-12 appearance-none pr-10",
            error && "border-burgundy",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
          strokeWidth={1.5}
        />
      </div>
      {error ? <Hint id={errorId}>{error}</Hint> : null}
    </div>
  );
}
