"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** Collapsible section used to keep the phone layout readable one-handed. */
export function MobileAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-stone">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-serif text-[1.0625rem] text-ink">{title}</span>
        <ChevronDown
          aria-hidden
          strokeWidth={1.4}
          className={cn(
            "size-5 shrink-0 text-ink-muted transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="pb-6">{children}</div> : null}
    </div>
  );
}
