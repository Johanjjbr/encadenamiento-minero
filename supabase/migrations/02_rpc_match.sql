-- =====================================================================
-- 02_rpc_match.sql
-- Algoritmo de match (docs/CONTEXT.md §4.1-4.2). Idempotente: todo con
-- CREATE OR REPLACE. No hay DROP TABLE ni borrados de datos.
--
-- Funciones públicas (llamables desde el cliente): ranking_lote,
-- licitaciones_compatibles. calcular_match es el motor interno: se deja
-- sin GRANT a 'authenticated' para que el único camino de uso sea a
-- través de las dos funciones públicas (ver permisos al final).
-- =====================================================================

-- ---------------------------------------------------------------------
-- cumplimiento de UN requisito para UNA empresa -> número entre 0 y 1
--   capacidad: nivel_empresa / nivel_minimo, tope en 1. Sin la capacidad: 0.
--   norma:     verificada = 1.0 · declarada = 0.6 · vencida/ausente = 0.
-- ---------------------------------------------------------------------
create or replace function public._cumplimiento_requisito(
  p_empresa_id   uuid,
  p_tipo         public.tipo_requisito,
  p_capacidad_id uuid,
  p_norma        text,
  p_nivel_minimo smallint
)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when p_tipo = 'capacidad' then
      coalesce((
        select least(ec.nivel::numeric / p_nivel_minimo, 1)
        from empresa_capacidades ec
        where ec.empresa_id = p_empresa_id and ec.capacidad_id = p_capacidad_id
      ), 0)
    else
      coalesce((
        select case c.estado
                 when 'verificada' then 1.0
                 when 'declarada'  then 0.6
                 else 0
               end
        from certificaciones c
        where c.empresa_id = p_empresa_id and c.norma = p_norma
        -- si por algún motivo hay más de una fila, prioriza la verificada
        order by (c.estado = 'verificada') desc
        limit 1
      ), 0)
  end
$$;

-- ---------------------------------------------------------------------
-- cumplimiento de TODOS los requisitos de un lote para una empresa.
-- Reutilizada por calcular_match y por el UTE builder (03_rpc_ute.sql).
-- ---------------------------------------------------------------------
create or replace function public._cumplimiento_lote_empresa(
  p_lote_id   uuid,
  p_empresa_id uuid
)
returns table (
  requisito_id  uuid,
  tipo          public.tipo_requisito,
  nombre        text,
  peso          smallint,
  obligatorio   boolean,
  cumple        numeric
)
language sql
stable
set search_path = public
as $$
  select
    lr.id,
    lr.tipo,
    coalesce(cc.nombre, lr.norma) as nombre,
    lr.peso,
    lr.obligatorio,
    public._cumplimiento_requisito(p_empresa_id, lr.tipo, lr.capacidad_id, lr.norma, lr.nivel_minimo)
  from public.lote_requisitos lr
  left join public.catalogo_capacidades cc on cc.id = lr.capacidad_id
  where lr.lote_id = p_lote_id
$$;

-- ---------------------------------------------------------------------
-- calcular_match: score 0-100, si cumple los obligatorios, y el detalle
-- de qué cubre y qué le falta. Ver fórmula en docs/CONTEXT.md §4.1.
-- Un requisito obligatorio sin cubrir NO descarta a la empresa: solo
-- marca cumple_obligatorios = false (puede completarse vía UTE).
-- ---------------------------------------------------------------------
create or replace function public.calcular_match(
  p_lote_id    uuid,
  p_empresa_id uuid
)
returns table (
  score                numeric,
  cumple_obligatorios  boolean,
  cubiertos            jsonb,
  brecha               jsonb
)
language sql
stable
set search_path = public
as $$
  with req as (
    select * from public._cumplimiento_lote_empresa(p_lote_id, p_empresa_id)
  )
  select
    coalesce(round(100 * sum(peso * cumple) / nullif(sum(peso), 0), 2), 0),
    not exists (
      select 1 from req r2
      where r2.obligatorio
        and (
          (r2.tipo = 'capacidad' and r2.cumple < 1)
          or (r2.tipo = 'norma' and r2.cumple < 0.6)
        )
    ),
    coalesce(
      jsonb_agg(jsonb_build_object('requisito_id', requisito_id, 'nombre', nombre, 'cumple', cumple))
        filter (where cumple >= 1),
      '[]'::jsonb
    ),
    coalesce(
      jsonb_agg(
        jsonb_build_object('requisito_id', requisito_id, 'nombre', nombre, 'cumple', cumple, 'obligatorio', obligatorio)
        order by obligatorio desc, peso desc
      ) filter (where cumple < 1),
      '[]'::jsonb
    )
  from req
