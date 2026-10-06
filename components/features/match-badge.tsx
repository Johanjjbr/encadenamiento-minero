import { cn } from "@/lib/utils";
import { formatPorcentaje, nivelScore } from "@/lib/format";

const ESTILOS = {
  alto: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  medio: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  bajo: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
} as const;

/** Porcentaje de match con color por tramo. El número siempre está visible,
 *  así que el color no es lo único que comunica el valor. */
export function MatchBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      title={`Match: ${score.toFixed(1)} de 100`}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums",
        ESTILOS[nivelScore(score)],
        className
      )}
    >
      {formatPorcentaje(score)}
    </span>
  );
}
