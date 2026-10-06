import { redirect } from "next/navigation";
import { requireSesion, rutaInicial } from "@/lib/auth";

export default async function DashboardIndex() {
  const sesion = await requireSesion();
  redirect(rutaInicial(sesion.rol));
}
