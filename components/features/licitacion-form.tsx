"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { ActionForm } from "@/components/features/action-form";
import { crearLicitacion, type LicitacionInput } from "@/lib/actions/minera";
import { NIVELES, NORMAS } from "@/lib/constants";

export interface CapacidadCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
}

/** Valor del <select> de requisito: "cap:<uuid>" o "norma:<texto>". */
interface RequisitoUI {
  key: number;
  valor: string;
  nivel_minimo: number;
  peso: number;
  obligatorio: boolean;
}

interface LoteUI {
  key: number;
  titulo: string;
  monto: string;
  requisitos: RequisitoUI[];
}

let siguienteKey = 1;
const nuevaKey = () => siguienteKey++;

const requisitoVacio = (): RequisitoUI => ({ key: nuevaKey(), valor: "", nivel_minimo: 1, peso: 5, obligatorio: false });
const loteVacio = (): LoteUI => ({ key: nuevaKey(), titulo: "", monto: "", requisitos: [requisitoVacio()] });

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LicitacionForm({
  catalogo,
  categorias,
}: {
  catalogo: CapacidadCatalogo[];
  /** Categorías en el orden en que se muestran en el selector. */
  categorias: string[];
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cierre, setCierre] = useState("");
  const [estado, setEstado] = useState<"abierta" | "borrador">("abierta");
  const [lotes, setLotes] = useState<LoteUI[]>(() => [loteVacio()]);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, CapacidadCatalogo[]>();
    for (const c of catalogo) mapa.set(c.categoria, [...(mapa.get(c.categoria) ?? []), c]);
    return categorias.filter((c) => mapa.has(c)).map((c) => [c, mapa.get(c)!] as const);
  }, [catalogo, categorias]);

  const payload: LicitacionInput = {
    titulo,
    descripcion,
    cierre_el: cierre,
    estado,
    lotes: lotes.map((l) => ({
      titulo: l.titulo,
      monto_estimado: l.monto.trim() === "" ? null : Number(l.monto),
      requisitos: l.requisitos
        .filter((r) => r.valor !== "")
        .map((r) =>
          r.valor.startsWith("cap:")
            ? { tipo: "capacidad" as const, capacidad_id: r.valor.slice(4), nivel_minimo: r.nivel_minimo, peso: r.peso, obligatorio: r.obligatorio }
            : { tipo: "norma" as const, norma: r.valor.slice(6), nivel_minimo: 1, peso: r.peso, obligatorio: r.obligatorio }
        ),
    })),
  };

  // --- helpers de edición inmutable ---
  const editarLote = (key: number, cambio: Partial<LoteUI>) =>
    setLotes((ls) => ls.map((l) => (l.key === key ? { ...l, ...cambio } : l)));

  const editarReq = (loteKey: number, reqKey: number, cambio: Partial<RequisitoUI>) =>
    setLotes((ls) =>
      ls.map((l) =>
        l.key === loteKey
          ? { ...l, requisitos: l.requisitos.map((r) => (r.key === reqKey ? { ...r, ...cambio } : r)) }
          : l
      )
    );

  /** Carga un ejemplo verosímil para la demo (usa códigos del catálogo). */
  const cargarEjemplo = () => {
    const id = (codigo: string) => catalogo.find((c) => c.codigo === codigo)?.id;
    const cap = (codigo: string, nivel: number, peso: number, obligatorio: boolean): RequisitoUI | null => {
      const capId = id(codigo);
      return capId ? { key: nuevaKey(), valor: `cap:${capId}`, nivel_minimo: nivel, peso, obligatorio } : null;
    };
    const norma = (n: string, peso: number, obligatorio: boolean): RequisitoUI => ({
      key: nuevaKey(), valor: `norma:${n}`, nivel_minimo: 1, peso, obligatorio,
    });
    const limpiar = (rs: (RequisitoUI | null)[]) => rs.filter((r): r is RequisitoUI => r !== null);

    setTitulo("Ampliación de taller de mantenimiento en planta");
    setDescripcion(
      "Montaje de estructuras y soporte de mantenimiento para la nueva nave de taller. Fraccionada en lotes para facilitar la participación de proveedores locales."
    );
    setCierre(new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
    setEstado("abierta");
    setLotes([
      {
        key: nuevaKey(),
        titulo: "Montaje de estructuras de la nave",
        monto: "45000000",
        requisitos: limpiar([
          cap("estructuras_metalicas", 2, 10, true),
          cap("soldadura", 2, 7, true),
          cap("hse_seguridad_higiene", 1, 5, true),
          cap("izaje_grua", 1, 4, false),
        ]),
      },
      {
        key: nuevaKey(),
        titulo: "Soporte de mantenimiento mecánico y eléctrico",
        monto: "28000000",
        requisitos: limpiar([
          cap("mecanica_pesada", 2, 10, true),
          cap("electricidad_industrial", 2, 6, false),
          cap("hse_seguridad_higiene", 2, 8, true),
          norma("ISO 9001", 3, false),
        ]),
      },
    ]);
  };

  return (
    <ActionForm
      action={crearLicitacion}
      submitLabel={estado === "abierta" ? "Publicar licitación" : "Guardar borrador"}
      pendingLabel="Guardando y calculando candidatas…"
      successLabel="Licitación creada ✓"
      className="space-y-8"
      fijo
    >
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Datos generales</h2>
          <button
            type="button"
            onClick={cargarEjemplo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground ring-1 ring-primary/20 transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Sparkles className="size-3.5" aria-hidden /> Cargar ejemplo
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Título</span>
          <input
            className={inputCls}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            minLength={3}
            maxLength={150}
            placeholder="Ej.: Servicios de soporte a la operación"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opcional)</span></span>
          <textarea
            className={`${inputCls} min-h-20`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={1000}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Fecha de cierre <span className="text-muted-foreground">(opcional)</span></span>
            <input type="date" className={inputCls} value={cierre} onChange={(e) => setCierre(e.target.value)} />
          </label>

          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Estado</legend>
            <div className="flex gap-4 pt-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={estado === "abierta"} onChange={() => setEstado("abierta")} />
                Abierta <span className="text-muted-foreground">(visible para pymes)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={estado === "borrador"} onChange={() => setEstado("borrador")} />
                Borrador
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Lotes</h2>
        <p className="text-sm text-muted-foreground">
          Fraccioná el contrato en lotes más chicos: el match y las UTEs se calculan por lote. El peso (1-10) indica cuánto
          importa cada requisito; los obligatorios marcan lo imprescindible para ejecutar el lote.
        </p>
      </div>

      {lotes.map((lote, i) => {
        const pesoTotal = lote.requisitos.filter((r) => r.valor).reduce((a, r) => a + r.peso, 0);
        const usados = new Set(lote.requisitos.map((r) => r.valor).filter(Boolean));
        return (
          <section key={lote.key} className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Lote {i + 1}</h3>
              {lotes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLotes((ls) => ls.filter((l) => l.key !== lote.key))}
                  className="text-xs text-rose-700 hover:underline dark:text-rose-300"
                >
                  Quitar lote
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Título del lote</span>
                <input
                  className={inputCls}
                  value={lote.titulo}
                  onChange={(e) => editarLote(lote.key, { titulo: e.target.value })}
                  required
                  minLength={3}
                  maxLength={150}
                  placeholder="Ej.: Mantenimiento de flota en sitio"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Monto estimado (ARS) <span className="text-muted-foreground">(opcional)</span></span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={inputCls}
                  value={lote.monto}
                  onChange={(e) => editarLote(lote.key, { monto: e.target.value })}
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Requisito</th>
                    <th className="w-36 pb-2 font-medium">Nivel mínimo</th>
                    <th className="w-20 pb-2 font-medium">Peso</th>
                    <th className="w-24 pb-2 text-center font-medium">Obligatorio</th>
                    <th className="w-10 pb-2" />
                  </tr>
                </thead>
                <tbody className="align-middle">
                  {lote.requisitos.map((req) => {
                    const esNorma = req.valor.startsWith("norma:");
                    return (
                      <tr key={req.key}>
                        <td className="py-1 pr-2">
                          <select
                            className={inputCls}
                            value={req.valor}
                            onChange={(e) => editarReq(lote.key, req.key, { valor: e.target.value })}
                            required
                            aria-label="Requisito"
                          >
                            <option value="">Elegí una capacidad o norma…</option>
                            {porCategoria.map(([categoria, caps]) => (
                              <optgroup key={categoria} label={categoria}>
                                {caps.map((c) => (
                                  <option key={c.id} value={`cap:${c.id}`} disabled={usados.has(`cap:${c.id}`) && req.valor !== `cap:${c.id}`}>
                                    {c.nombre}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                            <optgroup label="Certificaciones (normas)">
                              {NORMAS.map((n) => (
                                <option key={n} value={`norma:${n}`} disabled={usados.has(`norma:${n}`) && req.valor !== `norma:${n}`}>
                                  {n}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="py-1 pr-2">
                          <select
                            className={inputCls}
                            value={req.nivel_minimo}
                            disabled={esNorma}
                            onChange={(e) => editarReq(lote.key, req.key, { nivel_minimo: Number(e.target.value) })}
                            aria-label="Nivel mínimo"
                            title={esNorma ? "Las normas no tienen nivel: se valora si está verificada o declarada" : undefined}
                          >
                            {NIVELES.filter((n) => n.valor > 0).map((n) => (
                              <option key={n.valor} value={n.valor}>
                                {n.valor} · {n.etiqueta}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            step={1}
                            className={inputCls}
                            value={req.peso}
                            onChange={(e) =>
                              editarReq(lote.key, req.key, { peso: Math.min(10, Math.max(1, Math.round(Number(e.target.value) || 1))) })
                            }
                            aria-label="Peso"
                          />
                        </td>
                        <td className="py-1 text-center">
                          <input
                            type="checkbox"
                            className="size-4"
                            checked={req.obligatorio}
                            onChange={(e) => editarReq(lote.key, req.key, { obligatorio: e.target.checked })}
                            aria-label="Obligatorio"
                          />
                        </td>
                        <td className="py-1 text-right">
                          {lote.requisitos.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                editarLote(lote.key, { requisitos: lote.requisitos.filter((r) => r.key !== req.key) })
                              }
                              className="rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Quitar requisito"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => editarLote(lote.key, { requisitos: [...lote.requisitos, requisitoVacio()] })}
                disabled={lote.requisitos.length >= 15}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                + Agregar requisito
              </button>
              <p className="text-xs text-muted-foreground">Peso total del lote: {pesoTotal}</p>
            </div>
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => setLotes((ls) => [...ls, loteVacio()])}
        disabled={lotes.length >= 10}
        className="w-full rounded-xl border border-dashed p-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        + Agregar otro lote
      </button>
    </ActionForm>
  );
}
