-- ============================================================
-- Perfil del profe + datos del dashboard del panel
--
-- 1) `profe_details`: datos personales del entrenador (fecha de nacimiento,
--    sexo y años de experiencia). Viven aparte de `client_details` a propósito:
--    esa tabla es el cuestionario del socio y su RLS deja leer al profe
--    asignado. Los datos del profe NO tienen que verlos ni sus alumnos ni otros
--    profes, así que van en una tabla propia, accesible solo por su dueño.
--
-- 2) `routines.updated_at` se mantiene al día cuando cambian sus bloques o
--    ejercicios (`routine_blocks` / `routine_block_exercises`), no solo cuando
--    se edita la rutina en sí. El dashboard "Seguir donde quedamos" y el aviso
--    "rutina sin actualizar" se apoyan en esa fecha.
--
-- 3) RPC `profe_dashboard`: una sola llamada devuelve todo lo que pinta el
--    dashboard (continuar, alumnos a los que atender, actividad reciente y los
--    números de la semana). security definer, valida is_profe() y devuelve
--    SOLO ids, nombres, conteos y fechas: nunca datos de salud ni
--    `client_details`.
--
-- Convenciones del proyecto: PK/propiedad por `user_id`, RLS por dueño, helpers
-- `security definer` con `search_path = ''`, `anon` sin privilegios.
-- ============================================================

-- ============================================================
-- 1) profe_details
-- ============================================================

create table if not exists public.profe_details (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  fecha_nacimiento  date,
  sexo              text check (sexo in ('masculino', 'femenino', 'prefiero no decirlo')),
  anios_experiencia smallint,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint profe_details_fecha_nacimiento check (
    fecha_nacimiento is null
    or (fecha_nacimiento <= current_date
        and fecha_nacimiento >= current_date - interval '100 years')
  ),
  constraint profe_details_anios_experiencia check (
    anios_experiencia is null
    or (anios_experiencia >= 0 and anios_experiencia <= 60)
  )
);

alter table public.profe_details enable row level security;

-- Solo el dueño, en las cuatro operaciones. Ni alumnos ni otros profes.
drop policy if exists profe_details_select_own on public.profe_details;
drop policy if exists profe_details_insert_own on public.profe_details;
drop policy if exists profe_details_update_own on public.profe_details;
drop policy if exists profe_details_delete_own on public.profe_details;

create policy "profe_details_select_own"
  on public.profe_details for select
  using (user_id = auth.uid());

create policy "profe_details_insert_own"
  on public.profe_details for insert
  with check (user_id = auth.uid() and public.is_profe());

create policy "profe_details_update_own"
  on public.profe_details for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profe_details_delete_own"
  on public.profe_details for delete
  using (user_id = auth.uid());

-- Privilegios de columna: `anon` nada; `authenticated` solo sus columnas.
revoke all on table public.profe_details from anon;
revoke all on table public.profe_details from authenticated;
grant select on table public.profe_details to authenticated;
grant insert (user_id, fecha_nacimiento, sexo, anios_experiencia)
  on table public.profe_details to authenticated;
grant update (fecha_nacimiento, sexo, anios_experiencia)
  on table public.profe_details to authenticated;

drop trigger if exists profe_details_set_updated_at on public.profe_details;
create trigger profe_details_set_updated_at
  before update on public.profe_details
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 2) updated_at de la rutina cuando cambian bloques o ejercicios
-- ============================================================

-- Un bloque: `routine_id` está en la fila.
create or replace function public.touch_routine_from_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.routines r
     set updated_at = now()
   where r.id = coalesce(new.routine_id, old.routine_id);
  return null;
end;
$$;

-- Un ejercicio de bloque: hay que subir hasta la rutina vía el bloque.
create or replace function public.touch_routine_from_rbe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_block bigint := coalesce(new.block_id, old.block_id);
begin
  update public.routines r
     set updated_at = now()
   where r.id = (select b.routine_id from public.routine_blocks b where b.id = v_block);
  return null;
end;
$$;

revoke all on function public.touch_routine_from_block() from public;
revoke all on function public.touch_routine_from_rbe() from public;

drop trigger if exists routine_blocks_touch_routine on public.routine_blocks;
create trigger routine_blocks_touch_routine
  after insert or update or delete on public.routine_blocks
  for each row execute procedure public.touch_routine_from_block();

drop trigger if exists rbe_touch_routine on public.routine_block_exercises;
create trigger rbe_touch_routine
  after insert or update or delete on public.routine_block_exercises
  for each row execute procedure public.touch_routine_from_rbe();

-- ============================================================
-- 3) RPC del dashboard del profe
--
-- Pinta: "Seguir donde quedamos", "Alumnos que necesitan atención",
-- "Actividad reciente" y "Esta semana". El inicio de semana (lunes, hora local
-- del usuario) se calcula en el cliente y llega como `p_week_start` /
-- `p_week_end` (timestamptz); así el agrupado no depende del huso del servidor.
-- ============================================================

