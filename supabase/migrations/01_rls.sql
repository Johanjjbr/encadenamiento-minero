-- =====================================================================
-- 01_rls.sql
-- Row Level Security. Idempotente. Ver docs/CONTEXT.md §5.
-- Los "drop policy if exists" solo eliminan políticas (no datos) para poder
-- re-ejecutar el archivo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FUNCIONES AUXILIARES (security definer: evitan recursión infinita entre
-- políticas, porque leen las tablas sin pasar por RLS)
-- ---------------------------------------------------------------------
create or replace function public.mi_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.perfiles where id = auth.uid()
$$;

create or replace function public.mi_rol()
returns public.rol_usuario language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create or replace function public.licitacion_es_mia(p_licitacion_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.licitaciones li
    where li.id = p_licitacion_id and li.minera_id = public.mi_empresa_id()
  )
$$;

create or replace function public.lote_es_mio(p_lote_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.lotes l
    join public.licitaciones li on li.id = l.licitacion_id
    where l.id = p_lote_id and li.minera_id = public.mi_empresa_id()
  )
$$;

-- UTEs de las que mi empresa es miembro.
create or replace function public.mis_utes()
returns setof uuid language sql stable security definer set search_path = public as $$
  select ute_id from public.ute_miembros where empresa_id = public.mi_empresa_id()
$$;

-- Empresas que comparten alguna UTE sugerida conmigo (incluida la mía).
create or replace function public.miembros_de_mis_utes()
returns setof uuid language sql stable security definer set search_path = public as $$
  select um.empresa_id
  from public.ute_miembros um
  where um.ute_id in (
    select ute_id from public.ute_miembros where empresa_id = public.mi_empresa_id()
  )
$$;

create or replace function public.ute_es_de_mi_lote(p_ute_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.utes_sugeridas u
    where u.id = p_ute_id and public.lote_es_mio(u.lote_id)
  )
$$;

-- ¿La empresa aparece en un match o UTE de alguno de MIS lotes?
create or replace function public.empresa_en_mis_lotes(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.empresa_id = p_empresa_id and public.lote_es_mio(m.lote_id)
  ) or exists (
    select 1
    from public.ute_miembros um
    join public.utes_sugeridas u on u.id = um.ute_id
    where um.empresa_id = p_empresa_id and public.lote_es_mio(u.lote_id)
  )
$$;

-- ---------------------------------------------------------------------
-- ACTIVAR RLS EN TODAS LAS TABLAS
-- ---------------------------------------------------------------------
alter table public.empresas              enable row level security;
alter table public.perfiles              enable row level security;
alter table public.catalogo_capacidades  enable row level security;
alter table public.empresa_capacidades   enable row level security;
alter table public.certificaciones       enable row level security;
alter table public.licitaciones          enable row level security;
alter table public.lotes                 enable row level security;
alter table public.lote_requisitos       enable row level security;
alter table public.matches               enable row level security;
alter table public.utes_sugeridas        enable row level security;
alter table public.ute_miembros          enable row level security;

-- ---------------------------------------------------------------------
-- PERMISOS POR COLUMNA / COMANDO (defensa en profundidad)
-- Las tablas que solo escriben los RPC o el service role no aceptan
-- escrituras directas de usuarios.
-- ---------------------------------------------------------------------
revoke insert, update, delete on
  public.perfiles, public.catalogo_capacidades, public.matches,
  public.ute_miembros, public.utes_sugeridas
from authenticated;

-- El usuario solo puede cambiar el estado de una UTE (aceptar/rechazar).
grant update (estado) on public.utes_sugeridas to authenticated;

-- Una empresa no puede crearse/borrarse desde el cliente ni cambiar su tipo.
revoke insert, delete, update on public.empresas from authenticated;
grant update (nombre, cuit, departamento, descripcion, acepta_ute, extras)
  on public.empresas to authenticated;

-- ---------------------------------------------------------------------
-- POLÍTICAS
-- ---------------------------------------------------------------------

-- perfiles: cada usuario ve solo el suyo.
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select to authenticated
  using (id = auth.uid());

-- empresas
--  * Todos ven su propia empresa y las MINERAS (nombre público).
--  * Una minera ve las pymes que aceptan UTE, o que aparecen en matches/UTEs
--    de sus lotes.
--  * Una pyme ve a sus socios en UTEs sugeridas que la incluyen.
drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
  for select to authenticated
  using (
    id = public.mi_empresa_id()
    or tipo = 'MINERA'
    or (
      public.mi_rol() = 'minera'
      and tipo = 'PYME'
      and (acepta_ute or public.empresa_en_mis_lotes(id))
    )
    or id in (select public.miembros_de_mis_utes())
  );

