import { cn } from "@/lib/utils";

export interface BarraComparativa {
  id: string;
  etiqueta: string;
  valor: number; // 0-100
  tipo: "pyme" | "ute";
  detalle?: string;
}

const TICKS = [0, 25, 50, 75, 100];

/** Barras horizontales 0-100: cada pyme sola vs. la alianza sugerida.
 *  Un solo eje, valor escrito en la punta, tooltip al pasar el mouse. */
export function ComparativaChart({ barras }: { barras: BarraComparativa[] }) {
  const hayUte = barras.some((b) => b.tipo === "ute");

  return (
    <figure className="space-y-3">
      {hayUte && (
        <figcaption className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-stone-400" aria-hidden /> Pyme sola
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-primary" aria-hidden /> Alianza sugerida (UTE)
          </span>
        </figcaption>
      )}

      <div className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-x-3 gap-y-2 text-sm">
        {barras.map((b) => (
          <div key={b.id} className="contents">
            <span
              className={cn("truncate text-right text-xs", b.tipo === "ute" ? "font-semibold" : "text-muted-foreground")}
              title={b.etiqueta}
            >
              {b.etiqueta}
            </span>
            <div className="group relative h-6">
              {/* Grilla recesiva */}
              {TICKS.map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-border" style={{ left: `${t}%` }} aria-hidden />
              ))}
              <div className="relative flex h-full items-center">
                <div
                  className={cn(
                    "h-4 rounded-r-[4px] transition-[width] duration-700",
                    b.tipo === "ute" ? "bg-primary" : "bg-stone-400"
                  )}
                  style={{ width: `${Math.max(0.5, Math.min(100, b.valor))}%` }}
                />
                <span
                  className={cn(
                    "ml-1.5 text-xs tabular-nums",
                    b.tipo === "ute" ? "font-semibold text-foreground" : "text-muted-foreground",
                    b.valor > 88 && "absolute right-1.5 ml-0 text-white"
                  )}
                >
                  {Math.round(b.valor)}%
                </span>
              </div>
              {/* Tooltip */}
              <div
                role="tooltip"
                className="pointer-events-none absolute -top-9 left-0 z-10 hidden whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md group-hover:block"
              >
                <span className="font-medium">{b.etiqueta}</span> · {b.valor.toFixed(1)}%
                {b.detalle ? <span className="text-muted-foreground"> · {b.detalle}</span> : null}
              </div>
            </div>
          </div>
        ))}
        <span />
        <div className="relative h-4 text-[10px] text-muted-foreground" aria-hidden>
          {TICKS.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
