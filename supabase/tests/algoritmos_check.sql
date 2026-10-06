-- =====================================================================
-- algoritmos_check.sql
-- Verifica ranking_lote y generar_utes contra los valores esperados de
-- docs/DEMO.md. Crea datos propios (IDs aleatorios) y hace ROLLBACK al
-- final: no deja nada en la base, se puede correr las veces que haga
-- falta, incluso con el seed real ya cargado.
--
-- Casos cubiertos (TODO.md, Fase 3):
--   1. Pyme sin obligatorios (Lote 1: ninguna pyme cubre los 2 oblig.)
--   2. Pyme perfecta          (Lote 2: Transportes llega sola al 100)
--   3. Sin candidatas          (acepta_ute = false para todas)
--   4. Desempate               (Lote 3: UTEs alternativas de igual puntaje)
--
-- Ejecutar completo, de una sola vez, en el SQL Editor de Supabase.
-- El resultado es una TABLA (no un mensaje): mirá la columna "resultado".
-- Si algo da FALLÓ, la columna "detalle" dice qué se esperaba y qué
-- se obtuvo en realidad.
-- =====================================================================
begin;

create temporary table test_resultados (
  caso      text,
  resultado text,
  detalle   text
);

do $$
declare
  v_minera_id   uuid := gen_random_uuid();
  v_lic_id      uuid := gen_random_uuid();
  v_lote1_id    uuid := gen_random_uuid();
  v_lote2_id    uuid := gen_random_uuid();
  v_lote3_id    uuid := gen_random_uuid();
  v_cap_est     uuid := gen_random_uuid();  -- estructuras_metalicas

  v_cap_mec     uuid := gen_random_uuid();  -- mecanica_pesada
  v_cap_hse     uuid := gen_random_uuid();  -- hse_seguridad_higiene
  v_cap_sol     uuid := gen_random_uuid();  -- soldadura
  v_cap_ele     uuid := gen_random_uuid();  -- electricidad_industrial
  v_cap_tra     uuid := gen_random_uuid();  -- transporte_cargas
  v_cap_izaje   uuid := gen_random_uuid();  -- izaje_grua

  v_cuyo_id     uuid := gen_random_uuid();
  v_andina_id   uuid := gen_random_uuid();
  v_soldad_id   uuid := gen_random_uuid();
  v_eco_id      uuid := gen_random_uuid();
  v_transp_id   uuid := gen_random_uuid();

  v_score       numeric;
  v_oblig       boolean;
  v_n_utes      int;
  v_n_miembros  int;
  v_score_total numeric;
