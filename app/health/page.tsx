// Página temporal para verificar la conexión con Supabase (Fase 1).
// Se puede borrar al terminar la Fase 2.
export const dynamic = "force-dynamic";

async function checkSupabase(): Promise<{ ok: boolean; detail: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { ok: false, detail: "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local" };
  }

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, detail: `Supabase respondió ${res.status}. Revisá la URL y la anon key.` };
    }
    return { ok: true, detail: "Conexión con Supabase correcta." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { ok: false, detail: `No se pudo conectar: ${message}` };
  }
}

export default async function HealthPage() {
  const { ok, detail } = await checkSupabase();

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-xl font-medium">Health check</h1>
      <p className={ok ? "text-green-600" : "text-red-600"}>
        {ok ? "OK: " : "Error: "}
        {detail}
      </p>
    </main>
  );
}
