export type NivelScore = "alto" | "medio" | "bajo";

export function nivelScore(score: number): NivelScore {
  if (score >= 80) return "alto";
  if (score >= 50) return "medio";
  return "bajo";
}

export function formatPorcentaje(valor: number): string {
  return `${Math.round(valor)}%`;
}

/** Fecha "YYYY-MM-DD" -> "31 dic 2026". */
export function formatFecha(iso: string | null): string {
  if (!iso) return "Sin fecha de cierre";
  const fecha = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
