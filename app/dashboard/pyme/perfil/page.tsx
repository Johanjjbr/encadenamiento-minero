import { BadgeCheck, Building2, Handshake, ShieldCheck, Sparkles } from "lucide-react";
import { ActionForm } from "@/components/features/action-form";
import { CategoriaIcon } from "@/components/features/categoria-icon";
import { EmpresaAvatar } from "@/components/features/empresa-avatar";
import { PageHeader } from "@/components/features/page-header";
import { ScoreRing } from "@/components/features/score-ring";
import { ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import {
  declararCertificacion,
  eliminarCertificacion,
  guardarCapacidades,
  guardarDatosEmpresa,
} from "@/lib/actions/pyme";
import { CATEGORIAS_ORDEN, DEPARTAMENTOS, ESTADO_CERTIFICACION, NIVELES, NORMAS } from "@/lib/constants";
import { formatFecha } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const CAMPO =
  "mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function PerfilPyme() {
  const sesion = await requireRol("pyme");
  const supabase = await createClient();

  const [catalogoRes, propiasRes, certRes] = await Promise.all([
    supabase.from("catalogo_capacidades").select("id, codigo, nombre, categoria").order("categoria").order("nombre"),
    supabase.from("empresa_capacidades").select("capacidad_id, nivel").eq("empresa_id", sesion.empresa.id),
    supabase
      .from("certificaciones")
      .select("id, norma, estado, vence_el")
      .eq("empresa_id", sesion.empresa.id)
      .order("norma"),
  ]);

  const error = catalogoRes.error ?? propiasRes.error ?? certRes.error;
  if (error) return <ErrorState mensaje={error.message} />;

  const nivelActual = new Map((propiasRes.data ?? []).map((c) => [c.capacidad_id, c.nivel]));

  const porCategoria = new Map<string, NonNullable<typeof catalogoRes.data>>();
  for (const cap of catalogoRes.data ?? []) {
    porCategoria.set(cap.categoria, [...(porCategoria.get(cap.categoria) ?? []), cap]);
  }

  const categoriasOrdenadas = Array.from(porCategoria.entries()).sort(([a], [b]) => {
    const rank = (c: string) => {
      const i = (CATEGORIAS_ORDEN as readonly string[]).indexOf(c);
      return i === -1 ? CATEGORIAS_ORDEN.length : i;
    };
    return rank(a) - rank(b) || a.localeCompare(b, "es");
  });

  const certificaciones = certRes.data ?? [];
  const normasDisponibles = NORMAS.filter((n) => !certificaciones.some((c) => c.norma === n));

  // Completitud del perfil: guía a la pyme sobre qué le suma visibilidad.
  const pasos = [
    { hecho: Boolean(sesion.empresa.descripcion), texto: "Descripción de la empresa" },
    { hecho: Boolean(sesion.empresa.departamento), texto: "Departamento" },
    { hecho: nivelActual.size >= 3, texto: "Al menos 3 capacidades" },
    { hecho: certificaciones.length > 0, texto: "Una certificación declarada" },
    { hecho: sesion.empresa.acepta_ute, texto: "Abierta a alianzas (UTE)" },
  ];
  const completitud = (pasos.filter((p) => p.hecho).length / pasos.length) * 100;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mi perfil"
        titulo="Capacidades y certificaciones"
        descripcion="Lo que declares acá es lo que usa el algoritmo para calificarte contra cada licitación. Los cambios se reflejan al volver a «Licitaciones compatibles»."
      />

      <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-xs md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-center gap-4">
          <EmpresaAvatar id={sesion.empresa.id} nombre={sesion.empresa.nombre} size="lg" />
          <div>
            <p className="font-semibold leading-tight">{sesion.empresa.nombre}</p>
            <p className="text-sm text-muted-foreground">{sesion.empresa.departamento ?? "Sin departamento"}</p>
            <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-secondary px-2 py-0.5">{nivelActual.size} capacidades</span>
              <span className="rounded-full bg-secondary px-2 py-0.5">{certificaciones.length} certificaciones</span>
              {sesion.empresa.acepta_ute && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                  <Handshake className="size-3" aria-hidden /> Acepta UTE
                </span>
              )}
            </p>
          </div>
        </div>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2 md:border-l md:pl-6">
          {pasos.map((p) => (
            <li key={p.texto} className={cn("flex items-center gap-2", p.hecho ? "text-foreground" : "text-muted-foreground")}>
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full text-[10px]",
                  p.hecho ? "bg-emerald-600 text-white" : "border border-dashed border-muted-foreground/50"
                )}
                aria-hidden
              >
                {p.hecho ? "✓" : ""}
              </span>
              {p.texto}
              <span className="sr-only">{p.hecho ? "(completo)" : "(pendiente)"}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 md:flex-col md:gap-1">
          <ScoreRing score={completitud} size={72} etiqueta="perfil" />
        </div>
      </section>

      <section aria-labelledby="t-datos" className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 id="t-datos" className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="size-5 text-primary" aria-hidden /> Datos de la empresa
        </h2>
        <ActionForm action={guardarDatosEmpresa} submitLabel="Guardar datos" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="descripcion" className="text-sm font-medium">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={3}
                maxLength={500}
                placeholder="Qué hace tu empresa, años de experiencia, clientes industriales…"
                defaultValue={sesion.empresa.descripcion ?? ""}
                className={CAMPO}
              />
            </div>
            <div>
              <label htmlFor="departamento" className="text-sm font-medium">Departamento</label>
              <select id="departamento" name="departamento" defaultValue={sesion.empresa.departamento ?? ""} className={CAMPO}>
                <option value="">Sin especificar</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <label className="flex items-start gap-3 self-end rounded-xl border bg-background/60 p-3 text-sm">
              <input
                type="checkbox"
                name="acepta_ute"
                defaultChecked={sesion.empresa.acepta_ute}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                <span className="font-medium">Acepto que me sugieran alianzas (UTE)</span>
                <span className="block text-xs text-muted-foreground">
                  Si lo desactivás, las operadoras no te verán como candidata para armar UTEs.
                </span>
              </span>
            </label>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="t-cap" className="rounded-2xl border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-cap" className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-5 text-primary" aria-hidden /> Capacidades
          </h2>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {NIVELES.filter((n) => n.valor > 0).map((n) => (
              <div key={n.valor} title={n.detalle}>
                <dt className="inline font-semibold text-foreground">{n.valor}</dt>{" "}
                <dd className="inline">{n.etiqueta}: {n.detalle.toLowerCase()}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ActionForm action={guardarCapacidades} submitLabel="Guardar capacidades" className="mt-5" fijo>
          <div className="grid gap-4 lg:grid-cols-2">
            {categoriasOrdenadas.map(([categoria, caps]) => {
              const declaradas = caps.filter((c) => nivelActual.has(c.id)).length;
              return (
                <fieldset key={categoria} className="rounded-xl border bg-background/60 p-4">
                  <legend className="sr-only">{categoria}</legend>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className="grid size-7 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                        <CategoriaIcon categoria={categoria} />
                      </span>
                      {categoria}
                    </span>
                    {declaradas > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                        {declaradas} declaradas
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {caps.map((cap) => {
                      const actual = nivelActual.get(cap.id) ?? 0;
                      return (
                        <div key={cap.id} role="radiogroup" aria-label={cap.nombre} className="flex items-center justify-between gap-3">
                          <span className={cn("text-sm", actual > 0 ? "font-medium" : "text-muted-foreground")}>
                            {cap.nombre}
                          </span>
                          <span className="inline-flex shrink-0 rounded-lg border bg-card p-0.5">
                            {NIVELES.map((n) => (
                              <label key={n.valor} title={n.valor === 0 ? "No ofrece" : `${n.etiqueta}: ${n.detalle}`}>
                                <input
                                  type="radio"
                                  name={`nivel:${cap.id}`}
                                  value={n.valor}
                                  defaultChecked={actual === n.valor}
                                  className="peer sr-only"
                                />
                                <span
                                  className={cn(
                                    "grid h-7 min-w-8 cursor-pointer place-items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors",
                                    "hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                                    n.valor === 0
                                      ? "peer-checked:bg-muted peer-checked:text-foreground"
                                      : "peer-checked:bg-primary peer-checked:text-primary-foreground"
                                  )}
                                >
                                  {n.valor === 0 ? "—" : n.valor}
                                </span>
                              </label>
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="t-cert" className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 id="t-cert" className="flex items-center gap-2 text-lg font-semibold">
          <BadgeCheck className="size-5 text-primary" aria-hidden /> Certificaciones
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Las que cargás quedan como «declaradas» (valen 60 % en el match). El estado «verificada» lo asigna un tercero;
          la plataforma no reemplaza la homologación de las operadoras.
        </p>

        {certificaciones.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Todavía no declaraste ninguna certificación.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certificaciones.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 p-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-lg",
                      c.estado === "verificada" ? "bg-emerald-100 text-emerald-800" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {c.estado === "verificada" ? <ShieldCheck className="size-5" aria-hidden /> : <BadgeCheck className="size-5" aria-hidden />}
                  </span>
                  <div>
                    <p className="font-medium leading-tight">{c.norma}</p>
                    <p className="text-xs">
                      <span
                        className={cn(
                          "font-medium",
                          c.estado === "verificada"
                            ? "text-emerald-700"
                            : c.estado === "vencida"
                              ? "text-rose-700"
                              : "text-muted-foreground"
                        )}
                      >
                        {ESTADO_CERTIFICACION[c.estado]}
                      </span>
                      {c.vence_el && <span className="text-muted-foreground"> · vence {formatFecha(c.vence_el)}</span>}
                    </p>
                  </div>
                </div>
                {c.estado !== "verificada" && (
                  <ActionForm action={eliminarCertificacion} submitLabel="Quitar" pendingLabel="Quitando…" successLabel="" variante="secundario" className="[&>div]:mt-0">
                    <input type="hidden" name="id" value={c.id} />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        )}

        {normasDisponibles.length > 0 && (
          <ActionForm action={declararCertificacion} submitLabel="Declarar certificación" className="mt-5" successLabel="Declarada ✓">
            <label htmlFor="norma" className="text-sm font-medium">Norma</label>
            <select id="norma" name="norma" defaultValue={normasDisponibles[0]} className={cn(CAMPO, "max-w-xs")}>
              {normasDisponibles.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
