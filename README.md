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
npm run seed     # carga catálogo, pymes, mineras y licitaciones de demo
npm run types    # regenera types/database.ts desde Supabase
```

`npm run types` requiere Supabase CLI y `SUPABASE_PROJECT_ID` en el entorno.

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
