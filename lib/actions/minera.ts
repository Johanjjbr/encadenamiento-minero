"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NORMAS } from "@/lib/constants";
import { esUuid } from "@/lib/validation";
import type { FormState } from "@/lib/actions/types";

/** Recalcula el ranking de un lote y regenera sus UTEs. La propiedad del lote
 *  la valida la propia RPC (security definer + lote_es_mio). */
export async function recalcularLote(_prev: FormState, formData: FormData): Promise<FormState> {
  const loteId = String(formData.get("loteId") ?? "");
  if (!esUuid(loteId)) return { error: "Lote inválido." };

  await requireRol("minera");
  const supabase = await createClient();

  const { error: errRanking } = await supabase.rpc("ranking_lote", { p_lote_id: loteId });
  if (errRanking) return { error: `No se pudo recalcular el ranking: ${errRanking.message}` };

  const { error: errUtes } = await supabase.rpc("generar_utes", { p_lote_id: loteId });
  if (errUtes) return { error: `No se pudieron generar las UTEs: ${errUtes.message}` };

  revalidatePath(`/dashboard/minera/lotes/${loteId}`);
  revalidatePath("/dashboard/minera");
  return { ok: true };
}

// ---------------------------------------------------------------------
// Alta de licitación: licitación + lotes + requisitos en un solo envío.
// El formulario (cliente) arma un JSON en el campo "payload"; acá se valida
// todo de nuevo porque el cliente no es confiable.
// ---------------------------------------------------------------------

export interface RequisitoInput {
  tipo: "capacidad" | "norma";
  capacidad_id?: string;
  norma?: string;
  nivel_minimo: number;
  peso: number;
  obligatorio: boolean;
}

export interface LoteInput {
  titulo: string;
  monto_estimado: number | null;
  requisitos: RequisitoInput[];
}

export interface LicitacionInput {
  titulo: string;
  descripcion: string;
  cierre_el: string;
  estado: "borrador" | "abierta";
  lotes: LoteInput[];
}

const MAX_LOTES = 10;
const MAX_REQUISITOS = 15;

function esEntero(valor: unknown, min: number, max: number): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= min && valor <= max;
}

/** Devuelve el input normalizado o un mensaje de error legible. */
function validarLicitacion(raw: unknown): LicitacionInput | string {
  if (!raw || typeof raw !== "object") return "Datos del formulario inválidos.";
  const d = raw as Record<string, unknown>;

  const titulo = String(d.titulo ?? "").trim();
  if (titulo.length < 3 || titulo.length > 150) return "El título debe tener entre 3 y 150 caracteres.";

  const descripcion = String(d.descripcion ?? "").trim();
  if (descripcion.length > 1000) return "La descripción no puede superar los 1000 caracteres.";

  const cierre = String(d.cierre_el ?? "").trim();
  if (cierre && (!/^\d{4}-\d{2}-\d{2}$/.test(cierre) || Number.isNaN(Date.parse(cierre)))) {
    return "La fecha de cierre no es válida.";
  }

  const estado = d.estado === "abierta" ? "abierta" : d.estado === "borrador" ? "borrador" : null;
  if (!estado) return "Estado inválido.";

  if (!Array.isArray(d.lotes) || d.lotes.length === 0) return "Agregá al menos un lote.";
  if (d.lotes.length > MAX_LOTES) return `Máximo ${MAX_LOTES} lotes por licitación.`;

  const lotes: LoteInput[] = [];
  for (const [i, rawLote] of d.lotes.entries()) {
    const n = i + 1;
    const l = (rawLote ?? {}) as Record<string, unknown>;
    const tituloLote = String(l.titulo ?? "").trim();
    if (tituloLote.length < 3 || tituloLote.length > 150) {
      return `Lote ${n}: el título debe tener entre 3 y 150 caracteres.`;
    }

    let monto: number | null = null;
    if (l.monto_estimado !== null && l.monto_estimado !== undefined && l.monto_estimado !== "") {
      monto = Number(l.monto_estimado);
      if (!Number.isFinite(monto) || monto < 0 || monto >= 1e12) return `Lote ${n}: monto estimado inválido.`;
    }

    if (!Array.isArray(l.requisitos) || l.requisitos.length === 0) {
      return `Lote ${n}: agregá al menos un requisito (sin requisitos no hay match posible).`;
    }
    if (l.requisitos.length > MAX_REQUISITOS) return `Lote ${n}: máximo ${MAX_REQUISITOS} requisitos.`;

    const vistos = new Set<string>();
    const requisitos: RequisitoInput[] = [];
    for (const rawReq of l.requisitos) {
      const r = (rawReq ?? {}) as Record<string, unknown>;
      const peso = Number(r.peso);
      if (!esEntero(peso, 1, 10)) return `Lote ${n}: el peso debe ser un entero entre 1 y 10.`;
      const obligatorio = r.obligatorio === true;

      if (r.tipo === "capacidad") {
        const capacidadId = String(r.capacidad_id ?? "");
        if (!esUuid(capacidadId)) return `Lote ${n}: elegí una capacidad para cada requisito.`;
        const nivel = Number(r.nivel_minimo);
        if (!esEntero(nivel, 1, 3)) return `Lote ${n}: el nivel mínimo debe ser 1, 2 o 3.`;
        if (vistos.has(capacidadId)) return `Lote ${n}: hay una capacidad repetida.`;
        vistos.add(capacidadId);
        requisitos.push({ tipo: "capacidad", capacidad_id: capacidadId, nivel_minimo: nivel, peso, obligatorio });
      } else if (r.tipo === "norma") {
        const norma = String(r.norma ?? "");
        if (!(NORMAS as readonly string[]).includes(norma)) return `Lote ${n}: elegí una norma de la lista.`;
        if (vistos.has(norma)) return `Lote ${n}: hay una norma repetida.`;
        vistos.add(norma);
        requisitos.push({ tipo: "norma", norma, nivel_minimo: 1, peso, obligatorio });
      } else {
        return `Lote ${n}: tipo de requisito inválido.`;
      }
    }

    lotes.push({ titulo: tituloLote, monto_estimado: monto, requisitos });
  }

  return { titulo, descripcion, cierre_el: cierre, estado, lotes };
}

