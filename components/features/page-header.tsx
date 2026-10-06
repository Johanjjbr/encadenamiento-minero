import type { ReactNode } from "react";

/** Encabezado de página del panel: título, bajada y acciones a la derecha. */
export function PageHeader({
  eyebrow,
  titulo,
  descripcion,
  acciones,
}: {
  eyebrow?: ReactNode;
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-2 text-sm text-muted-foreground md:text-base">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}
