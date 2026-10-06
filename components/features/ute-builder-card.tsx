import { CoverageBar } from "@/components/features/coverage-bar";
import { MatchBadge } from "@/components/features/match-badge";
import { cn } from "@/lib/utils";
import { formatPorcentaje } from "@/lib/format";
import { repartirCobertura, type MiembroUte, type RequisitoResumen } from "@/lib/ute";

const COLORES = [
  {
    barra: "bg-sky-500",
    chip: "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-800",
  },
  {
    barra: "bg-violet-500",
    chip: "bg-violet-50 text-violet-900 ring-violet-200 dark:bg-violet-950 dark:text-violet-100 dark:ring-violet-800",
  },
  {
    barra: "bg-amber-500",
    chip: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-800",
  },
] as const;

interface Props {
  ute: { id: string; score_total: number; cobertura: number };
  miembros: MiembroUte[];
  requisitos: RequisitoResumen[];
  /** Score individual de cada miembro en este lote (por empresa_id). */
  scores: Record<string, number>;
}

/** UTE Builder: qué pymes forman la alianza, qué aporta cada una y cuánto
 *  del lote cubren juntas. */
export function UteBuilderCard({ ute, miembros, requisitos, scores }: Props) {
  const reparto = repartirCobertura(requisitos, miembros);
  const completa = ute.cobertura >= 100;

  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            UTE sugerida
          </p>
          <h3 className="text-lg font-semibold">{miembros.map((m) => m.nombre).join(" + ")}</h3>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={cn(
              "rounded-full px-3 py-1 font-semibold",
              completa
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
            )}
          >
            Cobertura {formatPorcentaje(ute.cobertura)}
          </span>
          <span className="text-muted-foreground" title="Cobertura menos 5 puntos por cada miembro extra">
            Puntaje {Math.round(ute.score_total)}
          </span>
        </div>
      </header>

      <CoverageBar
        className="mt-4"
        total={ute.cobertura}
        segmentos={reparto.miembros.map((rm, i) => ({
          etiqueta: miembros.find((m) => m.empresaId === rm.empresaId)?.nombre ?? "Miembro",
          valor: rm.puntos,
          clase: COLORES[i % COLORES.length].barra,
        }))}
      />

      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {miembros.map((m, i) => {
          const color = COLORES[i % COLORES.length];
          const parte = reparto.miembros.find((rm) => rm.empresaId === m.empresaId);
          const score = scores[m.empresaId];
          return (
            <li key={m.empresaId} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 inline-block size-2.5 rounded-full", color.barra)} aria-hidden />
                  <div>
                    <p className="font-medium leading-tight">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.departamento ?? "Sin departamento"} · aporta {formatPorcentaje(parte?.puntos ?? 0)} del lote
                    </p>
                  </div>
                </div>
                {score !== undefined && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    Sola: <MatchBadge score={score} />
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {parte && parte.aportes.length > 0 ? (
                  parte.aportes.map((a) => (
                    <span
                      key={a.requisitoId}
                      title={a.obligatorio ? "Requisito obligatorio" : "Requisito opcional"}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs ring-1 ring-inset",
                        color.chip,
                        a.obligatorio && "font-semibold"
                      )}
                    >
                      {a.nombre}
                      {a.cumple < 1 ? ` (${Math.round(a.cumple * 100)}%)` : ""}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Refuerza requisitos que otro miembro ya cubre.</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {reparto.sinCubrir.length > 0 && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <span className="font-medium">Sin cubrir del todo:</span>{" "}
          {reparto.sinCubrir.map((s) => `${s.nombre}${s.obligatorio ? " (obligatorio)" : ""}`).join(", ")}
        </p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Alianza sugerida a partir de las capacidades declaradas. La homologación y la contratación las define cada operadora.
      </p>
    </article>
  );
}
