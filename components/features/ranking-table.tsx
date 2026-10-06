import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { EmpresaAvatar } from "@/components/features/empresa-avatar";
import { MatchBadge } from "@/components/features/match-badge";
import { cn } from "@/lib/utils";
import { nivelScore } from "@/lib/format";
import type { BrechaItem } from "@/lib/match";

export interface FilaRanking {
  empresaId: string;
  nombre: string;
  departamento: string | null;
  score: number;
  cumpleObligatorios: boolean;
  brecha: BrechaItem[];
}

const BARRA = { alto: "bg-emerald-600", medio: "bg-amber-500", bajo: "bg-rose-400" } as const;

/** Ranking de candidatas de un lote, ordenado por score, con estado de
 *  obligatorios y lo que le falta a cada una. */
export function RankingTable({
  filas,
  miembrosUte = [],
  hrefEmpresa,
}: {
  filas: FilaRanking[];
  miembrosUte?: string[];
  /** Si se pasa, el nombre de cada empresa lleva a su ficha. */
  hrefEmpresa?: (empresaId: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="w-12 px-4 py-3">#</th>
            <th scope="col" className="px-4 py-3">Empresa</th>
            <th scope="col" className="w-48 px-4 py-3">Match</th>
            <th scope="col" className="px-4 py-3">Obligatorios</th>
            <th scope="col" className="px-4 py-3">Le falta</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filas.map((fila, i) => (
            <tr key={fila.empresaId} className="align-top transition-colors hover:bg-muted/40">
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums",
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <EmpresaAvatar id={fila.empresaId} nombre={fila.nombre} />
                  <div>
                    <p className="font-medium leading-tight">
                      {hrefEmpresa ? (
                        <Link href={hrefEmpresa(fila.empresaId)} className="hover:text-primary hover:underline">
                          {fila.nombre}
                        </Link>
                      ) : (
                        fila.nombre
                      )}
                      {miembrosUte.includes(fila.empresaId) && (
                        <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                          En UTE
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{fila.departamento ?? "Sin departamento"}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <MatchBadge score={fila.score} />
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className={cn("block h-full rounded-r-[4px]", BARRA[nivelScore(fila.score)])}
                      style={{ width: `${Math.max(1, Math.min(100, fila.score))}%` }}
                    />
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    fila.cumpleObligatorios ? "text-emerald-700" : "text-rose-700"
                  )}
                >
                  {fila.cumpleObligatorios ? (
                    <CircleCheck className="size-4" aria-hidden />
                  ) : (
                    <CircleX className="size-4" aria-hidden />
                  )}
                  {fila.cumpleObligatorios ? "Cumple todos" : "Falta alguno"}
                </span>
              </td>
              <td className="px-4 py-3.5">
                {fila.brecha.length === 0 ? (
                  <span className="text-xs text-emerald-700">Cubre todo el lote</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {fila.brecha.map((b) => (
                      <li
                        key={b.requisitoId}
                        title={b.obligatorio ? "Requisito obligatorio" : "Requisito opcional"}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs ring-1 ring-inset",
                          b.obligatorio
                            ? "bg-rose-50 font-medium text-rose-800 ring-rose-200"
                            : "bg-muted text-muted-foreground ring-border"
                        )}
                      >
                        {b.nombre}
                        {b.obligatorio ? " ★" : ""}
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
