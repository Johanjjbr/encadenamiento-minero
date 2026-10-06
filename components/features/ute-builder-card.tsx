import { Handshake, Info } from "lucide-react";
import { CoverageBar } from "@/components/features/coverage-bar";
import { EmpresaAvatar } from "@/components/features/empresa-avatar";
import { MatchBadge } from "@/components/features/match-badge";
import { ScoreRing } from "@/components/features/score-ring";
import { cn } from "@/lib/utils";
import { formatPorcentaje } from "@/lib/format";
import { repartirCobertura, type MiembroUte, type RequisitoResumen } from "@/lib/ute";

// Colores de identidad de cada miembro, en orden fijo (validados para
// daltonismo entre vecinos): cobre, azul, verde. El nombre va siempre al lado.
export const COLORES_MIEMBRO = [
  {
    barra: "bg-[#c0622a]",
    chip: "bg-orange-50 text-orange-950 ring-orange-200",
  },
  {
    barra: "bg-[#2a7fbf]",
    chip: "bg-sky-50 text-sky-950 ring-sky-200",
  },
  {
    barra: "bg-[#4f9a3a]",
    chip: "bg-lime-50 text-lime-950 ring-lime-200",
  },
] as const;

interface Props {
  ute: { id: string; score_total: number; cobertura: number };
  miembros: MiembroUte[];
  requisitos: RequisitoResumen[];
  /** Score individual de cada miembro en este lote (por empresa_id). */
  scores: Record<string, number>;
  /** Primera sugerencia (la más sólida): se destaca. */
  destacada?: boolean;
}

/** UTE Builder: qué pymes forman la alianza, qué aporta cada una y cuánto
 *  del lote cubren juntas. */
export function UteBuilderCard({ ute, miembros, requisitos, scores, destacada = false }: Props) {
  const reparto = repartirCobertura(requisitos, miembros);
  const completa = ute.cobertura >= 100;
  const mejorSola = Math.max(0, ...miembros.map((m) => scores[m.empresaId] ?? 0));

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        destacada && "border-primary/40 ring-1 ring-primary/20"
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-gradient-to-r from-accent/70 to-card p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Handshake className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {destacada ? "Alianza recomendada" : "Alianza alternativa"}
            </p>
            <h3 className="text-lg font-semibold leading-tight">{miembros.map((m) => m.nombre).join(" + ")}</h3>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-muted-foreground">
            <p>
              Mejor sola <span className="font-semibold text-foreground tabular-nums">{formatPorcentaje(mejorSola)}</span>
            </p>
            <p>
              Juntas{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  completa ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {formatPorcentaje(ute.cobertura)}
              </span>
            </p>
            <p title="Cobertura menos 5 puntos por cada miembro extra">Puntaje {Math.round(ute.score_total)}</p>
          </div>
          <ScoreRing score={ute.cobertura} size={68} etiqueta="cobertura" />
        </div>
      </header>

      <div className="p-5">
        <CoverageBar
          total={ute.cobertura}
          segmentos={reparto.miembros.map((rm, i) => ({
            etiqueta: miembros.find((m) => m.empresaId === rm.empresaId)?.nombre ?? "Miembro",
            valor: rm.puntos,
            clase: COLORES_MIEMBRO[i % COLORES_MIEMBRO.length].barra,
          }))}
        />

        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {miembros.map((m, i) => {
            const color = COLORES_MIEMBRO[i % COLORES_MIEMBRO.length];
            const parte = reparto.miembros.find((rm) => rm.empresaId === m.empresaId);
            const score = scores[m.empresaId];
            return (
              <li key={m.empresaId} className="rounded-xl border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="relative">
                      <EmpresaAvatar id={m.empresaId} nombre={m.nombre} />
                      <span
                        className={cn("absolute -bottom-1 -right-1 size-3 rounded-full ring-2 ring-card", color.barra)}
                        aria-hidden
                      />
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{m.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.departamento ?? "Sin departamento"} · aporta{" "}
                        <span className="font-semibold text-foreground">{formatPorcentaje(parte?.puntos ?? 0)}</span>
                      </p>
                    </div>
                  </div>
                  {score !== undefined && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      Sola <MatchBadge score={score} />
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
                        {a.obligatorio ? " ★" : ""}
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
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <span className="font-medium">Sin cubrir del todo:</span>{" "}
            {reparto.sinCubrir.map((s) => `${s.nombre}${s.obligatorio ? " (obligatorio)" : ""}`).join(", ")}
          </p>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          ★ = requisito obligatorio. Alianza sugerida a partir de capacidades declaradas; la homologación y la
          contratación las define cada operadora.
        </p>
      </div>
    </article>
  );
}
