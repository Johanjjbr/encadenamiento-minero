import type { ReactNode } from "react";

export function EmptyState({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
      <p className="font-medium">{titulo}</p>
      {descripcion && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{descripcion}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

export function ErrorState({ mensaje }: { mensaje: string }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
      <p className="font-medium">No se pudieron cargar los datos</p>
      <p className="mt-1 opacity-90">{mensaje}</p>
    </div>
  );
}
