# TODO.md: Hoja de ruta (Hackatón)

Marcar `[x]` al completar. Prioridad: **P0** = imprescindible para el demo · **P1** = suma mucho · **P2** = si sobra tiempo.
Cada tarea tiene un criterio de aceptación (→). Trabajar en orden.

## Fase 0: Decisiones previas (15 min)
- [x] **P0** Definir catálogo de capacidades mineras y normas. → definido en `docs/DEMO.md` §2.
- [x] **P0** Diseñar el escenario de demo: 1 lote que ninguna pyme cubre sola y una UTE de 2 que sí. → definido en `docs/DEMO.md` (con resultados esperados para verificar los RPC).

## Fase 1: Setup
- [x] **P0** Inicializar Next.js + TypeScript + Tailwind + shadcn/ui. → `npm run dev` funciona.
- [x] **P0** Clientes Supabase (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`) con `@supabase/ssr` y `proxy.ts` en raíz (Next 16; en versiones anteriores se llama `middleware.ts`). → una página lee datos de Supabase sin errores.
- [x] **P0** `.env.example` y `.env.local` configurados. → conexión verificada.

## Fase 2: Base de datos
- [x] **P0** `00_init_schema.sql`: enums, tablas de `CONTEXT.md` §3, índices en FKs. Idempotente. → se ejecuta 2 veces sin error.
- [x] **P0** `01_rls.sql`: políticas de `CONTEXT.md` §5. → un usuario pyme no puede leer datos privados de otra pyme (probado con usuarios demo reales: 19 chequeos de pyme, minera y anónimo).
- [x] **P1** Generar tipos → `types/database.ts` (generado desde el proyecto real; ver README para regenerar).
- [x] **P1** Trigger o Server Action que cree `empresa` + `perfil` al registrarse. → `handle_new_user` crea ambos (ver nota de `app_metadata` en `CONTEXT.md` §5).

## Fase 3: Algoritmos (RPC)
- [x] **P0** `02_rpc_match.sql`: `calcular_match`, `ranking_lote`, `licitaciones_compatibles` según `CONTEXT.md` §4.1-4.2. → `supabase/tests/algoritmos_check.sql` pasa (verificado en el proyecto real).
- [x] **P0** `03_rpc_ute.sql`: `generar_utes` según §4.3, con comentarios de la lógica (incluye poda y dedup). → `supabase/tests/algoritmos_check.sql` pasa (verificado en el proyecto real).
- [x] **P1** Tests SQL simples (casos: pyme perfecta, pyme sin obligatorios, sin candidatas). → `supabase/tests/algoritmos_check.sql`.

## Fase 4: Seed
- [x] **P0** `scripts/seed.ts` idempotente: catálogo, 2 mineras, 5 pymes verosímiles de San Juan, 2 licitaciones con lotes y requisitos, usuarios demo. → `npm run seed` dos veces no duplica. _(verificado en el proyecto real: 24 capacidades, 7 empresas, 3 lotes, 11 requisitos, 3 usuarios sin empresas huérfanas; rankings y UTEs coinciden con `docs/DEMO.md` §6)_
- [x] **P1** Credenciales demo documentadas en README (minera y pyme).

## Fase 5: Interfaz
- [x] **P0** Layout de dashboard con navegación por rol y ruta protegida. → minera y pyme ven menús distintos. _(implementado y verificado en navegador contra un Supabase simulado; confirmar en tu entorno)_
- [x] **P0** **Vista Pyme:** editar capacidades (con niveles) y certificaciones; lista "Licitaciones compatibles" con `MatchBadge` y brecha ("te falta: X, Y"). → cambiar una capacidad modifica el score al recargar. _(implementado y verificado en navegador contra un Supabase simulado; confirmar en tu entorno)_
- [x] **P0** **Vista Minera:** listar licitaciones y lotes; ranking de candidatas por lote. → tabla ordenada con score y estado de obligatorios. _(implementado y verificado en navegador contra un Supabase simulado; confirmar en tu entorno)_
- [x] **P0** **Componente UTE Builder:** card con las pymes, qué aporta cada una y barra de cobertura hasta 100%. → se ve en la vista minera con los datos del seed. _(implementado y verificado en navegador contra un Supabase simulado; confirmar en tu entorno)_
- [x] **P1** Formulario minera: crear licitación, dividirla en lotes y cargar requisitos con peso/obligatorio. → `/dashboard/minera/nueva` (botón «Cargar ejemplo» para la demo). Al guardar calcula ranking + UTEs de cada lote. Desde el listado se puede Publicar / Cerrar / Reabrir. _(inserción con RLS + RPC verificada en el proyecto real; probar el flujo en el navegador)_
- [x] **P1** Botón "Recalcular" que dispara `generar_utes`. Estados de carga, vacío y error en todas las vistas. _(implementado y verificado en navegador contra un Supabase simulado; confirmar en tu entorno)_
- [x] **P2** Mapa/filtro por departamento. → mapa esquemático de San Juan en el panel minero y en cada lote; tocar un departamento filtra el ranking.
- [ ] **P2** Alerta a pyme cuando aparece una UTE que la incluye. Aceptar/rechazar UTE.

## Fase 6: Pitch y pruebas
- [ ] **P0** Ensayar el flujo completo: minera publica → pyme ve match incompleto → sistema sugiere UTE → minera ve la UTE al 100%. → 3 ensayos sin fallas (checklist en `docs/PITCH.md` §4).
- [ ] **P0** Deploy (Vercel + Supabase) y prueba desde otro dispositivo. Variables en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DEMO_MODE=true`, `DEMO_PASSWORD` (la service role **no** hace falta en Vercel: solo la usa el seed). En Supabase → Auth → URL Configuration, agregar la URL de Vercel.
- [x] **P0** Preparar pitch con `docs/NEGOCIO.md` (3 min + demo). → guion, demo clic por clic, Q&A y checklist en `docs/PITCH.md`. _(falta ensayarlo)_
- [x] **P1** Pulido de UI/UX y landing. → identidad «minería andina» (piedra, basalto y cobre), sidebar oscuro con íconos, avatares por empresa, anillos de score, gráfico «solas vs. en alianza», landing y login rediseñados, perfil con niveles en botones segmentados y completitud. _(revisado con capturas contra datos simulados del seed)_

## Corte de MVP
Si el tiempo aprieta, sacrificar en este orden: P2 → P1 de UI → tests → registro real (usar usuarios demo). **Nunca** sacrificar: seed, RPC de match y UTE, UTE Builder Card.
