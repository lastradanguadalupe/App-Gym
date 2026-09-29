-- ============================================================
-- Asignar/actualizar un bloque en un día específico (mueve el bloque)
--
-- Permite al cliente o al profe asignado mover un bloque a un weekday.
-- Garantiza unicidad (client_id, weekday): elimina cualquier asignación
-- previa para ese cliente/weekday (y opcionalmente limpia duplicados).
-- ============================================================
create or replace function public.set_block_weekday(
  p_client_id uuid,
  p_block_id bigint,
  p_weekday int
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sched_id bigint;
begin
  -- Validar weekday 0=Lunes ... 6=Domingo
  if p_weekday < 0 or p_weekday > 6 then
    raise exception 'weekday inválido (0-6)';
  end if;

  -- Verificar acceso: cliente propio o profe asignado
  if not (
    auth.uid() = p_client_id
    or exists (
      select 1 from public.profiles p
      where p.id = p_client_id and p.profe_id = auth.uid()
    )
  ) then
    raise exception 'No autorizado para modificar el calendario de este cliente';
  end if;

  -- Verificar que el bloque exista y pertenezca a una rutina accesible
  if not exists (
    select 1
    from public.routine_blocks b
    join public.routines r on r.id = b.routine_id
    where b.id = p_block_id
      and (r.cliente_id = auth.uid() or r.profe_id = auth.uid() or public.can_access_routine(r.id))
  ) then
    raise exception 'Bloque no accesible';
  end if;

  -- Sacar el bloque del día que tuviera (evita que quede en varios días)
  delete from public.routine_schedule
  where client_id = p_client_id
    and block_id = p_block_id;

  -- Liberar el día destino si ya tenía otro bloque
  delete from public.routine_schedule
  where client_id = p_client_id
    and weekday = p_weekday;

  -- Crear nueva asignación
  insert into public.routine_schedule (client_id, block_id, weekday, routine_id)
  select p_client_id, p_block_id, p_weekday, b.routine_id
  from public.routine_blocks b
  where b.id = p_block_id
  returning id into v_sched_id;

  return v_sched_id;
end;
$$;

grant execute on function public.set_block_weekday(uuid, bigint, int) to authenticated;