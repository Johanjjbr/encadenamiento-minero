/** Esqueleto de carga para las páginas del panel. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-64 rounded-md bg-muted-foreground/15" />
      <div className="h-4 w-96 max-w-full rounded-md bg-muted-foreground/15" />
      <div className="h-40 rounded-xl bg-muted-foreground/15" />
      <div className="h-40 rounded-xl bg-muted-foreground/15" />
    </div>
  );
}
