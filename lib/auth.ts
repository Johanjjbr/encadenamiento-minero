import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Rol = Tables<"perfiles">["rol"];

export interface Sesion {
  userId: string;
  email: string | null;
  rol: Rol;
  empresa: Pick<
    Tables<"empresas">,
    "id" | "nombre" | "tipo" | "departamento" | "descripcion" | "acepta_ute"
  >;
}

/** Usuario + perfil + empresa. Devuelve null si no hay sesión o falta el perfil.
 *  `cache` de React: se resuelve una sola vez por request. */
export const getSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, empresa:empresas(id, nombre, tipo, departamento, descripcion, acepta_ute)")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || !perfil.empresa) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    rol: perfil.rol,
    empresa: perfil.empresa,
  };
});

export function rutaInicial(rol: Rol): string {
  return rol === "minera" ? "/dashboard/minera" : "/dashboard/pyme";
}

export async function requireSesion(): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

/** Cada página llama esto: el layout no alcanza para proteger datos, porque no
 *  se vuelve a ejecutar al navegar entre páginas hijas. */
export async function requireRol(rol: Rol): Promise<Sesion> {
  const sesion = await requireSesion();
  if (sesion.rol !== rol) redirect(rutaInicial(sesion.rol));
  return sesion;
}
