import Link from "next/link";
import { BadgeCheck, ChevronRight, Handshake, MapPin, Search, Users } from "lucide-react";
import { EmpresaAvatar } from "@/components/features/empresa-avatar";
import { MapaSanJuan, type DatoDepartamento } from "@/components/features/mapa-san-juan";
import { MatchBadge } from "@/components/features/match-badge";
import { PageHeader } from "@/components/features/page-header";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ q?: string; depto?: string }>;
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Directorio de proveedores locales visibles para la minera. */
export default async function Proveedores({ searchParams }: Props) {
  const { q = "", depto } = await searchParams;
  const sesion = await requireRol("minera");
  const supabase = await createClient();

  const [empRes, matchRes] = await Promise.all([
    supabase
      .from("empresas")
      .select(
        "id, nombre, departamento, descripcion, acepta_ute, capacidades:empresa_capacidades(nivel, capacidad:catalogo_capacidades(nombre)), certificaciones(norma, estado)"
      )
      .eq("tipo", "PYME")
      .order("nombre"),
    // Solo devuelve matches de mis lotes (RLS).
    supabase.from("matches").select("empresa_id, score"),
  ]);

  if (empRes.error) return <ErrorState mensaje={empRes.error.message} />;

  const mejorScore = new Map<string, number>();
  for (const m of matchRes.data ?? []) {
    mejorScore.set(m.empresa_id, Math.max(mejorScore.get(m.empresa_id) ?? 0, Number(m.score)));
  }

  const todas = (empRes.data ?? []).map((e) => ({
    ...e,
    capacidades: e.capacidades
      .filter((c) => c.capacidad !== null)
      .map((c) => ({ nombre: c.capacidad!.nombre, nivel: c.nivel }))
      .sort((a, b) => b.nivel - a.nivel),
  }));

  const termino = normalizar(q.trim());
  const filtradas = todas.filter(
    (e) =>
      (!depto || e.departamento === depto) &&
      (!termino ||
        normalizar(e.nombre).includes(termino) ||
        e.capacidades.some((c) => normalizar(c.nombre).includes(termino)) ||
        e.certificaciones.some((c) => normalizar(c.norma).includes(termino)))
  );

  const porDepto: Record<string, DatoDepartamento> = {};
  for (const e of todas) {
    if (!e.departamento) continue;
    const d = (porDepto[e.departamento] ??= { cantidad: 0, nombres: [] });
    d.cantidad += 1;
    d.nombres!.push(e.nombre);
  }

  const href = (params: { q?: string; depto?: string }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.depto) sp.set("depto", params.depto);
    const s = sp.toString();
    return `/dashboard/minera/empresas${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Directorio"
        titulo="Proveedores locales"
        descripcion="Pymes sanjuaninas visibles para tu operación: las que aceptan alianzas o ya aparecen en tus lotes. Entrá a cada ficha para ver capacidades, certificaciones y su match en tus licitaciones."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <form action="/dashboard/minera/empresas" className="flex flex-wrap items-center gap-2">
            {depto && <input type="hidden" name="depto" value={depto} />}
            <label className="relative flex-1">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre, capacidad o norma (p. ej. soldadura, ISO 9001)"
                className="w-full rounded-lg border bg-card py-2.5 pl-9 pr-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Buscar
            </button>
          </form>

          {(q || depto) && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {filtradas.length} de {todas.length} pymes
              {depto && (
                <Link href={href({ q })} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  <MapPin className="size-3.5" aria-hidden /> {depto} ✕
                </Link>
              )}
              {q && (
                <Link href={href({ depto })} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  «{q}» ✕
                </Link>
              )}
            </p>
          )}

          {filtradas.length === 0 ? (
            <EmptyState icono={Users} titulo="Sin resultados" descripcion="Probá con otra búsqueda o quitá el filtro de departamento." />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {filtradas.map((e) => {
                const score = mejorScore.get(e.id);
                return (
                  <li key={e.id}>
                    <Link
                      href={`/dashboard/minera/empresas/${e.id}`}
                      className="group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <EmpresaAvatar id={e.id} nombre={e.nombre} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-tight group-hover:text-primary">{e.nombre}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" aria-hidden /> {e.departamento ?? "Sin departamento"}
                            {e.acepta_ute && (
                              <>
                                {" · "}
                                <Handshake className="size-3" aria-hidden /> UTE
                              </>
                            )}
                          </p>
                        </div>
                        {score !== undefined && (
                          <span className="flex flex-col items-end text-[10px] text-muted-foreground">
                            <MatchBadge score={score} />
                            mejor match
                          </span>
                        )}
                      </div>

                      {e.descripcion && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.descripcion}</p>}

                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {e.capacidades.slice(0, 4).map((c) => (
                          <li key={c.nombre} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            {c.nombre} <span className="text-muted-foreground">· N{c.nivel}</span>
                          </li>
                        ))}
                        {e.capacidades.length > 4 && (
                          <li className="px-1 text-xs text-muted-foreground">+{e.capacidades.length - 4}</li>
                        )}
                      </ul>

                      <div className="mt-auto flex items-center justify-between pt-4">
                        <span className="flex flex-wrap gap-1.5">
                          {e.certificaciones.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin certificaciones</span>
                          ) : (
                            e.certificaciones.map((c) => (
                              <span
                                key={c.norma}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                                  c.estado === "verificada"
                                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                    : "bg-muted text-muted-foreground ring-border"
                                )}
                              >
                                <BadgeCheck className="size-3" aria-hidden /> {c.norma}
                                <span className="sr-only">({c.estado})</span>
                              </span>
                            ))
                          )}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside>
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="size-4 text-primary" aria-hidden /> Por departamento
            </h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">Tocá un departamento para filtrar.</p>
            <MapaSanJuan
              datos={porDepto}
              mina={sesion.empresa.departamento}
              activo={depto}
              hrefFiltro={(d) => href({ q, depto: d })}
              hrefLimpiar={href({ q })}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
