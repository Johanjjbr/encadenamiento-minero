import Link from "next/link";
import { ActionForm } from "@/components/features/action-form";
import { MatchBadge } from "@/components/features/match-badge";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import { cambiarEstadoLicitacion } from "@/lib/actions/minera";
import { formatFecha } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** Acción disponible según el estado actual: solo las abiertas son visibles para las pymes. */
const ACCION_ESTADO = {
  borrador: { etiqueta: "Publicar", siguiente: "abierta" },
  abierta: { etiqueta: "Cerrar", siguiente: "cerrada" },
  cerrada: { etiqueta: "Reabrir", siguiente: "abierta" },
} as const;

export default async function MineraInicio() {
  const sesion = await requireRol("minera");
  const supabase = await createClient();

  const { data: licitaciones, error } = await supabase
    .from("licitaciones")
    .select("id, titulo, descripcion, estado, cierre_el, lotes(id, titulo)")
    .eq("minera_id", sesion.empresa.id)
    .order("creada_en", { ascending: false });

  if (error) return <ErrorState mensaje={error.message} />;

  const lotes = (licitaciones ?? []).flatMap((l) => l.lotes);
  const loteIds = lotes.map((l) => l.id);

  // Resumen por lote: mejor candidata y cantidad de UTEs sugeridas.
  const mejorScore = new Map<string, number>();
  const utesPorLote = new Map<string, number>();

  if (loteIds.length > 0) {
    const [matchesRes, utesRes] = await Promise.all([
      supabase.from("matches").select("lote_id, score").in("lote_id", loteIds),
      supabase.from("utes_sugeridas").select("lote_id").in("lote_id", loteIds),
    ]);
    if (matchesRes.error) return <ErrorState mensaje={matchesRes.error.message} />;
    if (utesRes.error) return <ErrorState mensaje={utesRes.error.message} />;

    for (const m of matchesRes.data ?? []) {
      const score = Number(m.score);
      if (score > (mejorScore.get(m.lote_id) ?? -1)) mejorScore.set(m.lote_id, score);
    }
    for (const u of utesRes.data ?? []) {
      utesPorLote.set(u.lote_id, (utesPorLote.get(u.lote_id) ?? 0) + 1);
    }
  }

  const totalUtes = Array.from(utesPorLote.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Licitaciones y candidatas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada licitación se divide en lotes. Entrá a un lote para ver el ranking de pymes y las alianzas sugeridas.
          </p>
        </div>
        <Link
          href="/dashboard/minera/nueva"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          + Nueva licitación
        </Link>
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { etiqueta: "Licitaciones", valor: licitaciones?.length ?? 0 },
          { etiqueta: "Lotes", valor: lotes.length },
          { etiqueta: "UTEs sugeridas", valor: totalUtes },
        ].map((dato) => (
          <div key={dato.etiqueta} className="rounded-xl border bg-card p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{dato.etiqueta}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{dato.valor}</dd>
          </div>
        ))}
      </dl>

      {(licitaciones ?? []).length === 0 ? (
        <EmptyState
          titulo="Todavía no publicaste licitaciones"
          descripcion="Cuando cargues una licitación dividida en lotes, vas a ver acá el ranking de pymes candidatas."
        >
          <Link
            href="/dashboard/minera/nueva"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Publicar la primera
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {(licitaciones ?? []).map((lic) => (
            <section key={lic.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{lic.titulo}</h2>
                  {lic.descripcion && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{lic.descripcion}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-medium capitalize text-foreground">{lic.estado}</p>
                  <p>Cierre: {formatFecha(lic.cierre_el)}</p>
                  <ActionForm
                    action={cambiarEstadoLicitacion}
                    variante="secundario"
                    submitLabel={ACCION_ESTADO[lic.estado].etiqueta}
                    pendingLabel="Actualizando…"
                    successLabel="Listo ✓"
                    className="mt-1 [&>div]:mt-2 [&>div]:justify-end"
                  >
                    <input type="hidden" name="licitacionId" value={lic.id} />
                    <input type="hidden" name="estado" value={ACCION_ESTADO[lic.estado].siguiente} />
                  </ActionForm>
                </div>
              </div>

              <ul className="mt-4 divide-y rounded-lg border">
                {lic.lotes.map((lote) => {
                  const mejor = mejorScore.get(lote.id);
                  const utes = utesPorLote.get(lote.id) ?? 0;
                  return (
                    <li key={lote.id}>
                      <Link
                        href={`/dashboard/minera/lotes/${lote.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <span className="font-medium">{lote.titulo}</span>
                        <span className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {mejor !== undefined ? (
                            <span className="flex items-center gap-1.5">
                              Mejor candidata <MatchBadge score={mejor} />
                            </span>
                          ) : (
                            <span>Sin calcular</span>
                          )}
                          <span>{utes === 0 ? "Sin UTE" : utes === 1 ? "1 UTE sugerida" : `${utes} UTEs sugeridas`}</span>
                          <span aria-hidden>→</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
