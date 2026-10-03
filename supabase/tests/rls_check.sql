-- =====================================================================
-- rls_check.sql: verificación manual de RLS con 2 usuarios pyme.
-- Se ejecuta en el SQL Editor de Supabase.
--
-- PREPARACIÓN (una sola vez):
--   1. Authentication > Users > Add user: creá 2 usuarios (auto-confirm).
--   2. Ejecutá esto y anotá los valores:
--        select p.id as user_id, p.empresa_id, p.rol, e.nombre
--        from public.perfiles p join public.empresas e on e.id = p.empresa_id;
--   3. Reemplazá en este archivo:
--        UUID_A       -> user_id del usuario A
--        EMPRESA_B_ID -> empresa_id del usuario B
--
-- Ejecutá CADA BLOQUE POR SEPARADO (los que fallan abortan la transacción).
-- Todos terminan en ROLLBACK: no dejan datos.
-- =====================================================================

-- BLOQUE 1: A solo debe ver su propia empresa.  ESPERADO: 1 fila.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"UUID_A","role":"authenticated"}', true);
select id, nombre, tipo from public.empresas;
rollback;

-- BLOQUE 2: A no puede modificar la empresa de B.  ESPERADO: UPDATE 0.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"UUID_A","role":"authenticated"}', true);
update public.empresas set descripcion = 'hack' where id = 'EMPRESA_B_ID';
rollback;

-- BLOQUE 3: A no puede cambiar el tipo de su empresa.
-- ESPERADO: ERROR permission denied for table empresas (columna tipo).
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"UUID_A","role":"authenticated"}', true);
update public.empresas set tipo = 'MINERA' where id = public.mi_empresa_id();
rollback;

-- BLOQUE 4: A no puede declararse "verificada".
-- ESPERADO: ERROR new row violates row-level security policy.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"UUID_A","role":"authenticated"}', true);
insert into public.certificaciones (empresa_id, norma, estado)
values (public.mi_empresa_id(), 'ISO 9001', 'verificada');
rollback;

-- BLOQUE 5: A sí puede declarar una certificación.  ESPERADO: INSERT 0 1.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"UUID_A","role":"authenticated"}', true);
insert into public.certificaciones (empresa_id, norma, estado)
values (public.mi_empresa_id(), 'ISO 9001', 'declarada');
rollback;

-- BLOQUE 6: A no puede escribir en matches.
-- ESPERADO: ERROR permission denied for table matches.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"UUID_A","role":"authenticated"}', true);
insert into public.matches (lote_id, empresa_id, score, cumple_obligatorios)
values (gen_random_uuid(), public.mi_empresa_id(), 100, true);
rollback;
