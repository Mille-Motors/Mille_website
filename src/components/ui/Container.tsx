import { cn } from "@/lib/cn";

type Width = "default" | "wide" | "narrow";

const widths: Record<Width, string> = {
  narrow: "max-w-3xl",
  default: "max-w-[1280px]",
  wide: "max-w-[1480px]",
};

export function Container({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: Width;
}) {
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8 lg:px-12", widths[width], className)}>
      {children}
    </div>
  );
}
