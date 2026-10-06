import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Handshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { CategoriaIcon } from "@/components/features/categoria-icon";
import { AvatarGrupo, EmpresaAvatar } from "@/components/features/empresa-avatar";
import { NivelDots } from "@/components/features/nivel-dots";
import { ScoreRing } from "@/components/features/score-ring";
import { StatCard } from "@/components/features/stat-card";
import { EmptyState, ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import { CATEGORIAS_ORDEN, ESTADO_CERTIFICACION } from "@/lib/constants";
import { formatFecha, formatPorcentaje } from "@/lib/format";
import { parseBrecha } from "@/lib/match";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { esUuid } from "@/lib/validation";

interface Props {
  params: Promise<{ empresaId: string }>;
  searchParams: Promise<{ desde?: string }>;
}

const ESTILO_UTE = {
  aceptada: { etiqueta: "Aceptada", clase: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  sugerida: { etiqueta: "Sugerida", clase: "bg-accent text-accent-foreground ring-primary/20" },
  rechazada: { etiqueta: "Rechazada", clase: "bg-muted text-muted-foreground ring-border" },
} as const;

/** Ficha de una pyme vista por la minera: perfil, capacidades, certificaciones,
 *  match en los lotes propios y alianzas donde participa. La RLS limita qué
 *  pymes ve (las que aceptan UTE o aparecen en sus lotes) y qué matches/UTEs
 *  (solo los de sus lotes). */
export default async function FichaEmpresa({ params, searchParams }: Props) {
  const { empresaId } = await params;
  const { desde } = await searchParams;
  if (!esUuid(empresaId)) notFound();

  await requireRol("minera");
  const supabase = await createClient();

  const [empRes, capRes, certRes, matchRes, uteRes] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, nombre, tipo, departamento, descripcion, acepta_ute")
      .eq("id", empresaId)
      .maybeSingle(),
    supabase
      .from("empresa_capacidades")
      .select("nivel, capacidad:catalogo_capacidades(id, nombre, categoria)")
      .eq("empresa_id", empresaId),
    supabase.from("certificaciones").select("id, norma, estado, vence_el").eq("empresa_id", empresaId).order("norma"),
    supabase
      .from("matches")
      .select("score, cumple_obligatorios, brecha, lote:lotes(id, titulo, licitacion:licitaciones(titulo, estado))")
      .eq("empresa_id", empresaId),
    supabase
      .from("ute_miembros")
      .select(
        "ute:utes_sugeridas(id, lote_id, cobertura, estado, lote:lotes(titulo), miembros:ute_miembros(empresa:empresas(id, nombre)))"
      )
      .eq("empresa_id", empresaId),
  ]);

  const empresa = empRes.data;
  if (!empresa || empresa.tipo !== "PYME") notFound();

  const volver = desde && esUuid(desde)
    ? { href: `/dashboard/minera/lotes/${desde}`, etiqueta: "Volver al lote" }
    : { href: "/dashboard/minera/empresas", etiqueta: "Proveedores" };

  // Capacidades agrupadas por categoría, en el orden del catálogo.
  const capacidades = (capRes.data ?? []).filter((c) => c.capacidad !== null);
  const porCategoria = new Map<string, { id: string; nombre: string; nivel: number }[]>();
  for (const c of capacidades) {
    const lista = porCategoria.get(c.capacidad!.categoria) ?? [];
    lista.push({ id: c.capacidad!.id, nombre: c.capacidad!.nombre, nivel: c.nivel });
    porCategoria.set(c.capacidad!.categoria, lista);
  }
  const categorias = Array.from(porCategoria.entries()).sort(([a], [b]) => {
    const rank = (x: string) => {
      const i = (CATEGORIAS_ORDEN as readonly string[]).indexOf(x);
      return i === -1 ? 99 : i;
    };
    return rank(a) - rank(b);
  });

  const certificaciones = certRes.data ?? [];

  const matches = (matchRes.data ?? [])
    .filter((m) => m.lote !== null)
    .map((m) => ({
      loteId: m.lote!.id,
      lote: m.lote!.titulo,
      licitacion: m.lote!.licitacion?.titulo ?? "",
      score: Number(m.score),
      cumple: m.cumple_obligatorios,
      brecha: parseBrecha(m.brecha),
    }))
    .sort((a, b) => b.score - a.score);
  const mejor = matches[0];

  const alianzas = (uteRes.data ?? [])
    .map((r) => r.ute)
    .filter((u): u is NonNullable<typeof u> => u !== null)
    .map((u) => ({
      id: u.id,
      loteId: u.lote_id,
      lote: u.lote?.titulo ?? "Lote",
      cobertura: Number(u.cobertura),
      estado: u.estado,
      miembros: u.miembros.map((m) => m.empresa).filter((e): e is { id: string; nombre: string } => e !== null),
    }))
    .sort((a, b) => (a.estado === "aceptada" ? -1 : 0) - (b.estado === "aceptada" ? -1 : 0) || b.cobertura - a.cobertura);

  return (
    <div className="space-y-8">
      <nav aria-label="Ruta">
        <Link
          href={volver.href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden /> {volver.etiqueta}
        </Link>
      </nav>

      <header className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="bg-gradient-to-r from-accent/70 to-card p-6">
          <div className="flex flex-wrap items-start gap-5">
            <EmpresaAvatar id={empresa.id} nombre={empresa.nombre} size="lg" className="size-16 text-lg" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pyme proveedora</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{empresa.nombre}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden /> {empresa.departamento ?? "Sin departamento"}, San Juan
                </span>
                {empresa.acepta_ute ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                    <Handshake className="size-3.5" aria-hidden /> Abierta a alianzas (UTE)
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">No participa de UTEs</span>
                )}
              </p>
              {empresa.descripcion && <p className="mt-3 max-w-3xl text-sm">{empresa.descripcion}</p>}
            </div>
          </div>
        </div>
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icono={Trophy}
          etiqueta="Mejor match en tus lotes"
          valor={mejor ? formatPorcentaje(mejor.score) : "—"}
          detalle={mejor ? mejor.lote : "Sin lotes evaluados"}
        />
        <StatCard
          icono={Sparkles}
          etiqueta="Capacidades declaradas"
          valor={capacidades.length}
          detalle={`${capacidades.filter((c) => c.nivel === 3).length} como referente`}
        />
        <StatCard
          icono={Handshake}
          etiqueta="Alianzas en tus lotes"
          valor={alianzas.filter((a) => a.estado !== "rechazada").length}
          detalle={`${alianzas.filter((a) => a.estado === "aceptada").length} aceptadas`}
          destacado={alianzas.some((a) => a.estado === "aceptada")}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="t-cap" className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 id="t-cap" className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-primary" aria-hidden /> Capacidades
          </h2>
          {capRes.error ? (
            <ErrorState mensaje={capRes.error.message} />
          ) : categorias.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Todavía no declaró capacidades.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {categorias.map(([categoria, caps]) => (
                <div key={categoria}>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CategoriaIcon categoria={categoria} className="size-3.5" /> {categoria}
                  </p>
                  <ul className="mt-2 divide-y rounded-xl border bg-background/60">
                    {caps
                      .sort((a, b) => b.nivel - a.nivel)
                      .map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="font-medium">{c.nombre}</span>
                          <NivelDots nivel={c.nivel} />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="t-cert" className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 id="t-cert" className="flex items-center gap-2 font-semibold">
            <BadgeCheck className="size-4 text-primary" aria-hidden /> Certificaciones
          </h2>
          {certRes.error ? (
            <ErrorState mensaje={certRes.error.message} />
          ) : certificaciones.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No declaró certificaciones.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {certificaciones.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border bg-background/60 p-3">
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-lg",
                      c.estado === "verificada" ? "bg-emerald-100 text-emerald-800" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {c.estado === "verificada" ? (
                      <ShieldCheck className="size-5" aria-hidden />
                    ) : (
                      <BadgeCheck className="size-5" aria-hidden />
                    )}
                  </span>
                  <div>
                    <p className="font-medium leading-tight">{c.norma}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className={cn("font-medium", c.estado === "verificada" && "text-emerald-700", c.estado === "vencida" && "text-rose-700")}>
                        {ESTADO_CERTIFICACION[c.estado]}
                      </span>
                      {c.vence_el ? ` · vence ${formatFecha(c.vence_el)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            «Declarada» = informada por la pyme. «Verificada» = confirmada por un tercero. La plataforma no reemplaza tu
            proceso de homologación.
          </p>
        </section>
      </div>

      <section aria-labelledby="t-match" className="space-y-3">
        <h2 id="t-match" className="flex items-center gap-2 text-lg font-semibold">
          <Target className="size-5 text-primary" aria-hidden /> Match en tus lotes
        </h2>
        {matchRes.error ? (
          <ErrorState mensaje={matchRes.error.message} />
        ) : matches.length === 0 ? (
          <EmptyState titulo="Sin lotes evaluados" descripcion="Esta pyme todavía no fue evaluada contra tus lotes." />
        ) : (
          <ul className="space-y-3">
            {matches.map((m) => (
              <li key={m.loteId}>
                <Link
                  href={`/dashboard/minera/lotes/${m.loteId}`}
                  className="group flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:bg-accent/30"
                >
                  <ScoreRing score={m.score} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{m.licitacion}</p>
                    <p className="font-medium leading-tight">{m.lote}</p>
                    <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", m.cumple ? "text-emerald-700" : "text-rose-700")}>
                      {m.cumple ? <CircleCheck className="size-3.5" aria-hidden /> : <CircleX className="size-3.5" aria-hidden />}
                      {m.cumple ? "Cumple los obligatorios" : "Le falta algún obligatorio"}
                    </p>
                  </div>
                  {m.brecha.length > 0 && (
                    <ul className="flex max-w-md flex-wrap gap-1.5">
                      {m.brecha.map((b) => (
                        <li
                          key={b.requisitoId}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs ring-1 ring-inset",
                            b.obligatorio ? "bg-rose-50 font-medium text-rose-800 ring-rose-200" : "bg-muted text-muted-foreground ring-border"
                          )}
                        >
                          {b.nombre}
                          {b.obligatorio ? " ★" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-ute" className="space-y-3">
        <h2 id="t-ute" className="flex items-center gap-2 text-lg font-semibold">
          <Handshake className="size-5 text-primary" aria-hidden /> Alianzas donde participa
        </h2>
        {uteRes.error ? (
          <ErrorState mensaje={uteRes.error.message} />
        ) : alianzas.length === 0 ? (
          <EmptyState icono={Handshake} titulo="Sin alianzas en tus lotes" descripcion="Todavía no aparece en ninguna UTE sugerida para tus lotes." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {alianzas.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/minera/lotes/${a.loteId}`}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:bg-accent/30"
                >
                  <AvatarGrupo empresas={a.miembros} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.miembros.map((m) => m.nombre).join(" + ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.lote} · cobertura {formatPorcentaje(a.cobertura)}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", ESTILO_UTE[a.estado].clase)}>
                    {ESTILO_UTE[a.estado].etiqueta}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
