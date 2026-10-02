-- ============================================================
-- Username, sexo e idioma
--
-- Reparto de responsabilidades:
--  * `profiles.username` y `profiles.idioma` son de CUENTA: los profes también
--    los tienen, así que van en `profiles` y no en `client_details`.
--  * `client_details.sexo` va junto a `fecha_nacimiento` porque es dato personal
--    y solo existe para alumnos (misma tabla de salud que ya ven dueño y profe).
--
-- `profiles` tiene privilege de columna (`revoke update` + `grant update
-- (name, avatar_url)`, ver 20260928000000_security_hardening.sql). Si no se
-- extiende ese grant, un update de username/idioma desde el cliente falla con
-- permission denied sin mensaje claro. `role`, `profe_id` y `email` siguen
-- intocables.
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles: username + idioma
-- ------------------------------------------------------------

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists idioma text not null default 'es';

-- Índice único case-insensitive sobre lower(username): "Ana" y "ana" colisionan.
-- Es parcial porque username es opcional.
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

-- 3 a 30 caracteres, letras/dígitos/punto/guion bajo. Sin espacios ni @.
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9._]{3,30}$');

alter table public.profiles
  drop constraint if exists profiles_idioma_check;
alter table public.profiles
  add constraint profiles_idioma_check
  check (idioma in ('es','en'));

-- El grant de columna se extiende; role/profe_id/email NO se agregan.
revoke update on public.profiles from authenticated;
grant update (name, avatar_url, username, idioma) on public.profiles to authenticated;

-- ------------------------------------------------------------
-- 2) client_details: sexo
-- ------------------------------------------------------------

alter table public.client_details add column if not exists sexo text;

alter table public.client_details
  drop constraint if exists client_details_sexo_check;
alter table public.client_details
  add constraint client_details_sexo_check
  check (sexo is null or sexo in ('masculino','femenino','prefiero no decirlo'));

-- ------------------------------------------------------------
-- 3) Comprobación: ¿la base ya tiene datos?
--    Si hay alumnos con peso/altura pero sin fila en medidas_corporales, la
--    sección "Medidas" arranca vacía para ellos. Se listan para decidir si
--    conviene sembrar la línea de base (ver README de la entrega).
-- ------------------------------------------------------------

-- select cd.user_id, cd.peso_kg, cd.altura_cm
--   from public.client_details cd
--  where cd.peso_kg is not null
--    and not exists (
--      select 1 from public.medidas_corporales m where m.usuario_id = cd.user_id
--    );