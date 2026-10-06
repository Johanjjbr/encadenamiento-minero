"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Punto que late mientras la navegación está en curso (feedback al tocar el ítem). */
function Pendiente() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      data-pendiente={pending ? "true" : "false"}
      className={cn("ml-auto inline-block size-1.5 rounded-full bg-current", pending ? "animate-pulse" : "opacity-0")}
    />
  );
}

export function NavLink({
  href,
  exact = false,
  icono,
  children,
}: {
  href: string;
  exact?: boolean;
  icono?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activo = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        activo
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      {icono}
      {children}
      <Pendiente />
    </Link>
  );
}
