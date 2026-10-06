import type { ReactNode } from "react";
import { requireRol } from "@/lib/auth";

// Ver comentario en app/dashboard/minera/layout.tsx.
export default async function LayoutPyme({ children }: { children: ReactNode }) {
  await requireRol("pyme");
  return children;
}
