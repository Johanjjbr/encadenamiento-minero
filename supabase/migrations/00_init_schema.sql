-- =====================================================================
-- 00_init_schema.sql
-- Esquema base de la plataforma de encadenamiento minero.
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- No contiene DROP TABLE ni borrados de datos. Ver docs/CONTEXT.md §3.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.tipo_empresa as enum ('MINERA', 'PYME');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rol_usuario as enum ('minera', 'pyme');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_certificacion as enum ('declarada', 'verificada', 'vencida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_licitacion as enum ('borrador', 'abierta', 'cerrada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_ute as enum ('sugerida', 'aceptada', 'rechazada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_requisito as enum ('capacidad', 'norma');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------
create table if not exists public.empresas (
  id            uuid primary key default gen_random_uuid(),
  tipo          public.tipo_empresa not null,
  nombre        text not null,
  cuit          text unique,
  departamento  text,
  descripcion   text,
  acepta_ute    boolean not null default true,
  extras        jsonb not null default '{}'::jsonb,
  creada_en     timestamptz not null default now()
);

-- Vincula auth.users con una empresa y un rol.
create table if not exists public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete set null,
  rol         public.rol_usuario not null,
  creado_en   timestamptz not null default now()
);

-- Vocabulario controlado: evita que "soldadura" signifique cosas distintas.
create table if not exists public.catalogo_capacidades (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  nombre     text not null,
  categoria  text not null
);

create table if not exists public.empresa_capacidades (
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  capacidad_id  uuid not null references public.catalogo_capacidades (id) on delete cascade,
  nivel         smallint not null check (nivel between 1 and 3),
  primary key (empresa_id, capacidad_id)
);

create table if not exists public.certificaciones (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  norma       text not null,
  estado      public.estado_certificacion not null default 'declarada',
  vence_el    date,
  unique (empresa_id, norma)
);

create table if not exists public.licitaciones (
  id           uuid primary key default gen_random_uuid(),
  minera_id    uuid not null references public.empresas (id) on delete cascade,
  titulo       text not null,
  descripcion  text,
  estado       public.estado_licitacion not null default 'borrador',
  cierre_el    date,
  creada_en    timestamptz not null default now()
);

-- Fraccionamiento: una licitación grande se divide en lotes.
create table if not exists public.lotes (
  id              uuid primary key default gen_random_uuid(),
  licitacion_id   uuid not null references public.licitaciones (id) on delete cascade,
  titulo          text not null,
  monto_estimado  numeric(14, 2)
);

create table if not exists public.lote_requisitos (
  id             uuid primary key default gen_random_uuid(),
  lote_id        uuid not null references public.lotes (id) on delete cascade,
  tipo           public.tipo_requisito not null,
  capacidad_id   uuid references public.catalogo_capacidades (id) on delete restrict,
  norma          text,
  nivel_minimo   smallint not null default 1 check (nivel_minimo between 1 and 3),
  peso           smallint not null default 5 check (peso between 1 and 10),
  obligatorio    boolean not null default false,
  -- Exactamente uno de los dos según el tipo.
  constraint lote_requisitos_tipo_chk check (
    (tipo = 'capacidad' and capacidad_id is not null and norma is null)
    or (tipo = 'norma' and norma is not null and capacidad_id is null)
  )
);

-- Caché del resultado de calcular_match (se escribe solo desde RPC).
create table if not exists public.matches (
  lote_id              uuid not null references public.lotes (id) on delete cascade,
  empresa_id           uuid not null references public.empresas (id) on delete cascade,
  score                numeric(5, 2) not null,
  cumple_obligatorios  boolean not null,
  cubiertos            jsonb not null default '[]'::jsonb,
  brecha               jsonb not null default '[]'::jsonb,
  calculado_en         timestamptz not null default now(),
  primary key (lote_id, empresa_id)
);

create table if not exists public.utes_sugeridas (
  id           uuid primary key default gen_random_uuid(),
  lote_id      uuid not null references public.lotes (id) on delete cascade,
  score_total  numeric(5, 2) not null,
  cobertura    numeric(5, 2) not null,
  estado       public.estado_ute not null default 'sugerida',
  creada_en    timestamptz not null default now()
);

create table if not exists public.ute_miembros (
  ute_id      uuid not null references public.utes_sugeridas (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  aporte      jsonb not null default '[]'::jsonb,
  primary key (ute_id, empresa_id)
);

-- ---------------------------------------------------------------------
-- ÍNDICES (FKs y filtros frecuentes)
-- ---------------------------------------------------------------------
create index if not exists idx_perfiles_empresa            on public.perfiles (empresa_id);
create index if not exists idx_empresa_capacidades_cap     on public.empresa_capacidades (capacidad_id);
create index if not exists idx_certificaciones_empresa     on public.certificaciones (empresa_id);
create index if not exists idx_licitaciones_minera         on public.licitaciones (minera_id);
create index if not exists idx_licitaciones_estado         on public.licitaciones (estado);
create index if not exists idx_lotes_licitacion            on public.lotes (licitacion_id);
create index if not exists idx_lote_requisitos_lote        on public.lote_requisitos (lote_id);
create index if not exists idx_matches_empresa             on public.matches (empresa_id);
create index if not exists idx_utes_lote                   on public.utes_sugeridas (lote_id);
create index if not exists idx_ute_miembros_empresa        on public.ute_miembros (empresa_id);

-- Un mismo requisito no puede repetirse dentro de un lote.
create unique index if not exists uq_lote_req_capacidad
  on public.lote_requisitos (lote_id, capacidad_id) where capacidad_id is not null;
create unique index if not exists uq_lote_req_norma
  on public.lote_requisitos (lote_id, norma) where norma is not null;

-- ---------------------------------------------------------------------
-- REGISTRO: al crearse un usuario en auth.users se crea su perfil.
--  * Autoregistro: rol y nombre_empresa vienen de raw_user_meta_data
--    (lo envía el cliente en signUp) -> se crea una empresa nueva.
--  * Seed/admin: app_metadata.empresa_id vincula a una empresa existente.
--    app_metadata SOLO lo puede escribir el service role (no el usuario),
--    por eso es seguro para asignar empresas ya existentes.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_rol        public.rol_usuario;
begin
  v_empresa_id := nullif(new.raw_app_meta_data ->> 'empresa_id', '')::uuid;

  if v_empresa_id is not null then
    select (case e.tipo when 'MINERA' then 'minera' else 'pyme' end)::public.rol_usuario
      into v_rol
      from public.empresas e
     where e.id = v_empresa_id;

    -- Si la empresa indicada no existe, se trata como autoregistro.
    if v_rol is null then
      v_empresa_id := null;
    end if;
  end if;

  if v_empresa_id is null then
    v_rol := (case when new.raw_user_meta_data ->> 'rol' = 'minera'
                   then 'minera' else 'pyme' end)::public.rol_usuario;

    insert into public.empresas (tipo, nombre)
    values (
      (case v_rol when 'minera' then 'MINERA' else 'PYME' end)::public.tipo_empresa,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre_empresa'), ''), 'Empresa sin nombre')
    )
    returning id into v_empresa_id;
  end if;

  insert into public.perfiles (id, empresa_id, rol)
  values (new.id, v_empresa_id, v_rol)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- La función solo debe ejecutarla el trigger, no ser invocable como RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
