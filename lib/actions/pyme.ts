"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEPARTAMENTOS, NORMAS } from "@/lib/constants";
import { esUuid } from "@/lib/validation";
import type { FormState } from "@/lib/actions/types";

function refrescar(): void {
  revalidatePath("/dashboard/pyme");
  revalidatePath("/dashboard/pyme/perfil");
}

export async function guardarDatosEmpresa(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await requireRol("pyme");

  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const departamento = String(formData.get("departamento") ?? "").trim();
  const aceptaUte = formData.get("acepta_ute") === "on";

  if (descripcion.length > 500) return { error: "La descripción no puede superar los 500 caracteres." };
  if (departamento && !(DEPARTAMENTOS as readonly string[]).includes(departamento)) {
    return { error: "Departamento inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("empresas")
    .update({
      descripcion: descripcion || null,
      departamento: departamento || null,
      acepta_ute: aceptaUte,
    })
    .eq("id", sesion.empresa.id);
  if (error) return { error: `No se pudieron guardar los datos: ${error.message}` };

  refrescar();
  return { ok: true };
}

export async function guardarCapacidades(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await requireRol("pyme");

  const conNivel: { capacidad_id: string; nivel: number }[] = [];
  const sinNivel: string[] = [];

  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("nivel:")) continue;
    const capacidadId = clave.slice("nivel:".length);
    const nivel = Number(valor);
    if (!esUuid(capacidadId) || !Number.isInteger(nivel) || nivel < 0 || nivel > 3) {
      return { error: "Hay un valor de capacidad inválido. Recargá la página e intentá de nuevo." };
    }
    if (nivel === 0) sinNivel.push(capacidadId);
    else conNivel.push({ capacidad_id: capacidadId, nivel });
  }

  const supabase = await createClient();

  if (conNivel.length > 0) {
    const { error } = await supabase
      .from("empresa_capacidades")
      .upsert(
        conNivel.map((c) => ({ empresa_id: sesion.empresa.id, ...c })),
        { onConflict: "empresa_id,capacidad_id" }
      );
    if (error) return { error: `No se pudieron guardar las capacidades: ${error.message}` };
  }

  if (sinNivel.length > 0) {
    const { error } = await supabase
      .from("empresa_capacidades")
      .delete()
      .eq("empresa_id", sesion.empresa.id)
      .in("capacidad_id", sinNivel);
    if (error) return { error: `No se pudieron quitar capacidades: ${error.message}` };
  }

  refrescar();
  return { ok: true };
}

export async function declararCertificacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await requireRol("pyme");

  const norma = String(formData.get("norma") ?? "");
  if (!(NORMAS as readonly string[]).includes(norma)) return { error: "Elegí una norma de la lista." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("certificaciones")
    .insert({ empresa_id: sesion.empresa.id, norma, estado: "declarada" });

  if (error) {
    if (error.code === "23505") return { error: "Ya cargaste esa norma." };
    return { error: `No se pudo declarar la certificación: ${error.message}` };
  }

  refrescar();
  return { ok: true };
}

export async function eliminarCertificacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await requireRol("pyme");

  const id = String(formData.get("id") ?? "");
  if (!esUuid(id)) return { error: "Certificación inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificaciones")
    .delete()
    .eq("id", id)
    .eq("empresa_id", sesion.empresa.id)
    .select("id");

  if (error) return { error: `No se pudo quitar la certificación: ${error.message}` };
  if (!data || data.length === 0) {
    return { error: "No se puede quitar: las certificaciones verificadas no se editan desde acá." };
  }

  refrescar();
  return { ok: true };
}
