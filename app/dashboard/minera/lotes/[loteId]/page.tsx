import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/features/action-form";
import { MatchBadge } from "@/components/features/match-badge";
import { RankingTable, type FilaRanking } from "@/components/features/ranking-table";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { UteBuilderCard } from "@/components/features/ute-builder-card";
import { requireRol } from "@/lib/auth";
import { recalcularLote } from "@/lib/actions/minera";
import { parseAporte, parseBrecha } from "@/lib/match";
import { createClient } from "@/lib/supabase/server";
import type { MiembroUte, RequisitoResumen } from "@/lib/ute";
import { esUuid } from "@/lib/validation";

interface Props {
  params: Promise<{ loteId: string }>;
}

export default async function LotePage({ params }: Props) {
  const { loteId } = await params;
  if (!esUuid(loteId)) notFound();

  const sesion = await requireRol("minera");
  const supabase = await createClient();

  const [loteRes, reqRes, matchRes, uteRes] = await Promise.all([
    supabase
      .from("lotes")
      .select("id, titulo, licitacion:licitaciones(id, titulo, estado, minera_id)")
      .eq("id", loteId)
      .maybeSingle(),
    supabase
      .from("lote_requisitos")
      .select("id, tipo, norma, nivel_minimo, peso, obligatorio, capacidad:catalogo_capacidades(nombre)")
      .eq("lote_id", loteId)
      .order("obligatorio", { ascending: false })
      .order("peso", { ascending: false }),
    supabase
      .from("matches")
      .select("score, cumple_obligatorios, brecha, empresa:empresas(id, nombre, departamento)")
      .eq("lote_id", loteId),
    supabase
      .from("utes_sugeridas")
      .select("id, score_total, cobertura, miembros:ute_miembros(aporte, empresa:empresas(id, nombre, departamento))")
      .eq("lote_id", loteId),
  ]);

  const lote = loteRes.data;
  // Las licitaciones abiertas son legibles por cualquier usuario: la propiedad se valida acá.
  if (!lote || !lote.licitacion || lote.licitacion.minera_id !== sesion.empresa.id) notFound();

  // Un fallo en una consulta no debe tirar toda la página: cada sección muestra su propio error.
  const errUte = uteRes.error ?? matchRes.error;

  const requisitos: RequisitoResumen[] = (reqRes.data ?? []).map((r) => ({
    id: r.id,
    nombre: r.capacidad?.nombre ?? r.norma ?? "Requisito",
    peso: r.peso,
    obligatorio: r.obligatorio,
  }));

  const filas: FilaRanking[] = (matchRes.data ?? [])
    .filter((m) => m.empresa !== null)
    .map((m) => ({
      empresaId: m.empresa!.id,
      nombre: m.empresa!.nombre,
      departamento: m.empresa!.departamento,
      score: Number(m.score),
      cumpleObligatorios: m.cumple_obligatorios,
      brecha: parseBrecha(m.brecha),
    }))
    .sort((a, b) => b.score - a.score || a.nombre.localeCompare(b.nombre, "es"));

  const scores: Record<string, number> = Object.fromEntries(filas.map((f) => [f.empresaId, f.score]));
  const mejorScore = filas[0]?.score ?? 0;

  const utes = (uteRes.data ?? [])
    .map((u) => {
      const miembros: MiembroUte[] = u.miembros
        .filter((m) => m.empresa !== null)
        .map((m) => ({
          empresaId: m.empresa!.id,
          nombre: m.empresa!.nombre,
          departamento: m.empresa!.departamento,
          aporte: parseAporte(m.aporte),
        }))
        // El miembro más fuerte primero (colores y desempates estables).
        .sort((a, b) => (scores[b.empresaId] ?? 0) - (scores[a.empresaId] ?? 0));
      return {
        id: u.id,
        score_total: Number(u.score_total),
        cobertura: Number(u.cobertura),
        miembros,
        scoreIndividual: miembros.reduce((acc, m) => acc + (scores[m.empresaId] ?? 0), 0),
      };
    })
    // Más puntaje primero; a igual puntaje, la alianza de miembros más fuertes.
    .sort((a, b) => b.score_total - a.score_total || b.scoreIndividual - a.scoreIndividual);

  return (
    <div className="space-y-8">
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link href="/dashboard/minera" className="hover:text-foreground hover:underline">
          Licitaciones
        </Link>
        <span aria-hidden> › </span>
        <span>{lote.licitacion.titulo}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lote.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filas.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                Mejor candidata individual <MatchBadge score={mejorScore} />
              </span>
            ) : (
              "Todavía no se calculó el ranking de este lote."
            )}
          </p>
        </div>
        <ActionForm
          action={recalcularLote}
          submitLabel="Recalcular ranking y UTEs"
          pendingLabel="Recalculando…"
          successLabel="Actualizado ✓"
          variante="secundario"
        >
          <input type="hidden" name="loteId" value={loteId} />
        </ActionForm>
      </header>

      <section aria-labelledby="titulo-requisitos">
        <h2 id="titulo-requisitos" className="text-lg font-semibold">
          Requisitos del lote
        </h2>
        {reqRes.error ? (
          <ErrorState mensaje={reqRes.error.message} />
        ) : (reqRes.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Este lote todavía no tiene requisitos cargados.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {(reqRes.data ?? []).map((r) => (
              <li
                key={r.id}
                className="rounded-lg border bg-card px-3 py-1.5 text-sm"
                title={`Peso ${r.peso} de 10${r.obligatorio ? " · obligatorio" : ""}`}
              >
                <span className={r.obligatorio ? "font-semibold" : ""}>{r.capacidad?.nombre ?? r.norma}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.tipo === "capacidad" ? `nivel ${r.nivel_minimo}+ · ` : ""}peso {r.peso}
                  {r.obligatorio ? " · obligatorio" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-utes" className="space-y-3">
        <h2 id="titulo-utes" className="text-lg font-semibold">
          Alianzas sugeridas (UTE)
        </h2>
        {errUte ? (
          <ErrorState mensaje={errUte.message} />
        ) : utes.length > 0 ? (
          <div className="space-y-4">
            {utes.map((ute) => (
              <UteBuilderCard
                key={ute.id}
                ute={ute}
                miembros={ute.miembros}
                requisitos={requisitos}
                scores={scores}
              />
            ))}
          </div>
        ) : filas.length === 0 ? (
          <EmptyState
            titulo="Sin datos todavía"
            descripcion="Calculá el ranking para ver las candidatas y las alianzas posibles."
          />
        ) : mejorScore >= 100 ? (
          <EmptyState
            titulo="No hace falta una UTE"
            descripcion="Al menos una pyme cubre este lote completo por sí sola."
          />
        ) : (
          <EmptyState
            titulo="Ninguna combinación mejora a la mejor candidata"
            descripcion="Con las pymes que aceptan UTE hoy no hay una alianza que cubra más que la mejor pyme individual."
          />
        )}
      </section>

      <section aria-labelledby="titulo-ranking" className="space-y-3">
        <h2 id="titulo-ranking" className="text-lg font-semibold">
          Ranking de candidatas
        </h2>
        {matchRes.error ? (
          <ErrorState mensaje={matchRes.error.message} />
        ) : filas.length === 0 ? (
          <EmptyState
            titulo="No hay candidatas calculadas"
            descripcion="Usá «Recalcular ranking y UTEs» para evaluar a las pymes contra este lote."
          />
        ) : (
          <RankingTable filas={filas} />
        )}
      </section>
    </div>
  );
}
