import { cn } from "@/lib/utils";

/** Marca: cordillera estilizada + veta de cobre. SVG propio, sin assets externos. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M4 24 12 11l4 6 4-7 8 14Z" fill="white" fillOpacity="0.92" />
      <path d="M12 11l2.2 3.4L12 16l-1.6-2.4Z" className="fill-primary" fillOpacity="0.55" />
      <path d="M6 24.5h20" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, invertido = false }: { className?: string; invertido?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className={cn("block text-sm font-semibold tracking-tight", invertido && "text-white")}>
          Encadenamiento
        </span>
        <span className={cn("block text-xs", invertido ? "text-white/60" : "text-muted-foreground")}>
          Minero · San Juan
        </span>
      </span>
    </span>
  );
}
