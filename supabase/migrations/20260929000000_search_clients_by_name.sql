-- ============================================================
-- Búsqueda de alumnos por nombre y apellido (o email)
--
-- Reemplaza la búsqueda rígida por email de la pantalla "Agregar
-- alumno": ahora se puede buscar por nombre y la UI devuelve una
-- lista de coincidencias para elegir.
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
      and (p.name ilike '%' || btrim(query) || '%'
           or p.email ilike '%' || btrim(query) || '%')
    order by p.name nulls last, p.email
    limit 20;
end;
$$;

grant execute on function public.search_clients(text) to authenticated;