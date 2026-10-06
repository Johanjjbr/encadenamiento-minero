# CONTEXT.md: Arquitectura y decisiones técnicas

Fuente de verdad técnica. Si el código y este documento divergen, se actualiza uno de los dos en el mismo commit.

## 1. Alcance

Búsqueda, perfiles de capacidades y vinculación demanda-oferta entre operadoras mineras y pymes locales. **No reemplaza la homologación.** Las certificaciones se guardan como `declarada` o `verificada`.

## 2. Stack

Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS, RPC en PL/pgSQL).

## 3. Modelo de datos

### Decisión clave
Capacidades y requisitos **no** son JSONB libres. Se modelan con un **catálogo controlado** y tablas relacionales. Así el algoritmo es SQL simple y verificable, y "soldadura" siempre significa lo mismo para pymes y mineras. JSONB queda solo para datos libres no usados por el algoritmo (`empresas.extras`).

### Enums
`tipo_empresa` (MINERA | PYME) · `estado_certificacion` (declarada | verificada | vencida) · `estado_licitacion` (borrador | abierta | cerrada) · `estado_ute` (sugerida | aceptada | rechazada) · `tipo_requisito` (capacidad | norma) · `rol_usuario` (minera | pyme)

### Tablas

| Tabla | Campos clave |
|---|---|
| `empresas` | `id`, `tipo`, `nombre`, `cuit` (unique), `departamento`, `descripcion`, `acepta_ute` (bool, default true), `extras` (jsonb) |
| `perfiles` | `id` (= `auth.users.id`), `empresa_id` → empresas, `rol` (minera \| pyme) |
| `catalogo_capacidades` | `id`, `codigo` (unique), `nombre`, `categoria` |
| `empresa_capacidades` | `empresa_id`, `capacidad_id`, `nivel` (1-3), PK compuesta |
| `certificaciones` | `id`, `empresa_id`, `norma` (ej. "ISO 9001"), `estado`, `vence_el` |
| `licitaciones` | `id`, `minera_id` → empresas, `titulo`, `descripcion`, `estado`, `cierre_el` |
| `lotes` | `id`, `licitacion_id`, `titulo`, `monto_estimado` (opcional) |
| `lote_requisitos` | `id`, `lote_id`, `tipo`, `capacidad_id` \| `norma` (CHECK: exactamente uno), `nivel_minimo` (default 1), `peso` (1-10), `obligatorio` (bool) |
| `matches` | `lote_id`, `empresa_id`, `score`, `cumple_obligatorios`, `cubiertos` (jsonb), `brecha` (jsonb), `calculado_en`. PK (lote_id, empresa_id). Caché del RPC. |
| `utes_sugeridas` | `id`, `lote_id`, `score_total`, `cobertura`, `estado`, `creada_en` |
| `ute_miembros` | `ute_id`, `empresa_id`, `aporte` (jsonb: requisitos que cubre), PK compuesta |

**Fraccionamiento:** una licitación grande se divide en varios `lotes`; el match y las UTEs se calculan **por lote**. Una licitación sin división tiene un solo lote.

## 4. Algoritmos (RPC en PostgreSQL)

### 4.1 Match: `calcular_match(p_lote_id, p_empresa_id)`

Para cada requisito `i` del lote se calcula `cumple_i` en [0, 1]:

- **Capacidad:** `LEAST(nivel_empresa / nivel_minimo, 1)`. Si la empresa no la tiene, 0.
- **Norma:** `verificada` = 1.0 · `declarada` = 0.6 · `vencida` o ausente = 0.

```
score = 100 × Σ(peso_i × cumple_i) / Σ(peso_i)
cumple_obligatorios = todos los requisitos obligatorios tienen cumple_i ≥ 0.6
                      (capacidades exigen cumple_i = 1)
brecha = requisitos con cumple_i < 1
```

Un requisito obligatorio sin cubrir **no descarta** a la pyme: queda marcada `cumple_obligatorios = false` y es candidata a completarse vía UTE.

Devuelve: `score`, `cumple_obligatorios`, `cubiertos`, `brecha`.

### 4.2 Otras RPC
- `ranking_lote(p_lote_id)`: empresas PYME ordenadas por score (usa/actualiza `matches`).
- `licitaciones_compatibles(p_empresa_id)`: lotes abiertos con su score para esa pyme, ordenados desc.

### 4.3 UTE Builder: `generar_utes(p_lote_id, p_max_miembros default 3)`

Es un problema de **cobertura de conjuntos**. Se resuelve con heurística greedy:

1. Candidatas: PYMES con `acepta_ute = true`.
2. Si la mejor pyme individual ya tiene score 100 y cumple obligatorios, no se genera UTE.
3. Para cada una de las 3 mejores pymes como **ancla**:
   - `brecha` = requisitos no cubiertos por el ancla.
   - Repetir hasta cobertura 100%, sin ganancia, o `p_max_miembros`:
     agregar la pyme que **maximice la cobertura incremental ponderada** de la brecha.
     Desempate: mismo `departamento`, luego mayor score individual.
4. Cobertura del conjunto: por requisito se toma `MAX(cumple_i)` entre los miembros.
   ```
   cobertura = 100 × Σ(peso_i × max_cumple_i) / Σ(peso_i)
   score_total = cobertura − 5 × (n_miembros − 1)     -- penaliza alianzas grandes
   ```
