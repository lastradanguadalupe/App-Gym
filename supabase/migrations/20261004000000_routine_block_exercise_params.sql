-- ============================================================
-- Parámetros por ejercicio: peso y fin de los valores por defecto
--
-- Antes, cada fila de `routine_block_exercises` nacía con
-- sets = 3, reps = '10-12' y rest_seconds = 60 por default de columna,
-- y los RPC volvían a escribirlos a mano. Eso hacía parecer que el profe
-- "eligió" esos valores cuando en realidad venían inventados.
--
-- A partir de acá:
--   * `sets`, `reps`, `rest_seconds` y `peso_kg` son NULLABLE y SIN default.
--     NULL = "sin definir" y la UI lo muestra como "—".
--   * Se agrega `peso_kg numeric(5,1)` (0 = peso corporal / sin peso).
--   * CHECK constraints duras por si el front falla.
--   * Los RPC `create_routine_full` y `add_exercise_to_block` dejan de
--     inyectar defaults y aceptan `peso_kg`.
--
-- NOTA: no toca filas existentes. Las filas viejas que tengan exactamente
-- 3 / '10-12' / 60 quedan intactas (ver query de diagnóstico aparte).
-- ============================================================

-- 1) Columna nueva ------------------------------------------------------
alter table public.routine_block_exercises
  add column if not exists peso_kg numeric(5,1);

-- 2) Sin valores por defecto y nullable ---------------------------------
alter table public.routine_block_exercises
  alter column sets         drop default,
  alter column sets         drop not null,
  alter column reps         drop default,
  alter column reps         drop not null,
  alter column rest_seconds drop default,
  alter column rest_seconds drop not null;

-- 3) CHECK constraints ---------------------------------------------------
alter table public.routine_block_exercises
  drop constraint if exists rbe_sets_check,
  drop constraint if exists rbe_reps_check,
  drop constraint if exists rbe_rest_check,
  drop constraint if exists rbe_peso_check;

alter table public.routine_block_exercises
  add constraint rbe_sets_check
    check (sets is null or (sets >= 1 and sets <= 20)),
  add constraint rbe_reps_check
    check (reps is null or (char_length(reps) between 1 and 20)),
  add constraint rbe_rest_check
    check (rest_seconds is null or (rest_seconds >= 0 and rest_seconds <= 3600)),
  add constraint rbe_peso_check
    check (peso_kg is null or (peso_kg >= 0 and peso_kg <= 500));

-- 4) create_routine_full: respeta los parámetros que manda el front ------
--    Cada exercise del jsonb puede traer sets / reps / rest_seconds /
--    peso_kg. Si no vienen, se guardan NULL (nada de 3 / 10-12 / 60).
create or replace function public.create_routine_full(
  p_cliente_id uuid,
  p_title text,
  p_description text,
  p_blocks jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_routine_id bigint;
  v_block_id bigint;
  b jsonb;
  ex jsonb;
  i int := 0;
  j int;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede crear rutinas';
  end if;

  if not exists (
    select 1 from public.profiles c
    where c.id = p_cliente_id
      and c.role = 'cliente'
      and c.profe_id = auth.uid()
  ) then
    raise exception 'El alumno debe estar asignado al profe actual';
  end if;

  insert into public.routines (profe_id, cliente_id, title, description)
  values (auth.uid(), p_cliente_id, p_title, p_description)
  returning id into v_routine_id;

  for b in select * from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) loop
    i := i + 1;
    insert into public.routine_blocks (routine_id, name, region, position)
    values (v_routine_id, b->>'name', b->>'region', i - 1)
    returning id into v_block_id;

    j := 0;
    for ex in select * from jsonb_array_elements(coalesce(b->'exercises', '[]'::jsonb)) loop
      j := j + 1;
      insert into public.routine_block_exercises
        (block_id, exercise_id, sets, reps, rest_seconds, peso_kg, position)
      values (
        v_block_id,
        (ex->>'exercise_id')::bigint,
        nullif(ex->>'sets', '')::int,
        nullif(ex->>'reps', ''),
        nullif(ex->>'rest_seconds', '')::int,
        nullif(ex->>'peso_kg', '')::numeric,
        j - 1
      );
    end loop;
  end loop;

  return v_routine_id;
end;
$$;

-- 5) add_exercise_to_block: nueva firma con peso_kg ----------------------
--    Cambia la lista de parámetros, así que hay que borrar la versión
--    vieja (si no queda como overload y PostgREST se confunde).
drop function if exists public.add_exercise_to_block(bigint, bigint, int, text, int, int);

create function public.add_exercise_to_block(
  p_block_id bigint,
  p_exercise_id bigint,
  p_sets int,
  p_reps text,
  p_rest_seconds int,
  p_peso_kg numeric,
  p_position int
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede agregar ejercicios';
  end if;

  if not exists (
    select 1
    from public.routine_blocks b
    join public.routines r on r.id = b.routine_id
    where b.id = p_block_id and r.profe_id = auth.uid()
  ) then
    raise exception 'El bloque no pertenece al profe actual';
  end if;

  insert into public.routine_block_exercises
    (block_id, exercise_id, sets, reps, rest_seconds, peso_kg, position)
  values (p_block_id, p_exercise_id, p_sets, p_reps, p_rest_seconds, p_peso_kg, p_position)
  returning id into v_id;

  return v_id;
end;
$$;

-- 6) Grants ---------------------------------------------------------------
grant execute on function public.create_routine_full(uuid, text, text, jsonb) to authenticated;
grant execute on function public.add_exercise_to_block(bigint, bigint, int, text, int, numeric, int) to authenticated;
