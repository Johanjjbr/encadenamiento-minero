import { cn } from "@/lib/utils";

export interface Segmento {
  etiqueta: string;
  valor: number; // 0-100
  clase: string; // clase de fondo de Tailwind (string estático)
}

/** Barra de cobertura hasta 100%, segmentada por aporte de cada miembro. */
export function CoverageBar({
  segmentos,
  total,
  className,
}: {
  segmentos: Segmento[];
  total: number;
  className?: string;
}) {
  const detalle = segmentos.map((s) => `${s.etiqueta} ${Math.round(s.valor)}%`).join(", ");
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`Cobertura ${Math.round(total)}% (${detalle})`}
        className="flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full bg-muted"
      >
        {segmentos.map((s) => (
          <div
            key={s.etiqueta}
            className={cn("h-full first:rounded-l-full last:rounded-r-[4px]", s.clase)}
            style={{ width: `${Math.max(0, Math.min(100, s.valor))}%` }}
            title={`${s.etiqueta}: ${Math.round(s.valor)}%`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
