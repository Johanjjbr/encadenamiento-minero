import { NIVELES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Nivel 1-3 como tres marcas + etiqueta (el texto siempre acompaña). */
export function NivelDots({ nivel, className }: { nivel: number; className?: string }) {
  const info = NIVELES.find((n) => n.valor === nivel);
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={info?.detalle}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2 w-4 rounded-sm", i <= nivel ? "bg-primary" : "bg-muted")} />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">{info?.etiqueta ?? `Nivel ${nivel}`}</span>
    </span>
  );
}
