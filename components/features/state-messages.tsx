import { Inbox, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  titulo,
  descripcion,
  children,
  icono: Icono = Inbox,
}: {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  icono?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icono className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-semibold">{titulo}</p>
      {descripcion && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{descripcion}</p>}
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </div>
  );
}

export function ErrorState({ mensaje }: { mensaje: string }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">No se pudieron cargar los datos</p>
        <p className="mt-1 opacity-90">{mensaje}</p>
      </div>
    </div>
  );
}
