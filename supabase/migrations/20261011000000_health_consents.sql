-- ============================================================
-- Consentimientos (Ley 25.326, Argentina)
--
-- Los datos de salud del socio viven en `client_details.enfermedades` y
-- `client_details.lesiones`. En Argentina son datos sensibles: su tratamiento
-- exige consentimiento libre, expreso e informado (art. 5 y 6, Ley 25.326), y
-- nadie puede ser obligado a darlos.
--
-- Esta migración agrega:
--   1. `consents`: historial de solo agregar. Cada aceptación o retiro es una
--      fila nueva; el estado vigente es la última fila por (user_id, type).
--   2. RLS: cada usuario lee e inserta solo lo suyo. Sin update ni delete.
--   3. Validación del lado de la base: no se pueden guardar enfermedades ni
--      lesiones no vacías sin un consentimiento de salud vigente. Se hace con
--      un trigger en `client_details` para cubrir TODOS los caminos de escritura
--      (el insert/update directo del socio, el update del profe asignado y
--      cualquier RPC futuro), no solo la pantalla del cliente.
--   4. RPC `withdraw_health_consent`: retirar consentimiento y vaciar los datos
--      de salud en la misma transacción.
--
-- Convenciones tomadas del resto del proyecto:
--   * PK `bigint generated always as identity` (en este proyecto ninguna PK uuid
--     es autogenerada; ver 20261003000000_medidas_corporales.sql).
--   * Helpers `security definer` con `search_path = ''` (evitan recursión y
--     bypassan RLS al leer `consents` desde el trigger).
--   * `anon` no recibe privilegios de tabla.
--   * El estado vigente se lee con `order by created_at desc, id desc limit 1`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabla `consents` (historial de solo agregar)
-- ------------------------------------------------------------

create table if not exists public.consents (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  type           text not null check (type in ('privacy_policy', 'health_data')),
  policy_version text not null,
  granted        boolean not null,
  created_at     timestamptz not null default now()
);

-- El índice principal es el que usa la lectura del estado vigente.
create index if not exists consents_user_type_created_idx
  on public.consents (user_id, type, created_at desc, id desc);

alter table public.consents enable row level security;

-- ------------------------------------------------------------
-- 2) Grants: `anon` no toca esta tabla; `authenticated` solo lee e inserta.
--    Sin update ni delete: el historial es inmutable desde el cliente.
--    (Los default privileges del schema le dan `all` a authenticated en la
--    tabla nueva; por eso hay que revocar update y delete explícitamente.)
-- ------------------------------------------------------------

revoke all on table public.consents from anon;
revoke update, delete on table public.consents from authenticated;
grant select, insert on table public.consents to authenticated;
grant usage, select on sequence public.consents_id_seq to authenticated;

-- ------------------------------------------------------------
-- 3) RLS: solo las filas propias. Los profes NO leen consentimientos ajenos.
-- ------------------------------------------------------------

drop policy if exists consents_select_own on public.consents;
drop policy if exists consents_insert_own on public.consents;

create policy "consents_select_own"
  on public.consents for select
  using (user_id = auth.uid());

create policy "consents_insert_own"
  on public.consents for insert
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4) Estado vigente del consentimiento de salud.
--    `security definer`: el trigger lo evalúa en el contexto del que escribe
--    (socio o profe), y tiene que poder leer `consents` sin depender de RLS.
-- ------------------------------------------------------------

create or replace function public.has_health_consent(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select c.granted
      from public.consents c
      where c.user_id = uid
        and c.type = 'health_data'
      order by c.created_at desc, c.id desc
      limit 1
    ),
    false
  );
$$;

revoke all on function public.has_health_consent(uuid) from public;
grant execute on function public.has_health_consent(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) Validación del lado de la base.
--
--    Trigger BEFORE INSERT OR UPDATE en `client_details`: si la fila nueva
--    guarda al menos una enfermedad o lesión no vacía y el dueño no tiene un
--    consentimiento de salud vigente, aborta con un mensaje de producto.
--    Se evaluó la variante "validar dentro de la RPC de escritura", pero hoy
--    `client_details` se escribe con PostgREST directo desde
--    `upsertClientDetails`, así que el trigger es la forma más simple y
--    robusta: cubre todos los caminos de escritura sin tocar el front.
-- ------------------------------------------------------------

create or replace function public.enforce_health_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target   uuid := coalesce(new.user_id, old.user_id);
  has_data boolean;
begin
  has_data :=
    exists (select 1 from unnest(coalesce(new.enfermedades, '{}')) e where btrim(e) <> '')
    or exists (select 1 from unnest(coalesce(new.lesiones, '{}')) l where btrim(l) <> '');

  if has_data and not public.has_health_consent(target) then
    raise exception 'No se pueden guardar datos de salud sin consentimiento vigente';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_health_consent() from public;

drop trigger if exists client_details_health_consent on public.client_details;

create trigger client_details_health_consent
  before insert or update on public.client_details
  for each row execute procedure public.enforce_health_consent();

-- ------------------------------------------------------------
-- 6) Retirar el consentimiento de salud.
--
--    Registra el retiro (granted = false) y vacía enfermedades y lesiones del
--    usuario en la misma transacción. La versión de la política llega como
--    parámetro para no duplicar la constante que vive en el código
--    (`src/lib/legal.ts`). El update del trigger pasa porque las listas quedan
--    vacías.
-- ------------------------------------------------------------

create or replace function public.withdraw_health_consent(p_policy_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.consents (user_id, type, policy_version, granted)
  values (auth.uid(), 'health_data', p_policy_version, false);

  update public.client_details
     set enfermedades = '{}',
         lesiones     = '{}',
         updated_at   = now()
   where user_id = auth.uid();
end;
$$;

revoke all on function public.withdraw_health_consent(text) from public;
grant execute on function public.withdraw_health_consent(text) to authenticated;

-- ------------------------------------------------------------
-- 7) Conteo de usuarios existentes en la situación "tengo datos de salud pero
--    no tengo consentimiento". Solo conteo, sin datos personales.
--    Correr a mano antes o después de aplicar la migración:
--
--    select count(*) as pendientes
--      from public.client_details cd
--     where (
--             exists (select 1 from unnest(coalesce(cd.enfermedades, '{}')) e where btrim(e) <> '')
--             or exists (select 1 from unnest(coalesce(cd.lesiones, '{}')) l where btrim(l) <> '')
--           )
--       and not public.has_health_consent(cd.user_id);
-- ------------------------------------------------------------
