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
--
-- Ejecutar completo de una sola vez en el SQL Editor de Supabase.
-- Si algo fallara, el bloque que falla corta la ejecución: fijate en el
-- mensaje de RAISE EXCEPTION para saber cuál fue.
-- =====================================================================
begin;

do $$
declare
  v_minera_id   uuid := gen_random_uuid();
  v_lic_id      uuid := gen_random_uuid();
  v_lote1_id    uuid := gen_random_uuid();
  v_lote2_id    uuid := gen_random_uuid();

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
  r             record;
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
    (v_cap_izaje, 'izaje_grua',               'Izaje con grúa',            'Logística')
  on conflict (codigo) do nothing;

  insert into empresas (id, tipo, nombre, departamento, acepta_ute) values
    (v_minera_id, 'MINERA', 'Minera Andes del Sur (test)', 'Iglesia', true);

  insert into licitaciones (id, minera_id, titulo, estado) values
    (v_lic_id, v_minera_id, 'Servicios de soporte (test)', 'abierta');

  insert into lotes (id, licitacion_id, titulo) values
    (v_lote1_id, v_lic_id, 'Mantenimiento de flota (test)'),
    (v_lote2_id, v_lic_id, 'Transporte de insumos (test)');

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
    (v_soldad_id, v_cap_sol, 3),
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
  if abs(v_score - 63.3) > 0.1 or v_oblig then
    raise exception 'CASO 1 FALLÓ: Taller Cuyo esperado score=63.3 cumple_oblig=false, obtuvo score=% cumple_oblig=%', v_score, v_oblig;
  end if;

  select score, cumple_obligatorios into v_score, v_oblig
    from matches where lote_id = v_lote1_id and empresa_id = v_andina_id;
  if abs(v_score - 54.7) > 0.1 or v_oblig then
    raise exception 'CASO 1 FALLÓ: Seguridad Andina esperado score=54.7 cumple_oblig=false, obtuvo score=% cumple_oblig=%', v_score, v_oblig;
  end if;

  if exists (select 1 from matches where lote_id = v_lote1_id and cumple_obligatorios) then
    raise exception 'CASO 1 FALLÓ: alguna pyme cumple los obligatorios del Lote 1 y no debería';
  end if;

  raise notice 'CASO 1 OK: ranking Lote 1 coincide con DEMO.md (ninguna cumple obligatorios)';

  -- La UTE esperada: Cuyo + Andina, cobertura 100, score_total 95, una sola.
  select count(*) into v_n_utes from generar_utes(v_lote1_id);
  if v_n_utes <> 1 then
    raise exception 'CASO 1 FALLÓ: se esperaba 1 UTE sugerida para el Lote 1, se generaron %', v_n_utes;
  end if;

  select u.score_total, count(um.empresa_id) into v_score_total, v_n_miembros
    from utes_sugeridas u join ute_miembros um on um.ute_id = u.id
    where u.lote_id = v_lote1_id and u.estado = 'sugerida'
    group by u.id;

  if v_n_miembros <> 2 or abs(v_score_total - 95) > 0.1 then
    raise exception 'CASO 1 FALLÓ: UTE esperada con 2 miembros y score_total=95, obtuvo % miembros y score_total=%', v_n_miembros, v_score_total;
  end if;

  if not exists (
    select 1 from utes_sugeridas u
    join ute_miembros um1 on um1.ute_id = u.id and um1.empresa_id = v_cuyo_id
    join ute_miembros um2 on um2.ute_id = u.id and um2.empresa_id = v_andina_id
    where u.lote_id = v_lote1_id
  ) then
    raise exception 'CASO 1 FALLÓ: la UTE generada no es Cuyo + Andina';
  end if;

  raise notice 'CASO 1 OK: generar_utes arma Cuyo + Andina (cobertura 100, score_total 95), una sola UTE';

  -------------------------------------------------------------------
  -- CASO 2: pyme perfecta. Transportes Cordillera cubre sola el
  -- Lote 2 (score 100, cumple obligatorios) -> no debe generarse UTE.
  -------------------------------------------------------------------
  perform public.ranking_lote(v_lote2_id);

  select score, cumple_obligatorios into v_score, v_oblig
    from matches where lote_id = v_lote2_id and empresa_id = v_transp_id;
  if v_score <> 100 or not v_oblig then
    raise exception 'CASO 2 FALLÓ: Transportes Cordillera esperado score=100 cumple_oblig=true, obtuvo score=% cumple_oblig=%', v_score, v_oblig;
  end if;

  select count(*) into v_n_utes from generar_utes(v_lote2_id);
  if v_n_utes <> 0 then
    raise exception 'CASO 2 FALLÓ: no debería generarse ninguna UTE para el Lote 2, se generaron %', v_n_utes;
  end if;

  raise notice 'CASO 2 OK: Transportes Cordillera llega sola al 100%% y no se genera UTE';

  -------------------------------------------------------------------
  -- CASO 3: sin candidatas. Si ninguna pyme acepta UTE, generar_utes
  -- no debe producir filas (y no debe fallar).
  -------------------------------------------------------------------
  update empresas set acepta_ute = false where tipo = 'PYME';

  select count(*) into v_n_utes from generar_utes(v_lote1_id);
  if v_n_utes <> 0 then
    raise exception 'CASO 3 FALLÓ: sin candidatas no debería generarse ninguna UTE, se generaron %', v_n_utes;
  end if;

  raise notice 'CASO 3 OK: sin candidatas (acepta_ute=false) no se genera ninguna UTE';

  raise notice '✅ TODOS LOS TESTS PASARON';
end $$;

-- No deja nada en la base, sin importar si los tests pasaron o no.
rollback;
