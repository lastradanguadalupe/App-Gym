-- ============================================================
-- BORRADO de las 3 tablas huerfanas (DESTRUCTIVO)
--
-- CORRER SOLO despues de haber corrido audit-legacy-tables.sql
-- y guardado el DDL resultante.
--
-- Precondicion verificada por el usuario:
--   usuarios = 0 filas, ejercicios = 0 filas, rutinas = 0 filas
-- No hay nada que migrar.
--
-- Efecto colateral esperado: la policy de usuarios tiene recursion
-- infinita (42P17) que hace fallar a ejercicios y rutinas. Al borrar
-- usuarios desaparece la causa raiz.
-- ============================================================

begin;

-- cascade por si alguna FK entre ellas o hacia el resto existiera
drop table if exists public.usuarios cascade;
drop table if exists public.ejercicios cascade;
drop table if exists public.rutinas  cascade;

commit;


-- ============================================================
-- VERIFICACION FINAL
-- ============================================================

-- A) Las 3 tablas viejas NO deben aparecer. Se espera 0 filas.
select coalesce(t.table_name, '(ninguna)') as tabla_vieja_presente
from (values ('usuarios'), ('ejercicios'), ('rutinas')) as t(table_name)
where to_regclass('public.' || t.table_name) is not null;

-- B) Las 3 tablas de siempre deben existir con los mismos conteos.
select
  to_regclass('public.profiles')   is not null as existe_profiles,
  to_regclass('public.exercises')  is not null as existe_exercises,
  to_regclass('public.routines')   is not null as existe_routines,
  (select count(*) from public.profiles)  as profiles_esperado_6,
  (select count(*) from public.exercises) as exercises_esperado_40,
  (select count(*) from public.routines)  as routines_esperado_1;

-- C) RLS sigue habilitado en las 12 tablas del repo.
select
  c.relname as tabla,
  c.relrowsecurity as rls_habilitado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'client_details', 'muscle_groups', 'exercises',
    'routines', 'routine_blocks', 'routine_block_exercises',
    'routine_schedule', 'workout_sessions', 'motivational_phrases',
    'nutrition_tips', 'staff_allowlist'
  )
order by c.relname;

-- D) anon no debe tener privilegios sobre ninguna tabla.
--    Se espera 0 filas.
select
  c.relname as tabla,
  gr.grantee,
  has_table_privilege(gr.grantee, c.oid, 'SELECT') as select_granted,
  has_table_privilege(gr.grantee, c.oid, 'INSERT') as insert_granted,
  has_table_privilege(gr.grantee, c.oid, 'UPDATE') as update_granted,
  has_table_privilege(gr.grantee, c.oid, 'DELETE') as delete_granted
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral (select unnest(array['anon','authenticated']) as grantee) gr
where n.nspname = 'public'
  and c.relkind = 'r'
  and (
    has_table_privilege(gr.grantee, c.oid, 'SELECT')
    or has_table_privilege(gr.grantee, c.oid, 'INSERT')
    or has_table_privilege(gr.grantee, c.oid, 'UPDATE')
    or has_table_privilege(gr.grantee, c.oid, 'DELETE')
  )
order by c.relname, gr.grantee;
