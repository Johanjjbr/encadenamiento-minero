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
      className={cn("ml-2 inline-block size-1.5 rounded-full bg-current", pending ? "animate-pulse" : "opacity-0")}
    />
  );
}

export function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activo = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
        activo
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
      <Pendiente />
    </Link>
  );
}
