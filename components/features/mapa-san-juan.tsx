import Link from "next/link";
import { Pickaxe } from "lucide-react";
import { cn } from "@/lib/utils";

// Mapa ESQUEMÁTICO (tile map) de los 19 departamentos de San Juan: cada
// departamento es una celda ubicada aproximadamente según su posición real
// (cordillera al oeste, Gran San Juan al centro). No es un mapa a escala.
// col/fila en una grilla de 5 × 6; w/h = celdas que ocupa.
const CELDAS: { depto: string; col: number; fila: number; w?: number; h?: number }[] = [
  { depto: "Iglesia", col: 1, fila: 1 },
  { depto: "Jáchal", col: 2, fila: 1, w: 2 },
  { depto: "Valle Fértil", col: 4, fila: 1, w: 2, h: 2 },
  { depto: "Calingasta", col: 1, fila: 2, h: 4 },
  { depto: "Ullúm", col: 2, fila: 2 },
  { depto: "Albardón", col: 3, fila: 2 },
  { depto: "Zonda", col: 2, fila: 3 },
  { depto: "Chimbas", col: 3, fila: 3 },
  { depto: "Angaco", col: 4, fila: 3 },
  { depto: "San Martín", col: 5, fila: 3 },
  { depto: "Rivadavia", col: 2, fila: 4 },
  { depto: "Capital", col: 3, fila: 4 },
  { depto: "Santa Lucía", col: 4, fila: 4 },
  { depto: "Caucete", col: 5, fila: 4 },
  { depto: "Pocito", col: 2, fila: 5 },
  { depto: "Rawson", col: 3, fila: 5 },
  { depto: "9 de Julio", col: 4, fila: 5 },
  { depto: "25 de Mayo", col: 5, fila: 5 },
  { depto: "Sarmiento", col: 2, fila: 6, w: 2 },
];

// Escala secuencial de un solo tono (cobre), de claro a oscuro según cantidad.
// El número de pymes va escrito en la celda: el color no es lo único que lo comunica.
function tono(cantidad: number): string {
  if (cantidad <= 0) return "bg-muted/70 text-muted-foreground";
  if (cantidad === 1) return "bg-orange-200 text-orange-950";
  if (cantidad === 2) return "bg-orange-400 text-orange-950";
  return "bg-orange-700 text-white";
}

export interface DatoDepartamento {
  cantidad: number;
  /** Nombres de las pymes (para el tooltip). */
  nombres?: string[];
}

export function MapaSanJuan({
  datos,
  mina,
  activo,
  hrefFiltro,
  hrefLimpiar,
  unidad = "pymes",
}: {
  datos: Record<string, DatoDepartamento>;
  /** Departamento donde está la operación minera (marcador). */
  mina?: string | null;
  /** Departamento filtrado actualmente. */
  activo?: string | null;
  /** Si se pasa, cada celda con datos es un link que filtra por departamento. */
  hrefFiltro?: (depto: string) => string;
  hrefLimpiar?: string;
  unidad?: string;
}) {
  const total = Object.values(datos).reduce((a, d) => a + d.cantidad, 0);

  return (
    <figure className="space-y-3">
      <div
        className="grid aspect-[5/6] max-h-[420px] w-full grid-cols-5 grid-rows-6 gap-1"
        role="list"
        aria-label={`Mapa esquemático de San Juan: ${total} ${unidad} por departamento`}
      >
        {CELDAS.map((c) => {
          const dato = datos[c.depto] ?? { cantidad: 0 };
          const esMina = mina === c.depto;
          const esActivo = activo === c.depto;
          const titulo = [
            `${c.depto}: ${dato.cantidad} ${unidad}`,
            ...(dato.nombres ?? []),
            esMina ? "Operación minera" : "",
          ]
            .filter(Boolean)
            .join("\n");

          const contenido = (
            <>
              <span className="text-[10px] font-medium leading-tight [hyphens:auto] sm:text-[11px]">{c.depto}</span>
              <span className="flex items-end justify-between">
                {esMina ? <Pickaxe className="size-3.5" aria-label="Operación minera" /> : <span />}
                {dato.cantidad > 0 && <span className="text-sm font-semibold tabular-nums">{dato.cantidad}</span>}
              </span>
            </>
          );

          const clases = cn(
            "flex min-h-0 flex-col justify-between rounded-md p-1.5 transition",
            tono(dato.cantidad),
            esMina && "ring-2 ring-inset ring-stone-800",
            esActivo && "outline outline-2 outline-offset-1 outline-primary"
          );
          const estilo = {
            gridColumn: `${c.col} / span ${c.w ?? 1}`,
            gridRow: `${c.fila} / span ${c.h ?? 1}`,
          };

          return hrefFiltro && dato.cantidad > 0 ? (
            <Link
              key={c.depto}
              role="listitem"
              href={hrefFiltro(c.depto)}
              title={titulo}
              aria-current={esActivo ? "true" : undefined}
              className={cn(clases, "hover:brightness-95 hover:ring-2 hover:ring-primary/60")}
              style={estilo}
              scroll={false}
            >
              {contenido}
            </Link>
          ) : (
            <div key={c.depto} role="listitem" title={titulo} className={clases} style={estilo}>
              {contenido}
            </div>
          );
        })}
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {[
            { etiqueta: "0", clase: "bg-muted" },
            { etiqueta: "1", clase: "bg-orange-200" },
            { etiqueta: "2", clase: "bg-orange-400" },
            { etiqueta: "3+", clase: "bg-orange-700" },
          ].map((l) => (
            <span key={l.etiqueta} className="flex items-center gap-1">
              <span className={cn("size-3 rounded-sm", l.clase)} aria-hidden />
              {l.etiqueta}
            </span>
          ))}
          <span className="ml-1">{unidad}</span>
        </span>
        {mina && (
          <span className="flex items-center gap-1">
            <Pickaxe className="size-3.5" aria-hidden /> Operación minera
          </span>
        )}
        {activo && hrefLimpiar && (
          <Link href={hrefLimpiar} scroll={false} className="font-medium text-primary hover:underline">
            Ver todos los departamentos
          </Link>
        )}
      </figcaption>
      <p className="text-[11px] text-muted-foreground">Mapa esquemático: la ubicación de cada departamento es aproximada.</p>
    </figure>
  );
}
