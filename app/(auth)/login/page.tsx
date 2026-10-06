import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoAccess, LoginForm } from "@/components/features/login-form";
import { getSesion, rutaInicial } from "@/lib/auth";

export default async function LoginPage() {
  const sesion = await getSesion();
  if (sesion) redirect(rutaInicial(sesion.rol));

  const modoDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm font-semibold tracking-tight">
        ⛏ Encadenamiento minero
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Accedé como operadora minera o como pyme proveedora.</p>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <LoginForm />
      </div>

      {modoDemo && (
        <div className="mt-4 rounded-xl border border-dashed bg-card/50 p-6">
          <DemoAccess />
        </div>
      )}
    </main>
  );
}
