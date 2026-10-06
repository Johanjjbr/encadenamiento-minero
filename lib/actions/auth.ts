"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completá el email y la contraseña.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos.", email };

  redirect("/dashboard");
}

const CUENTAS_DEMO: Record<string, string> = {
  minera: "minera.demo@example.com",
  pyme: "pyme.demo@example.com",
  pyme2: "pyme2.demo@example.com",
};

/** Acceso de un clic para la demo. La contraseña vive solo en el servidor
 *  (DEMO_PASSWORD) y el atajo se apaga con NEXT_PUBLIC_DEMO_MODE != "true". */
export async function loginDemo(_prev: FormState, formData: FormData): Promise<FormState> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return { error: "El acceso demo está deshabilitado." };
  }
  const email = CUENTAS_DEMO[String(formData.get("cuenta") ?? "")];
  if (!email) return { error: "Cuenta demo desconocida." };

  const password = process.env.DEMO_PASSWORD;
  if (!password) return { error: "Falta DEMO_PASSWORD en las variables de entorno del servidor." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "No se pudo entrar con la cuenta demo. ¿Corriste el seed y coincide DEMO_PASSWORD?" };
  }

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
