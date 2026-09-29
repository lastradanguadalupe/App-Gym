-- ============================================================
-- Quitar un bloque del calendario (dejar el día libre)
--
-- Complemento de set_block_weekday: sacar la asignación del bloque
-- para que ese día vuelva a estar "Libre / Descanso".
-- ============================================================
create or replace function public.clear_block_weekday(
  p_client_id uuid,
  p_block_id bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    auth.uid() = p_client_id
    or exists (
      select 1 from public.profiles p
      where p.id = p_client_id and p.profe_id = auth.uid()
    )
  ) then
    raise exception 'No autorizado para modificar el calendario de este cliente';
  end if;

  delete from public.routine_schedule
  where client_id = p_client_id
    and block_id = p_block_id;
end;
$$;

grant execute on function public.clear_block_weekday(uuid, bigint) to authenticated;