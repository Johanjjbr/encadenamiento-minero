-- =====================================================================
-- 03_rpc_ute.sql
-- UTE Builder (docs/CONTEXT.md §4.3). Idempotente. No hay DROP TABLE.
-- Depende de _cumplimiento_requisito y _cumplimiento_lote_empresa,
-- definidas en 02_rpc_match.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- cobertura de un CONJUNTO de empresas sobre los requisitos de un lote:
-- por cada requisito se toma el máximo cumplimiento entre los miembros
-- (el mejor de todos lo cubre). Reutiliza _cumplimiento_requisito.
-- ---------------------------------------------------------------------
create or replace function public._cobertura_conjunto(
  p_lote_id     uuid,
  p_empresa_ids uuid[]
)
returns table (
  cobertura            numeric,
  cumple_obligatorios  boolean
)
language sql
stable
set search_path = public
as $$
  with miembros as (
    select unnest(p_empresa_ids) as empresa_id
  ),
  por_requisito as (
    select
      lr.id as requisito_id,
      lr.tipo,
      lr.peso,
      lr.obligatorio,
      max(public._cumplimiento_requisito(m.empresa_id, lr.tipo, lr.capacidad_id, lr.norma, lr.nivel_minimo)) as cumple
    from public.lote_requisitos lr
    cross join miembros m
    where lr.lote_id = p_lote_id
    group by lr.id, lr.tipo, lr.peso, lr.obligatorio
  )
  select
    coalesce(round(100 * sum(peso * cumple) / nullif(sum(peso), 0), 2), 0),
    not exists (
      select 1 from por_requisito pr
      where pr.obligatorio
        and ((pr.tipo = 'capacidad' and pr.cumple < 1) or (pr.tipo = 'norma' and pr.cumple < 0.6))
    )
  from por_requisito
$$;

-- ---------------------------------------------------------------------
-- generar_utes: heurística greedy con poda y deduplicación.
-- Idempotente a nivel de datos: reemplaza las UTEs 'sugerida' del lote
-- en cada corrida (las 'aceptada'/'rechazada' no se tocan).
--
-- 1. Si la mejor pyme sola ya llega a cobertura 100, no hace falta UTE
--    (cobertura=100 implica automáticamente que cumple los obligatorios,
--    porque todos los pesos son > 0).
-- 2. Para cada una de las 3 mejores pymes como "ancla", expande de a un
--    miembro por vez eligiendo siempre el que más sube la cobertura
--    ponderada, hasta llegar a 100%, no mejorar más, o tocar el tope
--    p_max_miembros.
-- 3. Poda: si sacar a un miembro no baja la cobertura, se lo saca
--    (evita miembros redundantes, p.ej. una 3ra pyme que no aporta nada
--    nuevo una vez que las otras 2 ya cubren todo).
-- 4. Deduplicación: distintas anclas pueden converger al mismo conjunto
--    final; solo se persiste una vez.
-- 5. Se guarda solo si cobertura > mejor score individual y hay ≥ 2
--    miembros. score_total penaliza alianzas grandes (-5 por miembro
--    extra), para preferir la UTE más chica que resuelve el lote.
-- ---------------------------------------------------------------------
create or replace function public.generar_utes(
  p_lote_id       uuid,
  p_max_miembros  integer default 3
)
returns setof public.utes_sugeridas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidatos         uuid[];
  v_mejor_individual    numeric := 0;
  v_anchor_rec          record;
  v_cand                record;
  v_conjunto            uuid[];
  v_conjunto_prueba     uuid[];
  v_conjunto_ordenado   uuid[];
  v_cobertura           numeric;
  v_cobertura_prueba    numeric;
  v_cobertura_sin       numeric;
  v_mejor_cobertura     numeric;
  v_mejor_candidato     uuid;
  v_empresa             uuid;
  v_removido            boolean;
  v_firma               text;
  v_firmas              text[] := '{}';
  v_ute_id              uuid;
  v_score_total         numeric;
  v_anchor_depto        text;
  v_mismo_depto         boolean;
  v_mejor_mismo_depto   boolean;
  v_indiv               numeric;
  v_mejor_indiv         numeric;
