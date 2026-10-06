# ⛏️ Encadenamiento Minero

**Plataforma de mapeo, calificación y vinculación algorítmica de proveedores locales.**
Proyecto para el Hackatón "Hackeando la Minería" (Ciclo Pilares, San Juan) · Desafío: *Mapeo y vinculación de proveedores locales*.

## El problema

El mayor retorno de la minería para la provincia está en los encadenamientos productivos locales, pero las pymes sanjuaninas quedan afuera de las cadenas de valor por falta de visibilidad, certificaciones y escala para cubrir contratos grandes.

## La solución

Un mercado digital B2B que conecta operadoras mineras con pymes locales:

1. **Match Score:** compara automáticamente el perfil de cada pyme (capacidades + certificaciones) contra los requisitos de cada lote de una licitación y devuelve un puntaje 0-100 con el detalle de qué cubre y qué le falta.
2. **UTE Builder:** cuando ninguna pyme llega sola, sugiere Uniones Transitorias de Empresas entre pymes con capacidades complementarias hasta cubrir el 100% del lote.
3. **Fraccionamiento:** las licitaciones se dividen en lotes más chicos, accesibles para pymes.
4. **Modelo de negocio:** ver [`docs/NEGOCIO.md`](docs/NEGOCIO.md).

> **Alcance:** la plataforma hace búsqueda, perfiles de capacidades y vinculación entre demanda y oferta. **No reemplaza los procesos de homologación** de las operadoras. Las certificaciones se muestran como *declaradas* o *verificadas*.

## Flujo de demo

Minera publica licitación con lotes → pyme ve su match parcial y qué le falta → el sistema sugiere una UTE → la minera ve la UTE con 100% de cobertura.

## Stack

- **Frontend:** Next.js (App Router) · React · TypeScript estricto · Tailwind CSS · shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, RLS, funciones RPC en PL/pgSQL)
- **Entorno de desarrollo asistido:** OpenCode (ver `AGENTS.md`)

## Requisitos

- Node.js 18+
- Cuenta de Supabase (proyecto creado)
- Supabase CLI (opcional, solo para generar tipos)

## Instalación

```bash
git clone <repo-url>
cd encadenamiento-minero
npm install
cp .env.example .env.local
```

Completá `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Solo servidor / scripts. NUNCA con prefijo NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=...

# Acceso demo (botones "Entrar como ..." en /login). Solo para entornos de demo.
NEXT_PUBLIC_DEMO_MODE=true
DEMO_PASSWORD=Demo-Minero-2026   # la misma con la que corriste el seed
```

## Base de datos

En el **SQL Editor** de Supabase, ejecutá en orden los archivos de `supabase/migrations/`:

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `00_init_schema.sql` | Enums, tablas, índices |
| 2 | `01_rls.sql` | Políticas Row Level Security |
| 3 | `02_rpc_match.sql` | `calcular_match`, `ranking_lote`, `licitaciones_compatibles` |
| 4 | `03_rpc_ute.sql` | `generar_utes` |

Todos son idempotentes (se pueden re-ejecutar sin romper nada).

Luego cargá los datos de demo:

```bash
npm run seed
```

## Comandos

```bash
npm run dev      # servidor de desarrollo en http://localhost:3000
npm run build    # build de producción
npm run seed     # carga catálogo, pymes, mineras, licitaciones y usuarios de demo
```

El script `seed` hay que registrarlo una sola vez en `package.json` (requiere Node 20.6+):

```bash
npm pkg set "scripts.seed=tsx --env-file=.env.local scripts/seed.ts"
```

El seed es **idempotente** (IDs fijos + upsert): se puede correr todas las veces que haga falta sin duplicar datos. Al terminar calcula rankings y UTEs y verifica los resultados esperados de [`docs/DEMO.md`](docs/DEMO.md); si algo no coincide, termina con error y marca con ✗ qué fila difiere.

Para regenerar `types/database.ts` tras cambiar el esquema (requiere `npx supabase login` una vez):

```bash
# macOS / Linux / Git Bash
npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.ts

# Windows PowerShell (evita que el archivo quede en UTF-16)
npx supabase gen types typescript --project-id TU_PROJECT_ID | Out-File -Encoding utf8 types/database.ts
```

## Recorrido de la demo

1. `npm run dev` y abrir `http://localhost:3000/login` → «Entrar como minera».
2. **Licitaciones y candidatas** → *Mantenimiento de flota*: el ranking muestra que nadie pasa del 64 % y la card del **UTE Builder** sugiere Taller Mecánico Cuyo + Seguridad Industrial Andina al 100 %.
3. Cerrar sesión → «Entrar como pyme» (Cuyo): ve su 63 %, qué le falta («HSE», obligatorio) y la alianza sugerida.
4. (Opcional) Como minera, **Publicar licitación** → «Cargar ejemplo» → *Publicar*: el sistema calcula al instante el ranking y las UTEs de cada lote nuevo.
5. **Mi perfil**: subir «HSE» a nivel 2 y guardar; al volver a *Licitaciones compatibles* el score cambia. (Dejalo en «No ofrece» después para no alterar la demo: `npm run seed` no quita capacidades que agregues a mano.)

## Usuarios de demo

Los crea `npm run seed`. Contraseña por defecto: `Demo-Minero-2026` (se puede cambiar con la variable `DEMO_PASSWORD` en `.env.local` antes de correr el seed). Son solo para demo: no los uses en un entorno con datos reales.

| Rol | Email | Empresa |
|---|---|---|
| Minera | `minera.demo@example.com` | Minera Andes del Sur |
| Pyme | `pyme.demo@example.com` | Taller Mecánico Cuyo |
| Pyme | `pyme2.demo@example.com` | Seguridad Industrial Andina |

## Estructura

```text
app/            Rutas (auth, dashboard/minera, dashboard/pyme)
components/     ui/ (shadcn) y features/ (UteBuilderCard, MatchBadge)
lib/supabase/   Clientes browser / server / middleware
types/          Tipos generados de la DB
scripts/        seed.ts
supabase/       migrations/
docs/           CONTEXT.md, TODO.md, NEGOCIO.md
```

## Documentación del proyecto

- [`AGENTS.md`](AGENTS.md): reglas y rol del agente de IA
- [`docs/CONTEXT.md`](docs/CONTEXT.md): arquitectura, modelo de datos y algoritmos
- [`docs/TODO.md`](docs/TODO.md): hoja de ruta con criterios de aceptación
- [`docs/NEGOCIO.md`](docs/NEGOCIO.md): modelo de negocio y guion de pitch
- [`docs/DEMO.md`](docs/DEMO.md): escenario de demo, datos del seed y resultados esperados

## Equipo

_Completar._
