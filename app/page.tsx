import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Landing provisoria. Se completa en la Fase 6 (pitch y pulido).
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium text-muted-foreground">Hackeando la Minería · San Juan</p>
      <h1 className="text-4xl font-semibold tracking-tight">Encadenamiento Minero</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Conectamos las licitaciones de las operadoras mineras con las capacidades de las pymes
        locales. Si ninguna pyme cubre un lote sola, sugerimos la alianza (UTE) que sí lo cubre.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard" className={cn(buttonVariants())}>
          Ingresar
        </Link>
        <Link href="/health" className={cn(buttonVariants({ variant: "outline" }))}>
          Estado del sistema
        </Link>
      </div>
    </main>
  );
}
