import { cn } from "@/lib/utils";

// Tonos tierra para los avatares. Se elige por hash del id: la misma empresa
// tiene siempre el mismo color. El nombre se muestra siempre al lado, así que
// el color nunca es lo único que identifica a la empresa.
const TONOS = [
  "bg-orange-100 text-orange-900 ring-orange-200",
  "bg-sky-100 text-sky-900 ring-sky-200",
  "bg-lime-100 text-lime-900 ring-lime-200",
  "bg-amber-100 text-amber-900 ring-amber-200",
  "bg-stone-200 text-stone-800 ring-stone-300",
  "bg-rose-100 text-rose-900 ring-rose-200",
  "bg-teal-100 text-teal-900 ring-teal-200",
] as const;

const PALABRAS_VACIAS = new Set(["de", "del", "la", "las", "el", "los", "y", "s.a.", "srl", "s.r.l."]);

export function iniciales(nombre: string): string {
  const palabras = nombre
    .split(/\s+/)
    .filter((p) => p && !PALABRAS_VACIAS.has(p.toLowerCase()));
  return (palabras[0]?.[0] ?? "?").concat(palabras[1]?.[0] ?? "").toUpperCase();
}

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function EmpresaAvatar({
  id,
  nombre,
  size = "md",
  className,
}: {
  id: string;
  nombre: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-semibold ring-1 ring-inset",
        TONOS[hash(id) % TONOS.length],
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-12 text-sm",
        className
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Avatares superpuestos (miembros de una UTE). */
export function AvatarGrupo({ empresas }: { empresas: { id: string; nombre: string }[] }) {
  return (
    <span className="flex -space-x-1">
      {empresas.map((e) => (
        <EmpresaAvatar key={e.id} id={e.id} nombre={e.nombre} size="sm" className="ring-2 ring-card" />
      ))}
    </span>
  );
}
