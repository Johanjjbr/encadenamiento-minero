import { ActionForm } from "@/components/features/action-form";
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

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que declares acá es lo que usa el algoritmo para calificarte contra cada licitación. Los cambios se ven al
          volver a «Licitaciones compatibles».
        </p>
      </header>

      <section aria-labelledby="t-datos" className="rounded-xl border bg-card p-5">
        <h2 id="t-datos" className="text-lg font-semibold">Datos de la empresa</h2>
        <ActionForm action={guardarDatosEmpresa} submitLabel="Guardar datos" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="descripcion" className="text-sm font-medium">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={3}
                maxLength={500}
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
            <label className="flex items-start gap-3 self-end text-sm">
              <input
                type="checkbox"
                name="acepta_ute"
                defaultChecked={sesion.empresa.acepta_ute}
                className="mt-0.5 size-4"
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

      <section aria-labelledby="t-cap" className="rounded-xl border bg-card p-5">
        <h2 id="t-cap" className="text-lg font-semibold">Capacidades</h2>
        <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
          {NIVELES.filter((n) => n.valor > 0).map((n) => (
            <div key={n.valor}>
              <dt className="inline font-medium text-foreground">Nivel {n.valor} · {n.etiqueta}:</dt>{" "}
              <dd className="inline">{n.detalle}</dd>
            </div>
          ))}
        </dl>

        <ActionForm action={guardarCapacidades} submitLabel="Guardar capacidades" className="mt-5">
          <div className="space-y-6">
            {categoriasOrdenadas.map(([categoria, caps]) => (
              <fieldset key={categoria}>
                <legend className="text-sm font-semibold">{categoria}</legend>
                <div className="mt-2 grid gap-x-6 gap-y-2 md:grid-cols-2">
                  {caps.map((cap) => (
                    <div key={cap.id} className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`nivel-${cap.id}`}
                        className={cn("text-sm", nivelActual.has(cap.id) && "font-semibold")}
                      >
                        {cap.nombre}
                      </label>
                      <select
                        id={`nivel-${cap.id}`}
                        name={`nivel:${cap.id}`}
                        defaultValue={String(nivelActual.get(cap.id) ?? 0)}
                        className="rounded-md border bg-background px-2 py-1 text-sm"
                      >
                        {NIVELES.map((n) => (
                          <option key={n.valor} value={n.valor}>
                            {n.valor === 0 ? n.etiqueta : `${n.valor} · ${n.etiqueta}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="t-cert" className="rounded-xl border bg-card p-5">
        <h2 id="t-cert" className="text-lg font-semibold">Certificaciones</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Las que cargás quedan como «declaradas». El estado «verificada» lo asigna un tercero; la plataforma no
          reemplaza la homologación de las operadoras.
        </p>

        {certificaciones.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Todavía no declaraste ninguna certificación.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-lg border">
            {certificaciones.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{c.norma}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      c.estado === "verificada"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : c.estado === "vencida"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {ESTADO_CERTIFICACION[c.estado]}
                  </span>
                  {c.vence_el && <span className="text-xs text-muted-foreground">Vence {formatFecha(c.vence_el)}</span>}
                </div>
                {c.estado !== "verificada" && (
                  <ActionForm action={eliminarCertificacion} submitLabel="Quitar" pendingLabel="Quitando…" successLabel="" variante="secundario">
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
