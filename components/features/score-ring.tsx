import { cn } from "@/lib/utils";
import { nivelScore } from "@/lib/format";

const TRAZO = {
  alto: "stroke-emerald-600",
  medio: "stroke-amber-500",
  bajo: "stroke-rose-500",
} as const;

/** Anillo de progreso con el score en el centro. El número siempre está
 *  visible: el color solo refuerza el tramo (alto / medio / bajo). */
export function ScoreRing({
  score,
  size = 64,
  etiqueta,
  className,
}: {
  score: number;
  size?: number;
  /** Texto chico bajo el número (p. ej. "match"). */
  etiqueta?: string;
  className?: string;
}) {
  const grosor = Math.max(5, Math.round(size / 11));
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const valor = Math.max(0, Math.min(100, score));

  return (
    <div
      role="img"
      aria-label={`Match ${Math.round(valor)} de 100`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={grosor} className="stroke-muted" />
        {valor > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${(valor / 100) * c} ${c}`}
          className={cn("transition-[stroke-dasharray] duration-700", TRAZO[nivelScore(valor)])}
        />}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-none">
        <span>
          <span className="font-semibold tabular-nums" style={{ fontSize: size * 0.26 }}>
            {Math.round(valor)}
            <span className="text-muted-foreground" style={{ fontSize: size * 0.15 }}>%</span>
          </span>
          {etiqueta && (
            <span className="mt-0.5 block text-muted-foreground" style={{ fontSize: Math.max(9, size * 0.12) }}>
              {etiqueta}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}
