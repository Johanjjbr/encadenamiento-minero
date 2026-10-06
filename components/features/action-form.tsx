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
  /** Barra de acciones fija abajo (formularios largos). */
  fijo?: boolean;
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
  fijo = false,
}: Props) {
  const [estado, formAction, pendiente] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      <div
        className={cn(
          "mt-4 flex flex-wrap items-center gap-3",
          fijo && "sticky bottom-4 z-10 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur"
        )}
      >
        <button
          type="submit"
          disabled={pendiente}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium shadow-xs transition-colors disabled:opacity-60",
            variante === "boton"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border bg-card hover:bg-muted"
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
