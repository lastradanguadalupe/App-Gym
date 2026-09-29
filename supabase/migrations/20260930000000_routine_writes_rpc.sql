-- ============================================================
-- Escritura de rutinas por RPC (security definer)
--
-- El policy de INSERT de routines con subconsulta sobre profiles
-- ("cliente_id in (select id from profiles where profe_id = auth.uid())")
-- falla al evaluarse vía PostgREST aunque los datos sean correctos.
-- Igual que assign_profe/search_clients, pasamos los writes a RPCs
-- security definer que validan explícitamente y evitan el RLS.
-- ============================================================

-- Crea rutina + bloques + ejercicios en una sola transacción.
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
    for ex in select * from jsonb_array_elements(coalesce(b->'exercise_ids', '[]'::jsonb)) loop
      j := j + 1;
      insert into public.routine_block_exercises
        (block_id, exercise_id, sets, reps, rest_seconds, position)
      values (v_block_id, (ex->>'id')::bigint, 3, '10-12', 60, j - 1);
    end loop;
  end loop;

  return v_routine_id;
end;
$$;

-- Agrega un bloque a una rutina del profe actual.
create or replace function public.create_block_in_routine(
  p_routine_id bigint,
  p_name text,
  p_region text,
  p_position int
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_block_id bigint;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede crear bloques';
  end if;

  if not exists (
    select 1 from public.routines r
    where r.id = p_routine_id and r.profe_id = auth.uid()
  ) then
    raise exception 'La rutina no pertenece al profe actual';
  end if;

  insert into public.routine_blocks (routine_id, name, region, position)
  values (p_routine_id, p_name, p_region, p_position)
  returning id into v_block_id;

  return v_block_id;
end;
$$;

-- Agrega un ejercicio a un bloque de la rutina del profe actual.
create or replace function public.add_exercise_to_block(
  p_block_id bigint,
  p_exercise_id bigint,
  p_sets int,
  p_reps text,
  p_rest_seconds int,
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
    (block_id, exercise_id, sets, reps, rest_seconds, position)
  values (p_block_id, p_exercise_id, p_sets, p_reps, p_rest_seconds, p_position)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_routine_full(uuid, text, text, jsonb) to authenticated;
grant execute on function public.create_block_in_routine(bigint, text, text, int) to authenticated;
grant execute on function public.add_exercise_to_block(bigint, bigint, int, text, int, int) to authenticated;