5. **Poda y deduplicación:** si al quitar un miembro la cobertura no baja, se lo elimina (evita miembros redundantes). Luego se descartan UTEs con el mismo conjunto de miembros que otra ya generada (distintas anclas pueden converger en la misma alianza).
6. **Alternativas:** si distintas anclas llegan a conjuntos de miembros distintos con buena cobertura, se persisten todos (son alternativas). Anclas y candidatas se recorren en orden determinista (cobertura desc, luego id).
7. Se persiste solo si hay ≥ 2 miembros y `cobertura` > mejor score individual. Se guardan en `utes_sugeridas` + `ute_miembros` (con `aporte`). Se re-ejecuta de forma idempotente (reemplaza las sugeridas en estado `sugerida` de ese lote). Las UTEs que la minera ya aceptó o rechazó se conservan y no se vuelven a sugerir con los mismos miembros.

## 5. Seguridad (RLS)

- `perfiles`: cada usuario ve solo el suyo.
- `empresas`: una pyme edita solo su empresa (vía `perfiles`). Las mineras leen empresas PYME con `acepta_ute = true` **o** que aparezcan en un match/UTE de sus licitaciones. Las pymes no ven datos de otras pymes salvo como miembros de una UTE sugerida que las incluye.
- `empresa_capacidades`, `certificaciones`: misma regla que `empresas`.
- `licitaciones`, `lotes`, `lote_requisitos`: escribe solo la minera dueña; lectura pública para usuarios autenticados cuando `estado = abierta`.
- `catalogo_capacidades`: lectura para todos los autenticados.
- Una pyme solo puede **declarar** certificaciones (`estado = 'declarada'`); `verificada` la carga un tercero o el service role, y las verificadas no se editan desde el cliente.
- `empresas.tipo` no es editable desde el cliente (permiso por columna). `matches`, `utes_sugeridas` (salvo `estado`) y `ute_miembros` solo se escriben desde RPC `security definer` o service role.
- Registro: el trigger `handle_new_user` crea empresa + perfil en el alta. Para vincular un usuario a una empresa **ya existente** (seed) no alcanza con `app_metadata.empresa_id`: `auth.admin.createUser` lo aplica después del alta y el trigger no lo ve, así que crea una empresa vacía. `scripts/seed.ts` re-enlaza el perfil a la empresa real y borra la vacía. `user_metadata` (controlado por el usuario) nunca decide a qué empresa se une.
- Las funciones auxiliares de `01_rls.sql` son `security definer` para evitar recursión entre políticas.
- `SUPABASE_SERVICE_ROLE_KEY` solo en `scripts/seed.ts` y código de servidor.

## 6. Estructura de directorios

```text
/
├── app/
│   ├── (auth)/                 # Login y registro B2B (elige rol)
│   ├── dashboard/
│   │   ├── minera/             # nueva/ (alta licitación), lotes/[id] (ranking, UTEs, aceptar/rechazar), empresas/ (directorio y ficha de pyme)
│   │   └── pyme/               # Perfil y capacidades, licitaciones compatibles, alertas UTE
│   └── page.tsx                # Landing / pitch
├── components/
│   ├── ui/                     # shadcn
│   └── features/               # UteBuilderCard, MatchBadge, CoverageBar, ScoreRing, MapaSanJuan, ComparativaChart, EmpresaAvatar
├── lib/
│   ├── supabase/               # client.ts, server.ts, middleware.ts
│   ├── actions/                # Server Actions (mutaciones)
│   └── utils.ts
├── types/database.ts           # Generado: supabase gen types typescript
├── scripts/seed.ts             # Catálogo + 5 pymes + 2 mineras + 2 licitaciones
├── proxy.ts                    # (Next 16) Refresco de sesión + protección de /dashboard
├── supabase/migrations/        # 00_init_schema, 01_rls, 02_rpc_match, 03_rpc_ute
└── docs/                       # CONTEXT.md, TODO.md, NEGOCIO.md
```

## 7. Reglas de diseño

- **Guardia de rol y streaming:** no poner un `loading.tsx` a nivel `app/dashboard/`. Un límite de streaming por encima de las páginas hace que `redirect()` salga como 200 + redirección del lado del cliente (y deja una petición RSC colgada) en lugar de un 307. Los esqueletos van en las páginas lentas (`pyme/perfil/loading.tsx`, `minera/lotes/[loteId]/loading.tsx`) y el guardia de rol vive en `dashboard/minera/layout.tsx` y `dashboard/pyme/layout.tsx`, por fuera de esos límites. Las páginas igual llaman a `requireRol` (un layout no se re-ejecuta al navegar entre hijas).

- El cliente React **solo presenta**: no calcula scores ni UTEs.
- Identidad visual «minería andina»: tokens en `app/globals.css` (primario cobre, sidebar basalto). Los colores de miembros de UTE (cobre, azul, verde) van en orden fijo y están validados para daltonismo entre vecinos; el nombre siempre acompaña al color.
- El mapa de San Juan es **esquemático** (tile map), no a escala: se aclara en la propia UI.
- Migraciones idempotentes y numeradas; se ejecutan en orden en el SQL Editor de Supabase. (El CLI `db push` espera nombres con timestamp; si se migra a CLI, renombrar.)
- Seed determinista: correrlo dos veces no duplica datos (`ON CONFLICT DO NOTHING/UPDATE`).
- Los datos de demo deben producir al menos un caso donde ninguna pyme llega al 100% y una UTE de 2 pymes sí.
