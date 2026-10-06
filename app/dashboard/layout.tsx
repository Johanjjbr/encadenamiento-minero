import type { ReactNode } from "react";
import { FilePlus2, LayoutDashboard, ListChecks, LogOut, UserCog } from "lucide-react";
import { EmpresaAvatar } from "@/components/features/empresa-avatar";
import { Logo } from "@/components/features/logo";
import { NavLink } from "@/components/features/nav-link";
import { requireSesion } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const ICONO = "size-4 shrink-0";

const MENU = {
  minera: [
    { href: "/dashboard/minera", etiqueta: "Licitaciones y candidatas", exact: true, icono: <LayoutDashboard className={ICONO} aria-hidden /> },
    { href: "/dashboard/minera/nueva", etiqueta: "Publicar licitación", exact: false, icono: <FilePlus2 className={ICONO} aria-hidden /> },
  ],
  pyme: [
    { href: "/dashboard/pyme", etiqueta: "Licitaciones compatibles", exact: true, icono: <ListChecks className={ICONO} aria-hidden /> },
    { href: "/dashboard/pyme/perfil", etiqueta: "Mi perfil", exact: false, icono: <UserCog className={ICONO} aria-hidden /> },
  ],
} as const;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const sesion = await requireSesion();
  const items = MENU[sesion.rol];

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-sidebar bg-estratos text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0">
        <div className="flex flex-col gap-6 p-4 md:h-full md:p-5">
          <Logo invertido />

          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
            <EmpresaAvatar id={sesion.empresa.id} nombre={sesion.empresa.nombre} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight text-sidebar-accent-foreground">
                {sesion.empresa.nombre}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {sesion.rol === "minera" ? "Operadora minera" : "Pyme proveedora"}
                {sesion.empresa.departamento ? ` · ${sesion.empresa.departamento}` : ""}
              </p>
            </div>
          </div>

          <nav aria-label="Principal" className="flex gap-1 overflow-x-auto md:flex-col">
            {items.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact} icono={item.icono}>
                {item.etiqueta}
              </NavLink>
            ))}
          </nav>

          <div className="hidden rounded-xl border border-sidebar-border p-3 text-xs leading-relaxed text-sidebar-foreground/60 md:mt-auto md:block">
            Las certificaciones se muestran como <span className="text-sidebar-foreground">declaradas</span> o{" "}
            <span className="text-sidebar-foreground">verificadas</span>. La plataforma no reemplaza la homologación.
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className={ICONO} aria-hidden />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
