"use client";

import { useActionState } from "react";
import { ArrowRight, HardHat, Pickaxe, Sparkles, Wrench } from "lucide-react";
import { login, loginDemo } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/types";

const CAMPO =
  "mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LoginForm() {
  const [estado, formAction, pendiente] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.email ?? ""}
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={CAMPO} />
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}

const CUENTAS = [
  { cuenta: "minera", rol: "Operadora minera", detalle: "Minera Andes del Sur", icono: Pickaxe },
  { cuenta: "pyme", rol: "Pyme proveedora", detalle: "Taller Mecánico Cuyo", icono: Wrench },
  { cuenta: "pyme2", rol: "Pyme proveedora", detalle: "Seguridad Industrial Andina", icono: HardHat },
] as const;

export function DemoAccess() {
  const [estado, formAction, pendiente] = useActionState<FormState, FormData>(loginDemo, {});

  return (
    <form action={formAction} className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden /> Probá la demo en un clic
      </p>
      <div className="grid gap-2.5">
        {CUENTAS.map(({ cuenta, rol, detalle, icono: Icono }) => (
          <button
            key={cuenta}
            type="submit"
            name="cuenta"
            value={cuenta}
            disabled={pendiente}
            className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-xs transition hover:-translate-y-px hover:border-primary/50 hover:shadow-md disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icono className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Entrar como {detalle}</span>
              <span className="block text-xs text-muted-foreground">{rol}</span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        ))}
      </div>
      {pendiente && <p className="text-xs text-muted-foreground">Entrando…</p>}
      {estado.error && (
        <p role="alert" className="text-sm text-rose-700">
          {estado.error}
        </p>
      )}
    </form>
  );
}
