-- ============================================================
-- Fix de performance: el panel del profe hacia un N+1
--
-- Antes, src/app/(admin)/panel.tsx traia la lista de alumnos y despues, por
-- CADA alumno, pedia sus sesiones completas y su rutina activa. Con 30 alumnos
-- eso son 61 requests HTTP en paralelo, y las sesiones venian completas solo
-- para contar filas y sumar minutos.
--
-- Ahora una sola RPC devuelve los agregados de todos los alumnos de un profe,
-- agrupados por cliente.
--
-- security definer: para agrupar hay que leer workout_sessions de varios
-- clientes, y una funcion normal con RLM veria solo los propios. Se re-chquea
-- aca que el caller sea profe y que solo se incluya a SUS alumnos.
-- ============================================================

create or replace function public.student_stats(p_profe_id uuid)
returns table (
  client_id        uuid,
  session_count    bigint,
  total_minutes    bigint,
  has_routine      boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede ver estadísticas de alumnos';
  end if;

  -- No devolver nada si el caller no es el profe pedido: evita que un profe
  -- consulte los stats de otro profe pasando su id.
  if auth.uid() is distinct from p_profe_id then
    raise exception 'No autorizado';
  end if;

  return query
    select
      p.id as client_id,
      count(s.id) as session_count,
      coalesce(sum(s.duration_minutes), 0) as total_minutes,
      exists (
        select 1 from public.routines r
        where r.cliente_id = p.id and r.is_active
      ) as has_routine
    from public.profiles p
    left join public.workout_sessions s on s.client_id = p.id
    where p.role = 'cliente'
      and p.profe_id = p_profe_id
    group by p.id;
end;
$$;

revoke all on function public.student_stats(uuid) from public;
grant execute on function public.student_stats(uuid) to authenticated;
