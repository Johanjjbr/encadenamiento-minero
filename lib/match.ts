import type { Json } from "@/types/database";

// Los campos jsonb (matches.brecha, ute_miembros.aporte) llegan sin tipo desde
// la base. Se parsean de forma defensiva en vez de castear a ciegas.

export interface BrechaItem {
  requisitoId: string;
  nombre: string;
  cumple: number;
  obligatorio: boolean;
}

export interface AporteItem {
  requisitoId: string;
  nombre: string;
  cumple: number;
}

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function parseBrecha(json: Json): BrechaItem[] {
  if (!Array.isArray(json)) return [];
  const salida: BrechaItem[] = [];
  for (const item of json) {
    if (!esObjeto(item)) continue;
    salida.push({
      requisitoId: String(item.requisito_id ?? ""),
      nombre: String(item.nombre ?? "Requisito"),
      cumple: Number(item.cumple ?? 0),
      obligatorio: item.obligatorio === true,
    });
  }
  return salida;
}

export function parseAporte(json: Json): AporteItem[] {
  if (!Array.isArray(json)) return [];
  const salida: AporteItem[] = [];
  for (const item of json) {
    if (!esObjeto(item)) continue;
    salida.push({
      requisitoId: String(item.requisito_id ?? ""),
      nombre: String(item.nombre ?? "Requisito"),
      cumple: Number(item.cumple ?? 0),
    });
  }
  return salida;
}
