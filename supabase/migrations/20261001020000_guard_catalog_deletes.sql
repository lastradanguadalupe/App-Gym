-- ============================================================
-- Fix #5 (ALTO): un profe podia borrar el catalogo entero en cascada
--
-- Antes:
--   exercises.muscle_group_id  -> on delete cascade
--   routine_block_exercises.exercise_id -> on delete cascade
-- Con las policies "for all using (is_profe())", CUALQUIER profe podia:
--   delete from muscle_groups   -- se lleva por delante TODOS los ejercicios
--                                -- y las filas de rutina de TODOS los clientes
--   delete from exercises       -- si el ejercicio esta en alguna rutina,
--                                 borra en silencio la entrada del alumno
--
-- Decision: no se tocan las FKs (cambiar "cascade" por "restrict" obligaria a
-- rehacerlas y el borrado de un ejercicio suelto dejaria de ser posible).
-- En su lugar se bloquean los dos casos destructivos con triggers.
-- Borrar un ejercicio o un grupo que NADIE referencia sigue funcionando.
--
-- security definer: la comprobacion tiene que ver TODAS las referencias, no
-- solo las que RLM deja ver al profe que borra (si dependiera de RLS, un
-- ejercicio usado por la rutina de otro entrenador se creeria libre).
-- ============================================================

-- ------------------------------------------------------------
-- 1) No borrar un grupo muscular que aun tiene ejercicios
-- ------------------------------------------------------------
create or replace function public.guard_muscle_group_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.exercises e where e.muscle_group_id = old.id) then
    raise exception
      'Este grupo muscular tiene ejercicios asociados. Borralos o reasignalos primero.';
  end if;
  return old;
end;
$$;

drop trigger if exists muscle_groups_guard_delete on public.muscle_groups;
create trigger muscle_groups_guard_delete
  before delete on public.muscle_groups
  for each row execute function public.guard_muscle_group_delete();


-- ------------------------------------------------------------
-- 2) No borrar un ejercicio que esta en uso por alguna rutina
-- ------------------------------------------------------------
create or replace function public.guard_exercise_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.routine_block_exercises rbe
    where rbe.exercise_id = old.id
  ) then
    raise exception
      'Este ejercicio esta en uso por al menos una rutina. Quitalo de las rutinas primero.';
  end if;
  return old;
end;
$$;

drop trigger if exists exercises_guard_delete on public.exercises;
create trigger exercises_guard_delete
  before delete on public.exercises
  for each row execute function public.guard_exercise_delete();


-- ------------------------------------------------------------
-- 3) Comprobacion: catalogos en uso que ahora estan protegidos
-- ------------------------------------------------------------
select 'muscle_groups en uso' as caso, count(*) as filas
from public.exercises
union all
select 'exercises en uso', count(*)
from public.routine_block_exercises;
