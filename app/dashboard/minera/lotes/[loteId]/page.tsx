import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Handshake, MapPin, Star, Target, Trophy, Users } from "lucide-react";
import { ActionForm } from "@/components/features/action-form";
import { CategoriaIcon } from "@/components/features/categoria-icon";
import { ComparativaChart, type BarraComparativa } from "@/components/features/comparativa-chart";
import { MapaSanJuan, type DatoDepartamento } from "@/components/features/mapa-san-juan";
import { PageHeader } from "@/components/features/page-header";
import { RankingTable, type FilaRanking } from "@/components/features/ranking-table";
import { StatCard } from "@/components/features/stat-card";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { UteBuilderCard } from "@/components/features/ute-builder-card";
import { requireRol } from "@/lib/auth";
import { cambiarEstadoUte, recalcularLote } from "@/lib/actions/minera";
import { formatPorcentaje } from "@/lib/format";
import { parseAporte, parseBrecha } from "@/lib/match";
import { createClient } from "@/lib/supabase/server";
import type { MiembroUte, RequisitoResumen } from "@/lib/ute";
import { cn } from "@/lib/utils";
import { esUuid } from "@/lib/validation";

const ORDEN_ESTADO = { aceptada: 0, sugerida: 1, rechazada: 2 } as const;

/** Botones para decidir sobre una alianza (aceptar / rechazar / deshacer). */
function AccionesUte({ uteId, loteId, estado }: { uteId: string; loteId: string; estado: keyof typeof ORDEN_ESTADO }) {
  const boton = (siguiente: keyof typeof ORDEN_ESTADO, etiqueta: string, variante: "boton" | "secundario") => (
    <ActionForm
      key={siguiente}
      action={cambiarEstadoUte}
      submitLabel={etiqueta}
      pendingLabel="Guardando…"
      successLabel=""
      variante={variante}
      className="[&>div]:mt-0"
    >
      <input type="hidden" name="uteId" value={uteId} />
      <input type="hidden" name="loteId" value={loteId} />
      <input type="hidden" name="estado" value={siguiente} />
    </ActionForm>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {estado === "sugerida" ? (
        <>
          {boton("rechazada", "Rechazar", "secundario")}
          {boton("aceptada", "Aceptar alianza", "boton")}
        </>
      ) : (
        boton("sugerida", estado === "aceptada" ? "Deshacer aceptación" : "Volver a considerar", "secundario")
      )}
    </div>
  );
}

interface Props {
  params: Promise<{ loteId: string }>;
  searchParams: Promise<{ depto?: string }>;
}

