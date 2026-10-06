import Link from "next/link";
import { CalendarClock, ChevronRight, FileText, Handshake, Layers, MapPin, Plus, Users } from "lucide-react";
import { ActionForm } from "@/components/features/action-form";
import { MapaSanJuan, type DatoDepartamento } from "@/components/features/mapa-san-juan";
import { PageHeader } from "@/components/features/page-header";
import { ScoreRing } from "@/components/features/score-ring";
import { StatCard } from "@/components/features/stat-card";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import { cambiarEstadoLicitacion, eliminarLicitacion } from "@/lib/actions/minera";
import { formatFecha, formatPorcentaje } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/** Acción disponible según el estado actual: solo las abiertas son visibles para las pymes. */
const ACCION_ESTADO = {
  borrador: { etiqueta: "Publicar", siguiente: "abierta" },
  abierta: { etiqueta: "Cerrar", siguiente: "cerrada" },
  cerrada: { etiqueta: "Reabrir", siguiente: "abierta" },
} as const;

const ESTILO_ESTADO = {
  borrador: "bg-muted text-muted-foreground ring-border",
  abierta: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cerrada: "bg-stone-100 text-stone-700 ring-stone-300",
} as const;

const formatMonto = (monto: number | null) =>
  monto === null
    ? null
    : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", notation: "compact", maximumFractionDigits: 1 }).format(monto);