create or replace function public.profe_dashboard(
  p_week_start    timestamptz,
  p_week_end      timestamptz,
  p_inactive_days int default 7,
  p_stale_days    int default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid             uuid := auth.uid();
  v_now             timestamptz := now();
  v_inactive_days   int := coalesce(p_inactive_days, 7);
  v_stale_days      int := coalesce(p_stale_days, 30);
  v_continue        jsonb;
  v_first           jsonb;
  v_attention       jsonb;
  v_attention_total int;
  v_activity        jsonb;
  v_week            jsonb;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede ver su panel';
  end if;

  -- "Seguir donde quedamos": la última rutina tocada por este profe.
  select jsonb_build_object(
           'routine_id',  r.id,
           'title',       r.title,
           'client_id',   r.cliente_id,
           'client_name', coalesce(p.name, p.email),
           'block_id',    (select b.id from public.routine_blocks b
                            where b.routine_id = r.id
                            order by b.position, b.id limit 1),
           'block_name',  (select b.name from public.routine_blocks b
                            where b.routine_id = r.id
                            order by b.position, b.id limit 1),
           'block_count', (select count(*) from public.routine_blocks b
                            where b.routine_id = r.id),
           'updated_at',  r.updated_at
         )
    into v_continue
    from public.routines r
    join public.profiles p on p.id = r.cliente_id
   where r.profe_id = v_uid
   order by r.updated_at desc
   limit 1;

  -- Fallback cuando todavía no armó ninguna rutina: un alumno sin rutina.
  select jsonb_build_object('client_id', p.id, 'name', coalesce(p.name, p.email))
    into v_first
    from public.profiles p
   where p.role = 'cliente'
     and p.profe_id = v_uid
     and not exists (
       select 1 from public.routines r where r.cliente_id = p.id and r.is_active
     )
   order by p.name nulls last, p.created_at
   limit 1;

  -- Alumnos que necesitan atención (máximo 5) + total.
  with base as (
    select
      p.id as client_id,
      coalesce(p.name, p.email) as name,
      (select max(s.completed_on) from public.workout_sessions s
        where s.client_id = p.id) as last_session,
      (select r.created_at from public.routines r
        where r.cliente_id = p.id and r.is_active
        order by r.created_at desc limit 1) as routine_created,
      (select r.updated_at from public.routines r
        where r.cliente_id = p.id and r.is_active
        order by r.updated_at desc limit 1) as routine_updated
    from public.profiles p
   where p.role = 'cliente'
     and p.profe_id = v_uid
  ),
  scored as (
    select
      client_id,
      name,
      case
        when routine_created is null then 'no_routine'
        when coalesce(last_session, routine_created)
             < v_now - make_interval(days => v_inactive_days) then 'inactive'
        when routine_updated < v_now - make_interval(days => v_stale_days) then 'stale'
        else null
      end as reason,
      case
        when routine_created is null then 0
        when coalesce(last_session, routine_created)
             < v_now - make_interval(days => v_inactive_days)
          then greatest(0, floor(
                 extract(epoch from (v_now - coalesce(last_session, routine_created))) / 86400)::int)
        when routine_updated < v_now - make_interval(days => v_stale_days)
          then greatest(0, floor(extract(epoch from (v_now - routine_updated)) / 86400)::int)
        else 0
      end as days
    from base
  )
  select jsonb_agg(to_jsonb(x)), count(*)
    into v_attention, v_attention_total
    from (
      select client_id, name, reason, days
      from scored
      where reason is not null
      order by
        case reason when 'no_routine' then 0 when 'inactive' then 1 else 2 end,
        days desc,
        name
      limit 5
    ) x;

  if v_attention is null then
    v_attention := '[]'::jsonb;
  end if;
  if v_attention_total is null then
    v_attention_total := 0;
  end if;

  -- Actividad reciente: últimos 6 entrenamientos de sus alumnos.
  select jsonb_agg(to_jsonb(x))
    into v_activity
    from (
      select
        s.client_id,
        coalesce(p.name, p.email) as client_name,
        b.name as block_name,
        s.duration_minutes,
        s.completed_on
      from public.workout_sessions s
      join public.profiles p on p.id = s.client_id
      left join public.routine_blocks b on b.id = s.block_id
      where p.profe_id = v_uid
      order by s.completed_on desc
      limit 6
    ) x;

  if v_activity is null then
    v_activity := '[]'::jsonb;
  end if;

  -- Números de la semana (rango local que manda el cliente).
  select jsonb_build_object(
    'completed', (
      select count(*)
      from public.workout_sessions s
      join public.profiles p on p.id = s.client_id
      where p.profe_id = v_uid
        and s.completed_on >= p_week_start
        and s.completed_on < p_week_end
    ),
    'active', (
      select count(distinct s.client_id)
      from public.workout_sessions s
      join public.profiles p on p.id = s.client_id
      where p.profe_id = v_uid
        and s.completed_on >= p_week_start
        and s.completed_on < p_week_end
    ),
    'total', (
      select count(*) from public.profiles p
      where p.role = 'cliente' and p.profe_id = v_uid
    ),
    'without_routine', (
      select count(*) from public.profiles p
      where p.role = 'cliente' and p.profe_id = v_uid
        and not exists (
          select 1 from public.routines r where r.cliente_id = p.id and r.is_active
        )
    )
  )
    into v_week;

  return jsonb_build_object(
    'continue',        v_continue,
    'first_student',   v_first,
    'attention',       v_attention,
    'attention_total', v_attention_total,
    'activity',        v_activity,
    'week',            v_week
  );
end;
$$;

revoke all on function public.profe_dashboard(timestamptz, timestamptz, int, int) from public;
grant execute on function public.profe_dashboard(timestamptz, timestamptz, int, int) to authenticated;