export default async function LotePage({ params, searchParams }: Props) {
  const { loteId } = await params;
  const { depto } = await searchParams;
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
      .select("id, tipo, norma, nivel_minimo, peso, obligatorio, capacidad:catalogo_capacidades(nombre, categoria)")
      .eq("lote_id", loteId)
      .order("obligatorio", { ascending: false })
      .order("peso", { ascending: false }),
    supabase
      .from("matches")
      .select("score, cumple_obligatorios, brecha, empresa:empresas(id, nombre, departamento)")
      .eq("lote_id", loteId),
    supabase
      .from("utes_sugeridas")
      .select("id, score_total, cobertura, estado, miembros:ute_miembros(aporte, empresa:empresas(id, nombre, departamento))")
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
  const pesoTotal = requisitos.reduce((a, r) => a + r.peso, 0);

  const todas: FilaRanking[] = (matchRes.data ?? [])
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

  // Filtro por departamento (desde el mapa).
  const filas = depto ? todas.filter((f) => f.departamento === depto) : todas;

  const scores: Record<string, number> = Object.fromEntries(todas.map((f) => [f.empresaId, f.score]));
  const mejor = todas[0];
  const mejorScore = mejor?.score ?? 0;

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
        estado: u.estado,
        cobertura: Number(u.cobertura),
        miembros,
        scoreIndividual: miembros.reduce((acc, m) => acc + (scores[m.empresaId] ?? 0), 0),
      };
    })
    // Más puntaje primero; a igual puntaje, la alianza de miembros más fuertes.
    // Aceptadas primero, rechazadas al final; dentro de cada grupo, más puntaje
    // primero y, a igual puntaje, la alianza de miembros más fuertes.
    .sort(
      (a, b) =>
        ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
        b.score_total - a.score_total ||
        b.scoreIndividual - a.scoreIndividual
    );

  const recomendada = utes.find((u) => u.estado !== "rechazada");
  const hayAceptada = utes.some((u) => u.estado === "aceptada");
  const hrefEmpresa = (empresaId: string) => `/dashboard/minera/empresas/${empresaId}?desde=${loteId}`;
  const miembrosRecomendada = recomendada?.miembros.map((m) => m.empresaId) ?? [];

  // Gráfico: top 5 pymes solas + la alianza recomendada.
  const barras: BarraComparativa[] = [
    ...todas.slice(0, 5).map((f) => ({
      id: f.empresaId,
      etiqueta: f.nombre,
      valor: f.score,
      tipo: "pyme" as const,
      detalle: f.cumpleObligatorios ? "cumple obligatorios" : "le falta algún obligatorio",
    })),
    ...(recomendada
      ? [
          {
            id: recomendada.id,
            etiqueta: `UTE: ${recomendada.miembros.map((m) => m.nombre.split(" ")[0]).join(" + ")}`,
            valor: recomendada.cobertura,
            tipo: "ute" as const,
            detalle: `${recomendada.miembros.length} miembros`,
          },
        ]
      : []),
  ];

  // Mapa: candidatas con algún aporte (score > 0) por departamento.
  const porDepto: Record<string, DatoDepartamento> = {};
  for (const f of todas) {
    if (!f.departamento || f.score <= 0) continue;
    const d = (porDepto[f.departamento] ??= { cantidad: 0, nombres: [] });
    d.cantidad += 1;
    d.nombres!.push(`${f.nombre} (${Math.round(f.score)}%)`);
  }
  const base = `/dashboard/minera/lotes/${loteId}`;

  return (
    <div className="space-y-8">
      <nav aria-label="Ruta" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard/minera" className="hover:text-foreground hover:underline">
          Licitaciones
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate">{lote.licitacion.titulo}</span>
      </nav>

      <PageHeader
        eyebrow={`Lote · licitación ${lote.licitacion.estado}`}
        titulo={lote.titulo}
        descripcion={`${requisitos.length} requisitos · ${requisitos.filter((r) => r.obligatorio).length} obligatorios · ${todas.length} pymes evaluadas`}
        acciones={
          <ActionForm
            action={recalcularLote}
            submitLabel="Recalcular ranking y UTEs"
            pendingLabel="Recalculando…"
            successLabel="Actualizado ✓"
            variante="secundario"
            className="[&>div]:mt-0"
          >
            <input type="hidden" name="loteId" value={loteId} />
          </ActionForm>
        }
      />

      <dl className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icono={Trophy}
          etiqueta="Mejor pyme sola"
          valor={mejor ? formatPorcentaje(mejorScore) : "—"}
          detalle={mejor ? `${mejor.nombre}${mejor.cumpleObligatorios ? "" : " · le falta algún obligatorio"}` : "Sin calcular"}
        />
        <StatCard
          icono={Handshake}
          etiqueta={hayAceptada ? "Alianza aceptada" : "Mejor alianza (UTE)"}
          valor={recomendada ? formatPorcentaje(recomendada.cobertura) : "—"}
          detalle={
            recomendada
              ? `+${Math.round(recomendada.cobertura - mejorScore)} puntos vs. la mejor sola`
              : mejorScore >= 100
                ? "No hace falta: una pyme cubre todo"
                : "Sin alianza que mejore"
          }
          destacado={Boolean(recomendada)}
        />
        <StatCard
          icono={Users}
          etiqueta="Candidatas con aporte"
          valor={todas.filter((f) => f.score > 0).length}
          detalle={`de ${todas.length} pymes evaluadas`}
        />
      </dl>

      <section aria-labelledby="titulo-requisitos" className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 id="titulo-requisitos" className="flex items-center gap-2 font-semibold">
          <Target className="size-4 text-primary" aria-hidden /> Requisitos del lote
        </h2>
        {reqRes.error ? (
          <ErrorState mensaje={reqRes.error.message} />
        ) : (reqRes.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Este lote todavía no tiene requisitos cargados.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(reqRes.data ?? []).map((r) => (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                  r.obligatorio ? "border-primary/30 bg-accent/40" : "bg-background/60"
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <CategoriaIcon categoria={r.tipo === "norma" ? "norma" : r.capacidad?.categoria} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                    <span className="truncate">{r.capacidad?.nombre ?? r.norma}</span>
                    {r.obligatorio && <Star className="size-3.5 shrink-0 fill-primary text-primary" aria-label="Obligatorio" />}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.tipo === "capacidad" ? `Nivel ${r.nivel_minimo}+` : "Certificación"} · peso {r.peso}
                    {pesoTotal > 0 ? ` (${Math.round((r.peso / pesoTotal) * 100)}%)` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-utes" className="space-y-4">
        <h2 id="titulo-utes" className="flex items-center gap-2 text-lg font-semibold">
          <Handshake className="size-5 text-primary" aria-hidden /> Alianzas sugeridas (UTE)
        </h2>
        {utes.length > 0 && (
          <p className="-mt-2 text-sm text-muted-foreground">
            Aceptá la alianza que prefieras: las pymes miembro la ven marcada como aceptada en su panel. Las decididas no
            se pierden al recalcular.
          </p>
        )}
        {errUte ? (
          <ErrorState mensaje={errUte.message} />
        ) : utes.length > 0 ? (
          <div className="space-y-4">
            {utes.map((ute, i) => (
              <UteBuilderCard
                key={ute.id}
                ute={ute}
                miembros={ute.miembros}
                requisitos={requisitos}
                scores={scores}
                destacada={i === 0 && !hayAceptada}
                estado={ute.estado}
                hrefEmpresa={hrefEmpresa}
                acciones={<AccionesUte uteId={ute.id} loteId={loteId} estado={ute.estado} />}
              />
            ))}
          </div>
        ) : todas.length === 0 ? (
          <EmptyState
            titulo="Sin datos todavía"
            descripcion="Calculá el ranking para ver las candidatas y las alianzas posibles."
          />
        ) : mejorScore >= 100 ? (
          <EmptyState
            icono={Trophy}
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

      {todas.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Solas vs. en alianza</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Porcentaje del lote que cubre cada pyme por su cuenta, comparado con la alianza recomendada.
            </p>
            <ComparativaChart barras={barras} />
            {recomendada && mejor && (
              <p className="mt-5 rounded-xl bg-accent/60 p-4 text-sm text-accent-foreground">
                Ninguna pyme llega sola: la mejor cubre el {formatPorcentaje(mejorScore)}. En alianza,{" "}
                <span className="font-semibold">{recomendada.miembros.map((m) => m.nombre).join(" y ")}</span> cubren el{" "}
                <span className="font-semibold">{formatPorcentaje(recomendada.cobertura)}</span> del lote
                {recomendada.cobertura >= 100 ? ", incluidos todos los requisitos obligatorios" : ""}.
              </p>
            )}
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="size-4 text-primary" aria-hidden /> Dónde están las candidatas
            </h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">Tocá un departamento para filtrar el ranking.</p>
            <MapaSanJuan
              datos={porDepto}
              activo={depto}
              mina={sesion.empresa.departamento}
              hrefFiltro={(d) => `${base}?depto=${encodeURIComponent(d)}#ranking`}
              hrefLimpiar={`${base}#ranking`}
            />
          </section>
        </div>
      )}

      <section id="ranking" aria-labelledby="titulo-ranking" className="scroll-mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-ranking" className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-5 text-primary" aria-hidden /> Ranking de candidatas
          </h2>
          {depto && (
            <Link
              href={`${base}#ranking`}
              scroll={false}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/70"
            >
              <MapPin className="size-3.5" aria-hidden /> {depto} · quitar filtro ✕
            </Link>
          )}
        </div>
        {matchRes.error ? (
          <ErrorState mensaje={matchRes.error.message} />
        ) : todas.length === 0 ? (
          <EmptyState
            titulo="No hay candidatas calculadas"
            descripcion="Usá «Recalcular ranking y UTEs» para evaluar a las pymes contra este lote."
          />
        ) : filas.length === 0 ? (
          <EmptyState icono={MapPin} titulo={`Sin candidatas en ${depto}`} descripcion="Probá con otro departamento." />
        ) : (
          <RankingTable filas={filas} miembrosUte={miembrosRecomendada} hrefEmpresa={hrefEmpresa} />
        )}
      </section>
    </div>
  );
}
