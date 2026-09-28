import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes de cliente ("use client").
// Cuando exista types/database.ts (Fase 2), tipar con createBrowserClient<Database>(...)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
