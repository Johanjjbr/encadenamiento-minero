import Link from "next/link";
import { PageHeader } from "@/components/features/page-header";
import { LicitacionForm } from "@/components/features/licitacion-form";
import { ErrorState } from "@/components/features/state-messages";
import { requireRol } from "@/lib/auth";
import { CATEGORIAS_ORDEN } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function NuevaLicitacionPage() {
  await requireRol("minera");
  const supabase = await createClient();

  const { data: catalogo, error } = await supabase
    .from("catalogo_capacidades")
    .select("id, codigo, nombre, categoria")
    .order("nombre");

  if (error) return <ErrorState mensaje={error.message} />;

  // Categorías conocidas primero (mismo orden que el perfil pyme); las nuevas, al final.
  const extra = Array.from(new Set((catalogo ?? []).map((c) => c.categoria)))
    .filter((c) => !(CATEGORIAS_ORDEN as readonly string[]).includes(c))
    .sort((a, b) => a.localeCompare(b, "es"));

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta">
        <Link href="/dashboard/minera" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Licitaciones
        </Link>
      </nav>
      <PageHeader
        eyebrow="Nueva licitación"
        titulo="Publicar licitación"
        descripcion="Dividí el contrato en lotes y cargá los requisitos de cada uno. Al guardar, la plataforma calcula el ranking de pymes y sugiere UTEs cuando ninguna llega sola."
      />

      {(catalogo ?? []).length === 0 ? (
        <ErrorState mensaje="El catálogo de capacidades está vacío. Corré `npm run seed` para cargarlo." />
      ) : (
        <LicitacionForm catalogo={catalogo ?? []} categorias={[...CATEGORIAS_ORDEN, ...extra]} />
      )}
    </div>
  );
}