$$;

-- ---------------------------------------------------------------------
-- ranking_lote: scores de todas las PYME para un lote, cacheados en
-- `matches`. Solo la minera dueña del lote puede pedirlo (o el service
-- role, que no tiene auth.uid()).
-- SECURITY DEFINER: necesita leer capacidades/certificaciones de pymes
-- que la minera todavía no "conoce" para poder calificarlas.
-- ---------------------------------------------------------------------
create or replace function public.ranking_lote(p_lote_id uuid)
returns table (
  empresa_id           uuid,
  nombre               text,
  departamento         text,
  score                numeric,
  cumple_obligatorios  boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
  m record;
begin
  if auth.uid() is not null and not public.lote_es_mio(p_lote_id) then
    raise exception 'No autorizado para ver el ranking de este lote';
  end if;

  for r in select e.id, e.nombre, e.departamento from public.empresas e where e.tipo = 'PYME' loop
    select * into m from public.calcular_match(p_lote_id, r.id);
    insert into public.matches (lote_id, empresa_id, score, cumple_obligatorios, cubiertos, brecha, calculado_en)
    values (p_lote_id, r.id, m.score, m.cumple_obligatorios, m.cubiertos, m.brecha, now())
    on conflict (lote_id, empresa_id) do update set
      score = excluded.score,
      cumple_obligatorios = excluded.cumple_obligatorios,
      cubiertos = excluded.cubiertos,
      brecha = excluded.brecha,
      calculado_en = excluded.calculado_en;
  end loop;

  return query
    select e.id, e.nombre, e.departamento, mt.score, mt.cumple_obligatorios
    from public.matches mt
    join public.empresas e on e.id = mt.empresa_id
    where mt.lote_id = p_lote_id
    order by mt.score desc, e.nombre asc;
end;
$$;

-- ---------------------------------------------------------------------
-- licitaciones_compatibles: para una pyme, el score en cada lote
-- abierto, cacheado en `matches`. Una pyme solo puede pedir la suya.
-- ---------------------------------------------------------------------
create or replace function public.licitaciones_compatibles(p_empresa_id uuid)
returns table (
  lote_id             uuid,
  licitacion_id       uuid,
  titulo_licitacion   text,
  titulo_lote         text,
  score               numeric,
  cumple_obligatorios boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
  m record;
begin
  if auth.uid() is not null and p_empresa_id <> public.mi_empresa_id() then
    raise exception 'No autorizado para ver el match de otra empresa';
  end if;

  for r in
    select l.id as lote_id, li.id as licitacion_id, li.titulo as titulo_licitacion, l.titulo as titulo_lote
    from public.lotes l
    join public.licitaciones li on li.id = l.licitacion_id
    where li.estado = 'abierta'
  loop
    select * into m from public.calcular_match(r.lote_id, p_empresa_id);
    insert into public.matches (lote_id, empresa_id, score, cumple_obligatorios, cubiertos, brecha, calculado_en)
    values (r.lote_id, p_empresa_id, m.score, m.cumple_obligatorios, m.cubiertos, m.brecha, now())
    on conflict (lote_id, empresa_id) do update set
      score = excluded.score,
      cumple_obligatorios = excluded.cumple_obligatorios,
      cubiertos = excluded.cubiertos,
      brecha = excluded.brecha,
      calculado_en = excluded.calculado_en;
  end loop;

  return query
    select l.id, li.id, li.titulo, l.titulo, mt.score, mt.cumple_obligatorios
    from public.matches mt
    join public.lotes l on l.id = mt.lote_id
    join public.licitaciones li on li.id = l.licitacion_id
    where mt.empresa_id = p_empresa_id and li.estado = 'abierta'
    order by mt.score desc;
end;
$$;

-- ---------------------------------------------------------------------
-- PERMISOS: solo las funciones públicas son invocables desde el cliente.
-- calcular_match y las funciones _prefijadas son motor interno.
-- OJO (Supabase): los permisos por defecto se otorgan EXPLÍCITAMENTE a
-- anon y authenticated, así que 'revoke ... from public' no alcanza:
-- hay que revocar también de esos roles.
-- ---------------------------------------------------------------------
revoke execute on function public._cumplimiento_requisito(uuid, public.tipo_requisito, uuid, text, smallint) from public, anon, authenticated;
revoke execute on function public._cumplimiento_lote_empresa(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.calcular_match(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.ranking_lote(uuid) from public, anon;
revoke execute on function public.licitaciones_compatibles(uuid) from public, anon;
grant execute on function public.ranking_lote(uuid) to authenticated, service_role;
grant execute on function public.licitaciones_compatibles(uuid) to authenticated, service_role;