begin
  -------------------------------------------------------------------
  -- Fixture: catálogo, minera, licitación, lotes y requisitos
  -------------------------------------------------------------------
  insert into catalogo_capacidades (id, codigo, nombre, categoria) values
    (v_cap_mec,   'mecanica_pesada',          'Mecánica pesada',           'Taller'),
    (v_cap_hse,   'hse_seguridad_higiene',    'HSE',                       'Seguridad'),
    (v_cap_sol,   'soldadura',                'Soldadura',                 'Taller'),
    (v_cap_ele,   'electricidad_industrial',  'Electricidad industrial',   'Taller'),
    (v_cap_tra,   'transporte_cargas',        'Transporte de cargas',      'Logística'),
    (v_cap_izaje, 'izaje_grua',               'Izaje con grúa',            'Logística'),
    (v_cap_est,   'estructuras_metalicas',    'Estructuras metálicas',     'Obra')
  on conflict (codigo) do nothing;

  insert into empresas (id, tipo, nombre, departamento, acepta_ute) values
    (v_minera_id, 'MINERA', 'Minera Andes del Sur (test)', 'Iglesia', true);

  insert into licitaciones (id, minera_id, titulo, estado) values
    (v_lic_id, v_minera_id, 'Servicios de soporte (test)', 'abierta');

  insert into lotes (id, licitacion_id, titulo) values
    (v_lote1_id, v_lic_id, 'Mantenimiento de flota (test)'),
    (v_lote2_id, v_lic_id, 'Transporte de insumos (test)'),
    (v_lote3_id, v_lic_id, 'Estructuras metálicas (test)');

  insert into lote_requisitos (lote_id, tipo, capacidad_id, nivel_minimo, peso, obligatorio) values
    (v_lote1_id, 'capacidad', v_cap_mec, 2, 10, true),
    (v_lote1_id, 'capacidad', v_cap_hse, 2, 8,  true),
    (v_lote1_id, 'capacidad', v_cap_sol, 2, 6,  false),
    (v_lote1_id, 'capacidad', v_cap_ele, 1, 2,  false);
  insert into lote_requisitos (lote_id, tipo, norma, nivel_minimo, peso, obligatorio) values
    (v_lote1_id, 'norma', 'ISO 9001', 1, 4, false);

  insert into lote_requisitos (lote_id, tipo, capacidad_id, nivel_minimo, peso, obligatorio) values
    (v_lote2_id, 'capacidad', v_cap_tra,   2, 10, true),
    (v_lote2_id, 'capacidad', v_cap_izaje, 1, 5,  false),
    (v_lote2_id, 'capacidad', v_cap_hse,   1, 5,  true);

  insert into lote_requisitos (lote_id, tipo, capacidad_id, nivel_minimo, peso, obligatorio) values
    (v_lote3_id, 'capacidad', v_cap_est, 2, 10, true),
    (v_lote3_id, 'capacidad', v_cap_sol, 2, 6,  false),
    (v_lote3_id, 'capacidad', v_cap_hse, 1, 4,  true);

  -------------------------------------------------------------------
  -- Fixture: 5 pymes (igual a docs/DEMO.md §4)
  -------------------------------------------------------------------
  insert into empresas (id, tipo, nombre, departamento, acepta_ute) values
    (v_cuyo_id,   'PYME', 'Taller Mecánico Cuyo (test)',        'Pocito',    true),
    (v_andina_id, 'PYME', 'Seguridad Industrial Andina (test)', 'Rivadavia', true),
    (v_soldad_id, 'PYME', 'Soldaduras del Oeste (test)',        'Rawson',    true),
    (v_eco_id,    'PYME', 'EcoServicios Calingasta (test)',     'Calingasta',true),
    (v_transp_id, 'PYME', 'Transportes Cordillera (test)',      'Chimbas',   true);

  insert into empresa_capacidades (empresa_id, capacidad_id, nivel) values
    (v_cuyo_id,   v_cap_mec, 3), (v_cuyo_id,   v_cap_ele, 2), (v_cuyo_id,   v_cap_sol, 1),
    (v_andina_id, v_cap_hse, 3), (v_andina_id, v_cap_sol, 2),
    (v_soldad_id, v_cap_sol, 3), (v_soldad_id, v_cap_est, 2),
    (v_eco_id,    v_cap_hse, 1),
    (v_transp_id, v_cap_tra, 3), (v_transp_id, v_cap_izaje, 2), (v_transp_id, v_cap_hse, 1);

  insert into certificaciones (empresa_id, norma, estado) values
    (v_cuyo_id,   'ISO 9001', 'verificada'),
    (v_andina_id, 'ISO 9001', 'declarada');

  -------------------------------------------------------------------
  -- CASO 1: pyme sin obligatorios. Ranking del Lote 1: ninguna pyme
  -- debe cumplir los 2 obligatorios, y los scores deben coincidir con
  -- docs/DEMO.md (tolerancia 0.1 por redondeo).
  -------------------------------------------------------------------
  perform public.ranking_lote(v_lote1_id);

  select score, cumple_obligatorios into v_score, v_oblig
    from matches where lote_id = v_lote1_id and empresa_id = v_cuyo_id;
  if abs(v_score - 63.3) <= 0.1 and not v_oblig then
    insert into test_resultados values ('1a. Score Taller Cuyo (Lote 1)', 'PASÓ', format('score=%s cumple_oblig=%s', v_score, v_oblig));
  else
    insert into test_resultados values ('1a. Score Taller Cuyo (Lote 1)', 'FALLÓ', format('esperado score=63.3 cumple_oblig=false, obtuvo score=%s cumple_oblig=%s', v_score, v_oblig));
  end if;

  select score, cumple_obligatorios into v_score, v_oblig
    from matches where lote_id = v_lote1_id and empresa_id = v_andina_id;
  if abs(v_score - 54.7) <= 0.1 and not v_oblig then
    insert into test_resultados values ('1b. Score Seguridad Andina (Lote 1)', 'PASÓ', format('score=%s cumple_oblig=%s', v_score, v_oblig));
  else
    insert into test_resultados values ('1b. Score Seguridad Andina (Lote 1)', 'FALLÓ', format('esperado score=54.7 cumple_oblig=false, obtuvo score=%s cumple_oblig=%s', v_score, v_oblig));
  end if;

  if exists (select 1 from matches where lote_id = v_lote1_id and cumple_obligatorios) then
    insert into test_resultados values ('1c. Ninguna pyme cumple obligatorios (Lote 1)', 'FALLÓ', 'alguna pyme quedó con cumple_obligatorios=true y no debería');
  else
    insert into test_resultados values ('1c. Ninguna pyme cumple obligatorios (Lote 1)', 'PASÓ', 'ok');
  end if;

  -- La UTE esperada: Cuyo + Andina, cobertura 100, score_total 95, una sola.
  select count(*) into v_n_utes from generar_utes(v_lote1_id);
  if v_n_utes = 1 then
    insert into test_resultados values ('1d. Cantidad de UTEs generadas (Lote 1)', 'PASÓ', '1 UTE generada');
  else
    insert into test_resultados values ('1d. Cantidad de UTEs generadas (Lote 1)', 'FALLÓ', format('esperaba 1 UTE, se generaron %s', v_n_utes));
  end if;

  select u.score_total, count(um.empresa_id) into v_score_total, v_n_miembros
    from utes_sugeridas u join ute_miembros um on um.ute_id = u.id
    where u.lote_id = v_lote1_id and u.estado = 'sugerida'
    group by u.id;

  if v_n_miembros = 2 and abs(v_score_total - 95) <= 0.1 then
    insert into test_resultados values ('1e. UTE con 2 miembros y score_total=95', 'PASÓ', format('miembros=%s score_total=%s', v_n_miembros, v_score_total));
  else
    insert into test_resultados values ('1e. UTE con 2 miembros y score_total=95', 'FALLÓ', format('esperaba 2 miembros y score_total=95, obtuvo miembros=%s score_total=%s', v_n_miembros, v_score_total));
  end if;

  if exists (
    select 1 from utes_sugeridas u
    join ute_miembros um1 on um1.ute_id = u.id and um1.empresa_id = v_cuyo_id
    join ute_miembros um2 on um2.ute_id = u.id and um2.empresa_id = v_andina_id
    where u.lote_id = v_lote1_id
  ) then
    insert into test_resultados values ('1f. La UTE es Cuyo + Andina', 'PASÓ', 'ok');
  else
    insert into test_resultados values ('1f. La UTE es Cuyo + Andina', 'FALLÓ', 'la UTE generada no incluye a Cuyo y Andina juntas');
  end if;

  -------------------------------------------------------------------
  -- CASO 2: pyme perfecta. Transportes Cordillera cubre sola el
  -- Lote 2 (score 100, cumple obligatorios) -> no debe generarse UTE.
  -------------------------------------------------------------------
  perform public.ranking_lote(v_lote2_id);

  select score, cumple_obligatorios into v_score, v_oblig
    from matches where lote_id = v_lote2_id and empresa_id = v_transp_id;
  if v_score = 100 and v_oblig then
    insert into test_resultados values ('2a. Transportes Cordillera llega sola al 100 (Lote 2)', 'PASÓ', format('score=%s cumple_oblig=%s', v_score, v_oblig));
  else
    insert into test_resultados values ('2a. Transportes Cordillera llega sola al 100 (Lote 2)', 'FALLÓ', format('esperado score=100 cumple_oblig=true, obtuvo score=%s cumple_oblig=%s', v_score, v_oblig));
  end if;

  select count(*) into v_n_utes from generar_utes(v_lote2_id);
  if v_n_utes = 0 then
    insert into test_resultados values ('2b. No se genera UTE para el Lote 2', 'PASÓ', '0 UTEs generadas');
  else
    insert into test_resultados values ('2b. No se genera UTE para el Lote 2', 'FALLÓ', format('esperaba 0 UTEs, se generaron %s', v_n_utes));
  end if;

  -------------------------------------------------------------------
  -- CASO 4 (Lote 3, desempate): 3 pymes completan igual la brecha de
  -- HSE, así que el algoritmo puede devolver UTEs ALTERNATIVAS de igual
  -- puntaje. Se verifica que los scores coincidan con DEMO.md y que
  -- Soldaduras + Andina (la de mayor score individual) esté entre ellas.
  -------------------------------------------------------------------
  perform public.ranking_lote(v_lote3_id);

  select score into v_score from matches where lote_id = v_lote3_id and empresa_id = v_soldad_id;
  if abs(v_score - 80) <= 0.1 then
    insert into test_resultados values ('4a. Score Soldaduras del Oeste (Lote 3)', 'PASÓ', format('score=%s', v_score));
  else
    insert into test_resultados values ('4a. Score Soldaduras del Oeste (Lote 3)', 'FALLÓ', format('esperado 80, obtuvo %s', v_score));
  end if;

  select score into v_score from matches where lote_id = v_lote3_id and empresa_id = v_andina_id;
  if abs(v_score - 50) <= 0.1 then
    insert into test_resultados values ('4b. Score Seguridad Andina (Lote 3)', 'PASÓ', format('score=%s', v_score));
  else
    insert into test_resultados values ('4b. Score Seguridad Andina (Lote 3)', 'FALLÓ', format('esperado 50, obtuvo %s', v_score));
  end if;

  select count(*) into v_n_utes from generar_utes(v_lote3_id);
  if exists (
    select 1 from utes_sugeridas u
    join ute_miembros a on a.ute_id = u.id and a.empresa_id = v_soldad_id
    join ute_miembros b on b.ute_id = u.id and b.empresa_id = v_andina_id
    where u.lote_id = v_lote3_id and abs(u.score_total - 95) <= 0.1
  ) then
    insert into test_resultados values ('4c. UTE Soldaduras + Andina (score_total 95) en Lote 3', 'PASÓ', format('%s UTE(s) alternativas generadas', v_n_utes));
  else
    insert into test_resultados values ('4c. UTE Soldaduras + Andina (score_total 95) en Lote 3', 'FALLÓ', format('no está entre las %s UTE(s) generadas', v_n_utes));
  end if;

  -------------------------------------------------------------------
  -- CASO 3: sin candidatas. Si ninguna pyme acepta UTE, generar_utes
  -- no debe producir filas (y no debe fallar).
  -------------------------------------------------------------------
  update empresas set acepta_ute = false where tipo = 'PYME';

  select count(*) into v_n_utes from generar_utes(v_lote1_id);
  if v_n_utes = 0 then
    insert into test_resultados values ('3a. Sin candidatas no se genera ninguna UTE', 'PASÓ', '0 UTEs generadas');
  else
    insert into test_resultados values ('3a. Sin candidatas no se genera ninguna UTE', 'FALLÓ', format('esperaba 0 UTEs, se generaron %s', v_n_utes));
  end if;
end $$;

-- Esto es lo que vas a ver en la grilla de resultados del SQL Editor.
select
  caso,
  resultado,
  detalle
from test_resultados
order by caso;

-- No deja nada en la base, sin importar si los tests pasaron o no.
rollback;
