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
- [ ] **P0** `00_init_schema.sql`: enums, tablas de `CONTEXT.md` §3, índices en FKs. Idempotente. → se ejecuta 2 veces sin error.
- [ ] **P0** `01_rls.sql`: políticas de `CONTEXT.md` §5. → un usuario pyme no puede leer datos privados de otra pyme (probado con 2 usuarios).
- [ ] **P1** Generar tipos: `npm run types` → `types/database.ts` sin errores de compilación.
- [ ] **P1** Trigger o Server Action que cree `empresa` + `perfil` al registrarse. → registro completo crea ambos.

## Fase 3: Algoritmos (RPC)
- [ ] **P0** `02_rpc_match.sql`: `calcular_match`, `ranking_lote`, `licitaciones_compatibles` según `CONTEXT.md` §4.1-4.2. → `supabase/tests/algoritmos_check.sql` pasa los 3 casos.
- [ ] **P0** `03_rpc_ute.sql`: `generar_utes` según §4.3, con comentarios de la lógica (incluye poda y dedup). → `supabase/tests/algoritmos_check.sql` pasa los 3 casos.
- [x] **P1** Tests SQL simples (casos: pyme perfecta, pyme sin obligatorios, sin candidatas). → `supabase/tests/algoritmos_check.sql`.

## Fase 4: Seed
- [ ] **P0** `scripts/seed.ts` idempotente: catálogo, 2 mineras, 5 pymes verosímiles de San Juan, 2 licitaciones con lotes y requisitos, usuarios demo. → `npm run seed` dos veces no duplica.
- [ ] **P1** Credenciales demo documentadas en README (minera y pyme).

## Fase 5: Interfaz
- [ ] **P0** Layout de dashboard con navegación por rol y ruta protegida. → minera y pyme ven menús distintos.
- [ ] **P0** **Vista Pyme:** editar capacidades (con niveles) y certificaciones; lista "Licitaciones compatibles" con `MatchBadge` y brecha ("te falta: X, Y"). → cambiar una capacidad modifica el score al recargar.
- [ ] **P0** **Vista Minera:** listar licitaciones y lotes; ranking de candidatas por lote. → tabla ordenada con score y estado de obligatorios.
- [ ] **P0** **Componente UTE Builder:** card con las pymes, qué aporta cada una y barra de cobertura hasta 100%. → se ve en la vista minera con los datos del seed.
- [ ] **P1** Formulario minera: crear licitación, dividirla en lotes y cargar requisitos con peso/obligatorio.
- [ ] **P1** Botón "Recalcular" que dispara `generar_utes`. Estados de carga, vacío y error en todas las vistas.
- [ ] **P2** Mapa/filtro por departamento. Alerta a pyme cuando aparece una UTE que la incluye. Aceptar/rechazar UTE.

## Fase 6: Pitch y pruebas
- [ ] **P0** Ensayar el flujo completo: minera publica → pyme ve match incompleto → sistema sugiere UTE → minera ve la UTE al 100%. → 3 ensayos sin fallas.
- [ ] **P0** Deploy (Vercel + Supabase) y prueba desde otro dispositivo.
- [ ] **P0** Preparar pitch con `docs/NEGOCIO.md` (3 min + demo).
- [ ] **P1** Pulido de UI/UX y landing.

## Corte de MVP
Si el tiempo aprieta, sacrificar en este orden: P2 → P1 de UI → tests → registro real (usar usuarios demo). **Nunca** sacrificar: seed, RPC de match y UTE, UTE Builder Card.
