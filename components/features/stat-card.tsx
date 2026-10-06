import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tarjeta de indicador: ícono + valor grande + etiqueta + detalle opcional. */
export function StatCard({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  destacado = false,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border p-4 shadow-xs",
        destacado ? "border-primary/30 bg-accent/60" : "bg-card"
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          destacado ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
        )}
      >
        <Icono className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums leading-tight">{valor}</p>
        {detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
      </div>
    </div>
  );
}
