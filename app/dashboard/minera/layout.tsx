import type { ReactNode } from "react";
import { requireRol } from "@/lib/auth";

// Guardia de rol temprano: este layout queda por fuera de los límites de loading.tsx,
// así que el redirect sale como un 307 real (y no como redirección del lado del cliente).
// Las páginas igual vuelven a validar el rol: un layout no se re-ejecuta al navegar entre hijas.
export default async function LayoutMinera({ children }: { children: ReactNode }) {
  await requireRol("minera");
  return children;
}