begin
  if auth.uid() is not null and not public.lote_es_mio(p_lote_id) then
    raise exception 'No autorizado para generar UTEs de este lote';
  end if;

  if p_max_miembros < 2 then
    p_max_miembros := 2;
  end if;

  -- Reemplaza solo las sugerencias pendientes (no toca aceptadas/rechazadas).
  delete from public.utes_sugeridas where lote_id = p_lote_id and estado = 'sugerida';

  select array_agg(e.id) into v_candidatos
  from public.empresas e
  where e.tipo = 'PYME' and e.acepta_ute = true;

  if v_candidatos is null or array_length(v_candidatos, 1) < 2 then
    return; -- no hay candidatas suficientes para armar una UTE
  end if;

  select max(cc.cobertura) into v_mejor_individual
  from unnest(v_candidatos) as cid
  cross join lateral public._cobertura_conjunto(p_lote_id, array[cid]) as cc;

  if v_mejor_individual >= 100 then
    return; -- alguna pyme sola ya cubre el lote, no hace falta UTE
  end if;

  -- Hasta 3 anclas: las mejores candidatas individuales.
  for v_anchor_rec in
    select cid as empresa_id, cc.cobertura
    from unnest(v_candidatos) as cid
    cross join lateral public._cobertura_conjunto(p_lote_id, array[cid]) as cc
    order by cc.cobertura desc, cid
    limit 3
  loop
    v_conjunto := array[v_anchor_rec.empresa_id];
    v_cobertura := v_anchor_rec.cobertura;
    select e.departamento into v_anchor_depto from public.empresas e where e.id = v_anchor_rec.empresa_id;

    -- Expansión greedy: agrega, de a uno, el miembro que más suma.
    -- Desempate cuando varias suben igual la cobertura (CONTEXT.md §4.3):
    -- 1) mismo departamento que el ancla, 2) mayor score individual.
    loop
      v_mejor_candidato := null;
      v_mejor_cobertura := v_cobertura;
      v_mejor_mismo_depto := false;
      v_mejor_indiv := 0;

      for v_cand in
        select cid as empresa_id from unnest(v_candidatos) as cid where cid <> all (v_conjunto) order by cid
      loop
        select cc.cobertura into v_cobertura_prueba
        from public._cobertura_conjunto(p_lote_id, v_conjunto || v_cand.empresa_id) as cc;

        if v_cobertura_prueba > v_cobertura then
          select cc.cobertura into v_indiv
          from public._cobertura_conjunto(p_lote_id, array[v_cand.empresa_id]) as cc;
          select (e.departamento is not distinct from v_anchor_depto) into v_mismo_depto
          from public.empresas e where e.id = v_cand.empresa_id;

          if v_mejor_candidato is null
             or v_cobertura_prueba > v_mejor_cobertura
             or (v_cobertura_prueba = v_mejor_cobertura
                 and (v_mismo_depto, v_indiv) > (v_mejor_mismo_depto, v_mejor_indiv))
          then
            v_mejor_cobertura := v_cobertura_prueba;
            v_mejor_candidato := v_cand.empresa_id;
            v_mejor_mismo_depto := v_mismo_depto;
            v_mejor_indiv := v_indiv;
          end if;
        end if;
      end loop;

      exit when v_mejor_candidato is null;

      v_conjunto := v_conjunto || v_mejor_candidato;
      v_cobertura := v_mejor_cobertura;

      exit when v_cobertura >= 100 or array_length(v_conjunto, 1) >= p_max_miembros;
    end loop;

    -- Poda: saca miembros redundantes (no bajan la cobertura al quitarlos).
    loop
      v_removido := false;
      exit when array_length(v_conjunto, 1) <= 2;

      foreach v_empresa in array v_conjunto loop
        v_conjunto_prueba := array_remove(v_conjunto, v_empresa);
        select cc.cobertura into v_cobertura_sin
        from public._cobertura_conjunto(p_lote_id, v_conjunto_prueba) as cc;

        if v_cobertura_sin >= v_cobertura then
          v_conjunto := v_conjunto_prueba;
          v_removido := true;
          exit;
        end if;
      end loop;

      exit when not v_removido;
    end loop;

    -- Recalcula la cobertura exacta del conjunto final (post-poda).
    select cc.cobertura into v_cobertura
    from public._cobertura_conjunto(p_lote_id, v_conjunto) as cc;

    -- Persiste solo si mejora el mejor score individual y no es duplicado.
    if array_length(v_conjunto, 1) >= 2 and v_cobertura > v_mejor_individual then
      select array_agg(x order by x) into v_conjunto_ordenado from unnest(v_conjunto) as x;
      v_firma := array_to_string(v_conjunto_ordenado, ',');

      if not (v_firma = any (v_firmas)) then
        v_firmas := v_firmas || v_firma;
        v_score_total := v_cobertura - 5 * (array_length(v_conjunto, 1) - 1);

        insert into public.utes_sugeridas (lote_id, score_total, cobertura, estado)
        values (p_lote_id, v_score_total, v_cobertura, 'sugerida')
        returning id into v_ute_id;

        foreach v_empresa in array v_conjunto loop
          insert into public.ute_miembros (ute_id, empresa_id, aporte)
          values (
            v_ute_id,
            v_empresa,
            (
              select coalesce(
                jsonb_agg(jsonb_build_object('requisito_id', requisito_id, 'nombre', nombre, 'cumple', cumple))
                  filter (where cumple > 0),
                '[]'::jsonb
              )
              from public._cumplimiento_lote_empresa(p_lote_id, v_empresa)
            )
          );
        end loop;

        return query select * from public.utes_sugeridas where id = v_ute_id;
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- PERMISOS (ver nota en 02_rpc_match.sql: hay que revocar de anon y
-- authenticated explícitamente, no alcanza con 'from public').
-- ---------------------------------------------------------------------
revoke execute on function public._cobertura_conjunto(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.generar_utes(uuid, integer) from public, anon;
grant execute on function public.generar_utes(uuid, integer) to authenticated, service_role;
