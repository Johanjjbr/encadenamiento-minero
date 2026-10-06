"use client";

import { useActionState } from "react";
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
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}

const CUENTAS = [
  { cuenta: "minera", titulo: "Minera", detalle: "Minera Andes del Sur" },
  { cuenta: "pyme", titulo: "Pyme", detalle: "Taller Mecánico Cuyo" },
  { cuenta: "pyme2", titulo: "Pyme", detalle: "Seguridad Industrial Andina" },
] as const;

export function DemoAccess() {
  const [estado, formAction, pendiente] = useActionState<FormState, FormData>(loginDemo, {});

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm font-medium">Acceso demo</p>
      <div className="grid gap-2">
        {CUENTAS.map((c) => (
          <button
            key={c.cuenta}
            type="submit"
            name="cuenta"
            value={c.cuenta}
            disabled={pendiente}
            className="rounded-md border bg-background px-4 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60"
          >
            <span className="font-medium">Entrar como {c.titulo.toLowerCase()}</span>
            <span className="block text-xs text-muted-foreground">{c.detalle}</span>
          </button>
        ))}
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {estado.error}
        </p>
      )}
    </form>
  );
}
