import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
      <p className="font-medium">No encontramos lo que buscabas</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        El lote o la licitación no existe, o no pertenece a tu empresa.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
