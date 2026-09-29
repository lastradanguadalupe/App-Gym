-- ============================================================
-- Fix #2 (ALTO): search_clients exponia el directorio global de alumnos
--
-- Antes: cualquier profe podia pasar cualquier nombre/email y obtener
-- id + email + name de TODOS los clientes de la plataforma, incluidos
-- los que pertenecen a otros entrenadores (fuga cross-tenant).
--
-- Ahora: el profe solo ve
--   a) sus propios alumnos  (p.profe_id = auth.uid())
--   b) clientes sin asignar (p.profe_id is null)
--
-- El punto (b) es necesario para que el flujo "Agregar alumno" siga
-- funcionando: el cliente que se registro recien todavia no tiene
-- profe_id, asi que con un filtro estricto por auth.uid() la pantalla
-- quedaria inservible. Lo que se elimina es la visibilidad sobre los
-- alumnos que YA tienen otro entrenador.
--
-- No se expone ningun dato de clientes ajenos.
-- ============================================================

create or replace function public.search_clients(query text)
returns table (id uuid, email text, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede buscar alumnos';
  end if;
  if btrim(coalesce(query, '')) = '' then
    return;
  end if;
  return query
    select p.id, p.email, p.name
    from public.profiles p
    where p.role = 'cliente'
      and (p.profe_id = auth.uid() or p.profe_id is null)
      and (p.name ilike '%' || btrim(query) || '%'
           or p.email ilike '%' || btrim(query) || '%')
    order by
      (p.profe_id = auth.uid()) desc,
      p.name nulls last,
      p.email
    limit 20;
end;
$$;

revoke all on function public.search_clients(text) from public;
grant execute on function public.search_clients(text) to authenticated;
