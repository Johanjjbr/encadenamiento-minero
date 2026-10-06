import { createElement } from "react";
import {
  BadgeCheck,
  Building2,
  FlaskConical,
  Leaf,
  type LucideIcon,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícono por categoría del catálogo (ver docs/DEMO.md §2). Las normas usan BadgeCheck. */
const ICONOS: Record<string, LucideIcon> = {
  "Taller y mantenimiento": Wrench,
  "Transporte y logística": Truck,
  "Obra y construcción": Building2,
  "Servicios de apoyo": Users,
  "Seguridad y ambiente": Leaf,
  "Técnicos y profesionales": FlaskConical,
  norma: BadgeCheck,
};

export function iconoCategoria(categoria: string | null | undefined): LucideIcon {
  return (categoria && ICONOS[categoria]) || Wrench;
}

export function CategoriaIcon({ categoria, className }: { categoria: string | null | undefined; className?: string }) {
  // createElement evita declarar un componente durante el render (regla react-hooks/static-components).
  return createElement(iconoCategoria(categoria), { "aria-hidden": true, className: cn("size-4", className) });
}
