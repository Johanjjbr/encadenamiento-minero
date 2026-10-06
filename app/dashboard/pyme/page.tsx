import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, CircleX, Handshake, Layers, Lightbulb, Pickaxe, Trophy } from "lucide-react";
import { AvatarGrupo } from "@/components/features/empresa-avatar";
import { PageHeader } from "@/components/features/page-header";
import { ScoreRing } from "@/components/features/score-ring";
import { StatCard } from "@/components/features/stat-card";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import { formatFecha, formatPorcentaje } from "@/lib/format";
import { parseBrecha } from "@/lib/match";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

interface Alianza {
  id: string;
  cobertura: number;
  socias: { id: string; nombre: string }[];
}

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
  const licIds = Array.from(new Set(lotes.map((l) => l.licitacion_id)));

  const brechaPorLote = new Map<string, ReturnType<typeof parseBrecha>>();
  const alianzasPorLote = new Map<string, Alianza[]>();
  const infoLicitacion = new Map<string, { minera: string | null; cierre: string | null }>();

  if (loteIds.length > 0) {
    const [matchesRes, utesRes, licRes] = await Promise.all([
      supabase.from("matches").select("lote_id, brecha").eq("empresa_id", sesion.empresa.id).in("lote_id", loteIds),
      supabase
        .from("utes_sugeridas")
        .select("id, lote_id, cobertura, miembros:ute_miembros(empresa:empresas(id, nombre))")
        .in("lote_id", loteIds),
      supabase.from("licitaciones").select("id, cierre_el, minera:empresas(nombre)").in("id", licIds),
    ]);
    if (matchesRes.error) return <ErrorState mensaje={matchesRes.error.message} />;
    if (utesRes.error) return <ErrorState mensaje={utesRes.error.message} />;

    for (const m of matchesRes.data ?? []) brechaPorLote.set(m.lote_id, parseBrecha(m.brecha));

    for (const u of utesRes.data ?? []) {
      const socias = u.miembros
        .map((m) => m.empresa)
        .filter((e): e is { id: string; nombre: string } => e !== null && e.id !== sesion.empresa.id);
      // La RLS solo devuelve UTEs donde esta pyme es miembro.
      const lista = alianzasPorLote.get(u.lote_id) ?? [];
      lista.push({ id: u.id, cobertura: Number(u.cobertura), socias });
      alianzasPorLote.set(u.lote_id, lista);
    }

    for (const l of licRes.data ?? []) {
      infoLicitacion.set(l.id, { minera: l.minera?.nombre ?? null, cierre: l.cierre_el });
    }
  }

  const completos = lotes.filter((l) => Number(l.score) >= 100).length;
  const totalAlianzas = Array.from(alianzasPorLote.values()).reduce((a, l) => a + l.length, 0);
  const mejor = lotes.reduce((m, l) => Math.max(m, Number(l.score)), 0);
  // Brechas obligatorias distintas: lo que más conviene cerrar.
  const faltantesObligatorios = Array.from(
    new Set(Array.from(brechaPorLote.values()).flatMap((b) => b.filter((x) => x.obligatorio).map((x) => x.nombre)))
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Hola, ${sesion.empresa.nombre}`}
        titulo="Licitaciones compatibles"
        descripcion="Así calza tu perfil con cada lote abierto de las operadoras. Si te falta algo, completá tu perfil o sumate a una alianza sugerida."
        acciones={
          <Link
            href="/dashboard/pyme/perfil"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
          >
            Mejorar mi perfil <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icono={Layers} etiqueta="Lotes abiertos" valor={lotes.length} detalle="evaluados contra tu perfil" />
        <StatCard icono={Trophy} etiqueta="Tu mejor match" valor={formatPorcentaje(mejor)} detalle={`${completos} lotes cubiertos solo`} />
        <StatCard
          icono={Handshake}
          etiqueta="Alianzas sugeridas"
          valor={totalAlianzas}
          detalle={totalAlianzas > 0 ? "con otras pymes locales" : "por ahora ninguna"}
          destacado={totalAlianzas > 0}
        />
        <StatCard
          icono={Lightbulb}
          etiqueta="Obligatorios que te faltan"
          valor={faltantesObligatorios.length}
          detalle={faltantesObligatorios.slice(0, 2).join(", ") || "¡Ninguno!"}
        />
      </dl>

      {lotes.length === 0 ? (
        <EmptyState
          icono={Pickaxe}
          titulo="No hay lotes abiertos por ahora"
          descripcion="Cuando una operadora publique licitaciones, vas a ver acá qué tan bien calzan con tu empresa."
        />
      ) : (
        <ul className="space-y-5">
          {lotes.map((lote) => {
            const score = Number(lote.score);
            const brecha = brechaPorLote.get(lote.lote_id) ?? [];
            const alianzas = (alianzasPorLote.get(lote.lote_id) ?? []).sort((a, b) => b.cobertura - a.cobertura);
            const info = infoLicitacion.get(lote.licitacion_id);
            return (
              <li key={lote.lote_id} className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                <div className="flex flex-wrap items-start gap-5 p-5">
                  <ScoreRing score={score} size={76} etiqueta="match" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Pickaxe className="size-3.5" aria-hidden />
                        {info?.minera ?? "Operadora"} · {lote.titulo_licitacion}
                      </span>
                      {info?.cierre && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="size-3.5" aria-hidden /> Cierra {formatFecha(info.cierre)}
                        </span>
                      )}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold leading-tight">{lote.titulo_lote}</h2>
                    <p
                      className={cn(
                        "mt-1 inline-flex items-center gap-1.5 text-xs font-medium",
                        lote.cumple_obligatorios ? "text-emerald-700" : "text-rose-700"
                      )}
                    >
                      {lote.cumple_obligatorios ? (
                        <CircleCheck className="size-4" aria-hidden />
                      ) : (
                        <CircleX className="size-4" aria-hidden />
                      )}
                      {lote.cumple_obligatorios ? "Cumplís todos los obligatorios" : "Te falta algún requisito obligatorio"}
                    </p>

                    {brecha.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Te falta</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {brecha.map((b) => (
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
                              {b.cumple > 0 ? ` (${Math.round(b.cumple * 100)}%)` : ""}
                              {b.obligatorio ? " · obligatorio" : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
                        <Trophy className="size-4" aria-hidden /> Tu perfil cubre todos los requisitos de este lote.
                      </p>
                    )}
                  </div>
                </div>

                {alianzas.length > 0 && (
                  <div className="border-t bg-accent/50 px-5 py-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                      <Handshake className="size-4" aria-hidden /> Alianza sugerida
                    </p>
                    <ul className="mt-2 space-y-2">
                      {alianzas.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-3 text-sm">
                          <AvatarGrupo empresas={[{ id: sesion.empresa.id, nombre: sesion.empresa.nombre }, ...a.socias]} />
                          <span>
                            Junto a <span className="font-semibold">{a.socias.map((s) => s.nombre).join(" y ") || "otra pyme"}</span>{" "}
                            pasan de <span className="tabular-nums">{formatPorcentaje(score)}</span> a{" "}
                            <span className="font-semibold tabular-nums text-emerald-700">{formatPorcentaje(a.cobertura)}</span> del lote.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