export default async function MineraInicio() {
  const sesion = await requireRol("minera");
  const supabase = await createClient();

  const [licRes, pymesRes] = await Promise.all([
    supabase
      .from("licitaciones")
      .select("id, titulo, descripcion, estado, cierre_el, lotes(id, titulo, monto_estimado)")
      .eq("minera_id", sesion.empresa.id)
      .order("creada_en", { ascending: false }),
    // La RLS devuelve las pymes que aceptan UTE o que ya aparecen en mis lotes.
    supabase.from("empresas").select("id, nombre, departamento").eq("tipo", "PYME"),
  ]);

  if (licRes.error) return <ErrorState mensaje={licRes.error.message} />;
  const licitaciones = licRes.data ?? [];

  const lotes = licitaciones.flatMap((l) => l.lotes);
  const loteIds = lotes.map((l) => l.id);

  // Resumen por lote: mejor candidata individual y mejor UTE sugerida.
  const mejorScore = new Map<string, number>();
  const candidatas = new Map<string, number>();
  const mejorUte = new Map<string, { cobertura: number; cantidad: number; aceptada: boolean }>();

  if (loteIds.length > 0) {
    const [matchesRes, utesRes] = await Promise.all([
      supabase.from("matches").select("lote_id, score").in("lote_id", loteIds),
      supabase.from("utes_sugeridas").select("lote_id, cobertura, estado").in("lote_id", loteIds).neq("estado", "rechazada"),
    ]);
    if (matchesRes.error) return <ErrorState mensaje={matchesRes.error.message} />;
    if (utesRes.error) return <ErrorState mensaje={utesRes.error.message} />;

    for (const m of matchesRes.data ?? []) {
      const score = Number(m.score);
      if (score > (mejorScore.get(m.lote_id) ?? -1)) mejorScore.set(m.lote_id, score);
      if (score > 0) candidatas.set(m.lote_id, (candidatas.get(m.lote_id) ?? 0) + 1);
    }
    for (const u of utesRes.data ?? []) {
      const previa = mejorUte.get(u.lote_id);
      mejorUte.set(u.lote_id, {
        cobertura: Math.max(previa?.cobertura ?? 0, Number(u.cobertura)),
        cantidad: (previa?.cantidad ?? 0) + 1,
        aceptada: (previa?.aceptada ?? false) || u.estado === "aceptada",
      });
    }
  }

  const totalUtes = Array.from(mejorUte.values()).reduce((a, u) => a + u.cantidad, 0);
  const abiertas = licitaciones.filter((l) => l.estado === "abierta").length;
  const lotesCubiertos = loteIds.filter(
    (id) => (mejorScore.get(id) ?? 0) >= 100 || (mejorUte.get(id)?.cobertura ?? 0) >= 100
  ).length;

  const pymes = pymesRes.data ?? [];
  const porDepto: Record<string, DatoDepartamento> = {};
  for (const p of pymes) {
    if (!p.departamento) continue;
    const d = (porDepto[p.departamento] ??= { cantidad: 0, nombres: [] });
    d.cantidad += 1;
    d.nombres!.push(p.nombre);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={sesion.empresa.nombre}
        titulo="Licitaciones y candidatas"
        descripcion="Cada licitación se divide en lotes. Entrá a un lote para ver el ranking de pymes locales y las alianzas que cubren el 100 %."
        acciones={
          <Link
            href="/dashboard/minera/nueva"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden /> Nueva licitación
          </Link>
        }
      />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icono={FileText} etiqueta="Licitaciones" valor={licitaciones.length} detalle={`${abiertas} abiertas`} />
        <StatCard icono={Layers} etiqueta="Lotes" valor={lotes.length} detalle={`${lotesCubiertos} cubiertos al 100 %`} />
        <StatCard icono={Handshake} etiqueta="UTEs sugeridas" valor={totalUtes} detalle="Alianzas entre pymes" destacado />
        <StatCard icono={Users} etiqueta="Pymes locales" valor={pymes.length} detalle={`en ${Object.keys(porDepto).length} departamentos`} />
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Licitaciones" className="space-y-5">
          {licitaciones.length === 0 ? (
            <EmptyState
              icono={FileText}
              titulo="Todavía no publicaste licitaciones"
              descripcion="Cuando cargues una licitación dividida en lotes, vas a ver acá el ranking de pymes candidatas."
            >
              <Link
                href="/dashboard/minera/nueva"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Publicar la primera
              </Link>
            </EmptyState>
          ) : (
            licitaciones.map((lic) => (
              <article key={lic.id} className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
                          ESTILO_ESTADO[lic.estado]
                        )}
                      >
                        {lic.estado}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3.5" aria-hidden /> Cierre: {formatFecha(lic.cierre_el)}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold leading-tight">{lic.titulo}</h2>
                    {lic.descripcion && (
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{lic.descripcion}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <ActionForm
                      action={cambiarEstadoLicitacion}
                      variante="secundario"
                      submitLabel={ACCION_ESTADO[lic.estado].etiqueta}
                      pendingLabel="Actualizando…"
                      successLabel="✓"
                      className="[&>div]:mt-0"
                    >
                      <input type="hidden" name="licitacionId" value={lic.id} />
                      <input type="hidden" name="estado" value={ACCION_ESTADO[lic.estado].siguiente} />
                    </ActionForm>
                    {lic.estado !== "abierta" && (
                      <ActionForm
                        action={eliminarLicitacion}
                        variante="secundario"
                        submitLabel="Eliminar"
                        pendingLabel="Eliminando…"
                        successLabel="✓"
                        className="[&>div]:mt-0"
                      >
                        <input type="hidden" name="licitacionId" value={lic.id} />
                      </ActionForm>
                    )}
                  </div>
                </div>

                <ul className="divide-y border-t bg-background/40">
                  {lic.lotes.map((lote, i) => {
                    const mejor = mejorScore.get(lote.id);
                    const ute = mejorUte.get(lote.id);
                    const monto = formatMonto(lote.monto_estimado === null ? null : Number(lote.monto_estimado));
                    return (
                      <li key={lote.id}>
                        <Link
                          href={`/dashboard/minera/lotes/${lote.id}`}
                          className="group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                            L{i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium leading-tight">{lote.titulo}</span>
                            <span className="text-xs text-muted-foreground">
                              {candidatas.get(lote.id) ?? 0} candidatas
                              {monto ? ` · ${monto}` : ""}
                            </span>
                          </span>

                          {mejor !== undefined ? (
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              <ScoreRing score={mejor} size={40} />
                              <span className="hidden leading-tight sm:block">
                                mejor
                                <br />
                                sola
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin calcular</span>
                          )}

                          {ute?.aceptada ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                              <Handshake className="size-3.5" aria-hidden />
                              UTE aceptada
                            </span>
                          ) : ute ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                              <Handshake className="size-3.5" aria-hidden />
                              UTE {formatPorcentaje(ute.cobertura)}
                              {ute.cantidad > 1 && <span className="font-normal">· {ute.cantidad} opciones</span>}
                            </span>
                          ) : (mejor ?? 0) >= 100 ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                              Cubierto por una pyme
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Sin UTE</span>
                          )}

                          <ChevronRight
                            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="size-4 text-primary" aria-hidden /> Proveedores locales
            </h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">Pymes visibles para tu operación, por departamento.</p>
            {pymesRes.error ? (
              <ErrorState mensaje={pymesRes.error.message} />
            ) : (
              <MapaSanJuan
                datos={porDepto}
                mina={sesion.empresa.departamento}
                hrefFiltro={(d) => `/dashboard/minera/empresas?depto=${encodeURIComponent(d)}`}
              />
            )}
            <Link
              href="/dashboard/minera/empresas"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver directorio de proveedores <ChevronRight className="size-4" aria-hidden />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
