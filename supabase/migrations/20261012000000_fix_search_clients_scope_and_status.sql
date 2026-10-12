-- ============================================================
-- Fix: el buscador de "Agregar alumno" no encontraba alumnos sin profe
--
-- Sintoma: un profe busca a un alumno que existe en profiles con
-- role='cliente' y perfil sin profe asignado, y la busqueda devuelve
-- vacio ("No encontre alumnos...").
--
-- Causa: la definicion VIVA de search_clients quedo filtrando
-- estrictamente por profe_id = auth.uid(), sin la rama
-- "or profe_id is null" del archivo 20261001_scope_search_clients...,
-- asi que los alumnos recien registrados (profe_id null) nunca
-- aparecian. Este archivo vuelve a dejar el alcance correcto y, ademas,
-- endurece la busqueda (tildes, minimo de caracteres, flag is_mine).
--
-- Alcance que se mantiene (NO se vuelve atras con el Fix #2 de la
-- auditoria): un profe solo ve alumnos SIN profe asignado o que ya son
-- suyos. Nunca los de otro profe, y nunca se devuelve el nombre del
-- otro profe.
--
-- Para confirmar la causa en la base viva antes de aplicar:
--   select pg_get_functiondef('public.search_clients(text)'::regprocedure);
-- ============================================================

-- ------------------------------------------------------------
-- 1) Normalizacion de texto para la busqueda: minusculas + sin tildes.
--    IMMUTABLE y sin extensiones (translate alcanza para español).
--    Es un helper interno: solo lo llaman los RPCs security definer.
-- ------------------------------------------------------------

create or replace function public.search_normalize(txt text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    lower(coalesce(txt, '')),
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc'
  );
$$;

revoke all on function public.search_normalize(text) from public;

-- ------------------------------------------------------------
-- 2) search_clients — alcance correcto + busqueda por nombre/email
--    parcial, sin distinguir mayusculas ni tildes, minimo 2 caracteres,
--    tope 20, y flag is_mine ("ya es tu alumno").
--
--    Se hace DROP porque cambia el tipo de retorno (se agrega is_mine):
--    create or replace no puede cambiar el ROW TYPE. El DROP se lleva
--    los grants, por eso se vuelven a otorgar abajo.
-- ------------------------------------------------------------

drop function if exists public.search_clients(text);

create function public.search_clients(query text)
returns table (id uuid, email text, name text, is_mine boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  term text;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede buscar alumnos';
  end if;

  term := public.search_normalize(btrim(coalesce(query, '')));
  -- Minimo 2 caracteres: con uno solo se podria recorrer el directorio
  -- a fuerza de busquedas de una letra.
  if length(term) < 2 then
    return;
  end if;

  return query
    select
      p.id,
      p.email,
      p.name,
      (p.profe_id = auth.uid()) as is_mine
    from public.profiles p
    where p.role = 'cliente'
      -- Solo mis alumnos o los que no tienen profe. Nunca los de otro.
      and (p.profe_id is null or p.profe_id = auth.uid())
      and (
        strpos(public.search_normalize(p.name), term) > 0
        or strpos(public.search_normalize(p.email), term) > 0
      )
    order by
      (p.profe_id = auth.uid()) desc,
      p.name nulls last,
      p.email
    limit 20;
end;
$$;

revoke all on function public.search_clients(text) from public;
grant execute on function public.search_clients(text) to authenticated;

-- ------------------------------------------------------------
-- 3) search_clients_status — solo para el mensaje "ese alumno ya tiene
--    un profe". Se consulta UNICAMENTE cuando la busqueda por un email
--    EXACTO devolvio vacio, para distinguir "no existe" de "existe pero
--    es de otro profe". No devuelve datos del alumno ni del otro profe:
--    solo un estado.
--
--    Valores: 'mine' | 'other' | 'none'.
-- ------------------------------------------------------------

drop function if exists public.search_clients_status(text);

create function public.search_clients_status(query text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target text;
  owner uuid;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede buscar alumnos';
  end if;

  target := lower(btrim(coalesce(query, '')));
  if target = '' then
    return 'none';
  end if;

  select p.profe_id into owner
  from public.profiles p
  where p.role = 'cliente'
    and lower(p.email) = target
  limit 1;

  if not found then
    return 'none';
  elsif owner = auth.uid() then
    return 'mine';
  elsif owner is null then
    -- Sin profe: no esta oculto, la busqueda ya lo habria mostrado. Se
    -- evita decir "ya tiene profe" sobre alguien que en realidad esta libre.
    return 'none';
  else
    return 'other';
  end if;
end;
$$;

revoke all on function public.search_clients_status(text) from public;
grant execute on function public.search_clients_status(text) to authenticated;

-- assign_profe NO se toca: sigue validando del lado del servidor que el
-- alumno no tenga ya otro profe (migracion 20260928000000_security_hardening).
