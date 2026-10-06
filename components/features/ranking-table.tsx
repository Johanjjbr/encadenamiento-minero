import { MatchBadge } from "@/components/features/match-badge";
import { cn } from "@/lib/utils";
import type { BrechaItem } from "@/lib/match";

export interface FilaRanking {
  empresaId: string;
  nombre: string;
  departamento: string | null;
  score: number;
  cumpleObligatorios: boolean;
  brecha: BrechaItem[];
}

/** Ranking de candidatas de un lote, ordenado por score, con estado de
 *  obligatorios y lo que le falta a cada una. */
export function RankingTable({ filas }: { filas: FilaRanking[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 px-4 py-3">#</th>
            <th scope="col" className="px-4 py-3">Empresa</th>
            <th scope="col" className="px-4 py-3">Match</th>
            <th scope="col" className="px-4 py-3">Obligatorios</th>
            <th scope="col" className="px-4 py-3">Le falta</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filas.map((fila, i) => (
            <tr key={fila.empresaId} className="align-top">
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{fila.nombre}</p>
                <p className="text-xs text-muted-foreground">{fila.departamento ?? "Sin departamento"}</p>
              </td>
              <td className="px-4 py-3">
                <MatchBadge score={fila.score} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    fila.cumpleObligatorios
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300"
                  )}
                >
                  <span aria-hidden>{fila.cumpleObligatorios ? "✓" : "✗"}</span>
                  {fila.cumpleObligatorios ? "Cumple todos" : "Falta alguno"}
                </span>
              </td>
              <td className="px-4 py-3">
                {fila.brecha.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nada: cubre todo el lote</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {fila.brecha.map((b) => (
                      <li
                        key={b.requisitoId}
                        title={b.obligatorio ? "Requisito obligatorio" : "Requisito opcional"}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs ring-1 ring-inset",
                          b.obligatorio
                            ? "bg-rose-50 font-medium text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800"
                            : "bg-muted text-muted-foreground ring-border"
                        )}
                      >
                        {b.nombre}
                        {b.cumple > 0 ? ` (${Math.round(b.cumple * 100)}%)` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
