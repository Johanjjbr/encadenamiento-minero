import type { ReactNode } from "react";
import { NavLink } from "@/components/features/nav-link";
import { requireSesion } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const MENU = {
  minera: [
    { href: "/dashboard/minera", etiqueta: "Licitaciones y candidatas", exact: true },
    { href: "/dashboard/minera/nueva", etiqueta: "Publicar licitación", exact: false },
  ],
  pyme: [
    { href: "/dashboard/pyme", etiqueta: "Licitaciones compatibles", exact: true },
    { href: "/dashboard/pyme/perfil", etiqueta: "Mi perfil", exact: false },
  ],
} as const;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const sesion = await requireSesion();
  const items = MENU[sesion.rol];

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <aside className="border-b bg-background md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex flex-col gap-4 p-4 md:h-full">
          <div>
            <p className="text-sm font-semibold tracking-tight">⛏ Encadenamiento minero</p>
            <p className="mt-3 text-sm font-medium leading-tight">{sesion.empresa.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {sesion.rol === "minera" ? "Operadora minera" : "Pyme proveedora"}
              {sesion.empresa.departamento ? ` · ${sesion.empresa.departamento}` : ""}
            </p>
          </div>

          <nav aria-label="Principal" className="flex gap-1 overflow-x-auto md:flex-col">
            {items.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact}>
                {item.etiqueta}
              </NavLink>
            ))}
          </nav>

          <form action={logout} className="md:mt-auto">
            <button
              type="submit"
              className="w-full rounded-md border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
