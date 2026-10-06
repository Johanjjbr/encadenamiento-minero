"use client";

import { useActionState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/actions/types";

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  successLabel?: string;
  children?: ReactNode;
  className?: string;
  /** "boton" (por defecto) o "secundario" para acciones menos importantes. */
  variante?: "boton" | "secundario";
}

/** Formulario genérico con Server Action: estado de carga, error y éxito. */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Guardando…",
  successLabel = "Guardado ✓",
  children,
  className,
  variante = "boton",
}: Props) {
  const [estado, formAction, pendiente] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
            variante === "boton"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border bg-background hover:bg-muted"
          )}
        >
          {pendiente ? pendingLabel : submitLabel}
        </button>
        {estado.error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {estado.error}
          </p>
        )}
        {estado.ok && !pendiente && (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
            {successLabel}
          </p>
        )}
      </div>
    </form>
  );
}