export async function crearLicitacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await requireRol("minera");

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "No se pudo leer el formulario. Recargá la página e intentá de nuevo." };
  }
  const input = validarLicitacion(raw);
  if (typeof input === "string") return { error: input };

  const supabase = await createClient();

  // IDs generados acá para no depender del orden en que la base devuelve las filas.
  const licitacionId = crypto.randomUUID();
  const lotes = input.lotes.map((l) => ({ ...l, id: crypto.randomUUID() }));

  const { error: errLic } = await supabase.from("licitaciones").insert({
    id: licitacionId,
    minera_id: sesion.empresa.id,
    titulo: input.titulo,
    descripcion: input.descripcion || null,
    cierre_el: input.cierre_el || null,
    estado: input.estado,
  });
  if (errLic) return { error: `No se pudo crear la licitación: ${errLic.message}` };

  // Sin transacción desde el cliente: si falla un paso posterior se borra la
  // licitación recién creada (ON DELETE CASCADE limpia lotes y requisitos).
  const deshacer = async (mensaje: string): Promise<FormState> => {
    await supabase.from("licitaciones").delete().eq("id", licitacionId);
    return { error: mensaje };
  };

  const { error: errLotes } = await supabase.from("lotes").insert(
    lotes.map((l) => ({
      id: l.id,
      licitacion_id: licitacionId,
      titulo: l.titulo,
      monto_estimado: l.monto_estimado,
    }))
  );
  if (errLotes) return deshacer(`No se pudieron crear los lotes: ${errLotes.message}`);

  const { error: errReq } = await supabase.from("lote_requisitos").insert(
    lotes.flatMap((l) =>
      l.requisitos.map((r) => ({
        lote_id: l.id,
        tipo: r.tipo,
        capacidad_id: r.tipo === "capacidad" ? r.capacidad_id! : null,
        norma: r.tipo === "norma" ? r.norma! : null,
        nivel_minimo: r.nivel_minimo,
        peso: r.peso,
        obligatorio: r.obligatorio,
      }))
    )
  );
  if (errReq) return deshacer(`No se pudieron guardar los requisitos: ${errReq.message}`);

  // Calcula ranking y UTEs de cada lote para que la minera vea candidatas al instante.
  // Un fallo acá no invalida la licitación: se puede recalcular desde el lote.
  for (const lote of lotes) {
    const { error } = await supabase.rpc("ranking_lote", { p_lote_id: lote.id });
    if (!error) await supabase.rpc("generar_utes", { p_lote_id: lote.id });
  }

  revalidatePath("/dashboard/minera");
  revalidatePath("/dashboard/pyme");
  redirect(lotes.length === 1 ? `/dashboard/minera/lotes/${lotes[0].id}` : "/dashboard/minera");
}

/** Publica (abierta), vuelve a borrador o cierra una licitación propia. */
export async function cambiarEstadoLicitacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await requireRol("minera");

  const id = String(formData.get("licitacionId") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!esUuid(id)) return { error: "Licitación inválida." };
  if (estado !== "borrador" && estado !== "abierta" && estado !== "cerrada") return { error: "Estado inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("licitaciones")
    .update({ estado })
    .eq("id", id)
    .eq("minera_id", sesion.empresa.id)
    .select("id");
  if (error) return { error: `No se pudo cambiar el estado: ${error.message}` };
  if (!data || data.length === 0) return { error: "No se encontró la licitación." };

  revalidatePath("/dashboard/minera");
  revalidatePath("/dashboard/pyme");
  return { ok: true };
}
