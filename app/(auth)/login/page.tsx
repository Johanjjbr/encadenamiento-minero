import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, MapPin, Target } from "lucide-react";
import { Cordillera } from "@/components/features/cordillera";
import { Logo } from "@/components/features/logo";
import { DemoAccess, LoginForm } from "@/components/features/login-form";
import { getSesion, rutaInicial } from "@/lib/auth";

const PUNTOS = [
  { icono: Target, texto: "Match explicable entre cada pyme y cada lote" },
  { icono: Handshake, texto: "Alianzas (UTE) sugeridas para cubrir el 100 %" },
  { icono: MapPin, texto: "Proveedores locales de los 19 departamentos" },
];

export default async function LoginPage() {
  const sesion = await getSesion();
  if (sesion) redirect(rutaInicial(sesion.rol));

  const modoDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar bg-estratos p-10 text-sidebar-foreground lg:flex lg:flex-col">
        <Link href="/">
          <Logo invertido />
        </Link>
        <div className="relative z-10 mt-auto mb-40 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Que el valor de la minería se quede en las pymes de San Juan.
          </h2>
          <ul className="mt-8 space-y-4">
            {PUNTOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-sm">
                <span className="grid size-9 place-items-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
                  <Icono className="size-4" aria-hidden />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <Cordillera className="absolute inset-x-0 bottom-0 h-56 text-sidebar-primary" />
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Ingresar</h1>
          <p className="mt-2 text-sm text-muted-foreground">Accedé como operadora minera o como pyme proveedora.</p>

          {modoDemo && (
            <div className="mt-8">
              <DemoAccess />
            </div>
          )}

          <div className="mt-8">
            {modoDemo && (
              <div className="mb-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> o con tu cuenta <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="rounded-2xl border bg-card p-6 shadow-xs">
              <LoginForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
