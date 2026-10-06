import Link from "next/link";
import { MatchBadge } from "@/components/features/match-badge";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import { formatPorcentaje } from "@/lib/format";
import { parseBrecha } from "@/lib/match";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function PymeInicio() {
  const sesion = await requireRol("pyme");
  const supabase = await createClient();

  // Recalcula y devuelve el match de esta pyme en cada lote abierto: al cambiar
  // una capacidad en "Mi perfil", el score se actualiza al volver acá.
  const { data: compatibles, error } = await supabase.rpc("licitaciones_compatibles", {
    p_empresa_id: sesion.empresa.id,
  });
  if (error) return <ErrorState mensaje={error.message} />;

  const lotes = compatibles ?? [];
  const loteIds = lotes.map((l) => l.lote_id);

  const brechaPorLote = new Map<string, ReturnType<typeof parseBrecha>>();
  const alianzasPorLote = new Map<string, { id: string; cobertura: number; socias: string[] }[]>();

  if (loteIds.length > 0) {
    const [matchesRes, utesRes] = await Promise.all([
      supabase.from("matches").select("lote_id, brecha").eq("empresa_id", sesion.empresa.id).in("lote_id", loteIds),
      supabase
        .from("utes_sugeridas")
        .select("id, lote_id, cobertura, miembros:ute_miembros(empresa:empresas(id, nombre))")
        .in("lote_id", loteIds),
    ]);
    if (matchesRes.error) return <ErrorState mensaje={matchesRes.error.message} />;
    if (utesRes.error) return <ErrorState mensaje={utesRes.error.message} />;

    for (const m of matchesRes.data ?? []) brechaPorLote.set(m.lote_id, parseBrecha(m.brecha));

    for (const u of utesRes.data ?? []) {
      const socias = u.miembros
        .map((m) => m.empresa)
        .filter((e): e is { id: string; nombre: string } => e !== null && e.id !== sesion.empresa.id)
        .map((e) => e.nombre);
      // La RLS solo devuelve UTEs donde esta pyme es miembro.
      const lista = alianzasPorLote.get(u.lote_id) ?? [];
      lista.push({ id: u.id, cobertura: Number(u.cobertura), socias });
      alianzasPorLote.set(u.lote_id, lista);
    }
  }

  const completos = lotes.filter((l) => Number(l.score) >= 100).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Licitaciones compatibles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Así calza el perfil de {sesion.empresa.nombre} con cada lote abierto. Si te falta algo, podés{" "}
          <Link href="/dashboard/pyme/perfil" className="font-medium text-foreground underline underline-offset-2">
            completar tu perfil
          </Link>{" "}
          o sumarte a una alianza.
        </p>
      </header>

      {lotes.length === 0 ? (
        <EmptyState
          titulo="No hay lotes abiertos por ahora"
          descripcion="Cuando una operadora publique licitaciones, vas a ver acá qué tan bien calzan con tu empresa."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {completos === 0
              ? "Ningún lote queda cubierto del todo por tu empresa sola."
              : `Cubrís ${completos} ${completos === 1 ? "lote completo" : "lotes completos"} por tu cuenta.`}
          </p>

          <ul className="space-y-4">
            {lotes.map((lote) => {
              const score = Number(lote.score);
              const brecha = brechaPorLote.get(lote.lote_id) ?? [];
              const alianzas = alianzasPorLote.get(lote.lote_id) ?? [];
              return (
                <li key={lote.lote_id} className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{lote.titulo_licitacion}</p>
                      <h2 className="text-lg font-semibold">{lote.titulo_lote}</h2>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <MatchBadge score={score} className="text-base" />
                      <span
                        className={cn(
                          "text-xs font-medium",
                          lote.cumple_obligatorios
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-rose-700 dark:text-rose-300"
                        )}
                      >
                        {lote.cumple_obligatorios ? "✓ Cumple los obligatorios" : "✗ Te falta algún obligatorio"}
                      </span>
                    </div>
                  </div>

                  {brecha.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Te falta:</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {brecha.map((b) => (
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
                            {b.obligatorio ? " · obligatorio" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
                      Tu perfil cubre todos los requisitos de este lote.
                    </p>
                  )}

                  {alianzas.length > 0 && (
                    <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
                      <p className="font-medium">Alianza sugerida</p>
                      <ul className="mt-1 space-y-0.5">
                        {alianzas.map((a) => (
                          <li key={a.id}>
                            Junto a <span className="font-medium">{a.socias.join(" y ") || "otra pyme"}</span> podrían cubrir el{" "}
                            {formatPorcentaje(a.cobertura)} del lote.
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