drop policy if exists empresas_update on public.empresas;
create policy empresas_update on public.empresas
  for update to authenticated
  using (id = public.mi_empresa_id())
  with check (id = public.mi_empresa_id());

-- catalogo_capacidades: lectura para todos los autenticados.
drop policy if exists catalogo_select on public.catalogo_capacidades;
create policy catalogo_select on public.catalogo_capacidades
  for select to authenticated
  using (true);

-- empresa_capacidades: lectura con la misma visibilidad que empresas
-- (el subselect se evalúa bajo RLS del usuario); escritura solo de la propia.
drop policy if exists emp_cap_select on public.empresa_capacidades;
create policy emp_cap_select on public.empresa_capacidades
  for select to authenticated
  using (exists (
    select 1 from public.empresas e where e.id = empresa_capacidades.empresa_id
  ));

drop policy if exists emp_cap_write on public.empresa_capacidades;
create policy emp_cap_write on public.empresa_capacidades
  for all to authenticated
  using (empresa_id = public.mi_empresa_id())
  with check (empresa_id = public.mi_empresa_id() and public.mi_rol() = 'pyme');

-- certificaciones: una pyme solo puede DECLARAR; "verificada" la carga un
-- tercero / el service role, y las verificadas no se pueden editar ni borrar.
drop policy if exists cert_select on public.certificaciones;
create policy cert_select on public.certificaciones
  for select to authenticated
  using (exists (
    select 1 from public.empresas e where e.id = certificaciones.empresa_id
  ));

drop policy if exists cert_insert on public.certificaciones;
create policy cert_insert on public.certificaciones
  for insert to authenticated
  with check (
    empresa_id = public.mi_empresa_id()
    and public.mi_rol() = 'pyme'
    and estado = 'declarada'
  );

drop policy if exists cert_update on public.certificaciones;
create policy cert_update on public.certificaciones
  for update to authenticated
  using (empresa_id = public.mi_empresa_id() and estado <> 'verificada')
  with check (empresa_id = public.mi_empresa_id() and estado = 'declarada');

drop policy if exists cert_delete on public.certificaciones;
create policy cert_delete on public.certificaciones
  for delete to authenticated
  using (empresa_id = public.mi_empresa_id() and estado <> 'verificada');

-- licitaciones: las abiertas son visibles para todos; el resto, solo su dueña.
drop policy if exists lic_select on public.licitaciones;
create policy lic_select on public.licitaciones
  for select to authenticated
  using (estado = 'abierta' or minera_id = public.mi_empresa_id());

drop policy if exists lic_write on public.licitaciones;
create policy lic_write on public.licitaciones
  for all to authenticated
  using (minera_id = public.mi_empresa_id())
  with check (minera_id = public.mi_empresa_id() and public.mi_rol() = 'minera');

-- lotes: heredan la visibilidad de su licitación.
drop policy if exists lotes_select on public.lotes;
create policy lotes_select on public.lotes
  for select to authenticated
  using (exists (
    select 1 from public.licitaciones li where li.id = lotes.licitacion_id
  ));

drop policy if exists lotes_write on public.lotes;
create policy lotes_write on public.lotes
  for all to authenticated
  using (public.licitacion_es_mia(licitacion_id))
  with check (public.licitacion_es_mia(licitacion_id));

-- lote_requisitos: heredan la visibilidad de su lote.
drop policy if exists lote_req_select on public.lote_requisitos;
create policy lote_req_select on public.lote_requisitos
  for select to authenticated
  using (exists (
    select 1 from public.lotes l where l.id = lote_requisitos.lote_id
  ));

drop policy if exists lote_req_write on public.lote_requisitos;
create policy lote_req_write on public.lote_requisitos
  for all to authenticated
  using (public.lote_es_mio(lote_id))
  with check (public.lote_es_mio(lote_id));

-- matches: la pyme ve los suyos; la minera, los de sus lotes. Sin escritura directa.
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
  for select to authenticated
  using (empresa_id = public.mi_empresa_id() or public.lote_es_mio(lote_id));

-- utes_sugeridas: la minera dueña del lote y las pymes miembros.
drop policy if exists utes_select on public.utes_sugeridas;
create policy utes_select on public.utes_sugeridas
  for select to authenticated
  using (public.lote_es_mio(lote_id) or id in (select public.mis_utes()));

drop policy if exists utes_update on public.utes_sugeridas;
create policy utes_update on public.utes_sugeridas
  for update to authenticated
  using (public.lote_es_mio(lote_id))
  with check (public.lote_es_mio(lote_id));

-- ute_miembros: solo lectura para miembros y la minera dueña del lote.
drop policy if exists ute_miembros_select on public.ute_miembros;
create policy ute_miembros_select on public.ute_miembros
  for select to authenticated
  using (ute_id in (select public.mis_utes()) or public.ute_es_de_mi_lote(ute_id));
