-- ============================================================
-- Historial de medidas corporales
--
-- `client_details.peso_kg` / `altura_cm` guardan la línea de base que se carga
-- en el onboarding. Esta tabla agrega el historial: cada medición es una fila
-- nueva con su fecha, así nunca se pisa un valor anterior.
--
-- Decisiones:
--  * `usuario_id` referencia `profiles(id)`, que es la tabla de usuarios real
--    (`usuarios` era una tabla legacy y ya fue dropeada; ver drop-legacy-tables.sql).
--  * PK `bigint identity` como el resto de las tablas del schema (no hay
--    `gen_random_uuid()`: en este proyecto ninguna PK uuid es autogenerada).
--  * `unique (usuario_id, fecha)`: volver a medir el mismo día actualiza la
--    fila de ese día en lugar de duplicar el punto del gráfico.
--  * El trigger `sync_client_details_measurements` espeja la última medición en
--    `client_details` para que la ficha del alumno en el panel del profe no
--    quede mostrando la línea de base del onboarding para siempre.
-- ============================================================

create table if not exists public.medidas_corporales (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  fecha      date not null default current_date,
  peso_kg    numeric(5,1) not null check (peso_kg > 0 and peso_kg < 400),
  altura_cm  numeric(5,1) check (altura_cm > 0 and altura_cm < 300),
  creado_en  timestamptz not null default now(),
  unique (usuario_id, fecha)
);

alter table public.medidas_corporales enable row level security;

-- El índice principal es (usuario_id, fecha) para el ORDER BY del gráfico.
create index if not exists medidas_corporales_usuario_fecha_idx
  on public.medidas_corporales (usuario_id, fecha desc);

-- ------------------------------------------------------------
-- 1) Grants: `anon` no toca esta tabla (dato de salud del alumno).
-- ------------------------------------------------------------

revoke all on table public.medidas_corporales from anon;

-- ------------------------------------------------------------
-- 2) RLS — mismo patrón que `client_details`: DATOS DE SALUD.
--    El socio lee y escribe solo lo suyo; su profe asignado puede leerlo
--    (para seguir la evolución), pero nunca escribirlo.
-- ------------------------------------------------------------

drop policy if exists medidas_select_own_or_assigned on public.medidas_corporales;
drop policy if exists medidas_insert_own on public.medidas_corporales;
drop policy if exists medidas_update_own on public.medidas_corporales;
drop policy if exists medidas_delete_own on public.medidas_corporales;

create policy "medidas_select_own_or_assigned"
  on public.medidas_corporales for select
  using (
    usuario_id = auth.uid()
    or usuario_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

create policy "medidas_insert_own"
  on public.medidas_corporales for insert
  with check (usuario_id = auth.uid());

create policy "medidas_update_own"
  on public.medidas_corporales for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy "medidas_delete_own"
  on public.medidas_corporales for delete
  using (usuario_id = auth.uid());

-- ------------------------------------------------------------
-- 3) Espejo de la última medición hacia `client_details`.
--    Se dispara solo; el cliente nunca escribe estas columnas desde acá.
--
--    No se crea la fila de `client_details` si falta: la sección "Medidas" vive
--    dentro de Perfil, que está detrás del guard de onboarding, así que la fila
--    siempre existe cuando se llega a insertar una medición.
-- ------------------------------------------------------------

create or replace function public.sync_client_details_measurements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.usuario_id, old.usuario_id);
begin
  -- Subconsultas ESCALARES a propósito (no UPDATE ... FROM): si no queda
  -- ninguna medición, devuelven NULL y el UPDATE igual corre, dejando
  -- peso_kg en NULL. Con `update ... from (...)` el update no matchearía
  -- ninguna fila y client_details conservaría el valor viejo.
  update public.client_details cd
     set peso_kg   = (
           select m.peso_kg from public.medidas_corporales m
            where m.usuario_id = target
            order by m.fecha desc, m.id desc
            limit 1
         ),
         altura_cm = coalesce(
           (
             select m.altura_cm from public.medidas_corporales m
              where m.usuario_id = target
              order by m.fecha desc, m.id desc
              limit 1
           ),
           cd.altura_cm
         ),
         updated_at = now()
   where cd.user_id = target;

  return coalesce(new, old);
end;
$$;

drop trigger if exists medidas_sync_client_details on public.medidas_corporales;

create trigger medidas_sync_client_details
  after insert or update or delete on public.medidas_corporales
  for each row execute procedure public.sync_client_details_measurements();

revoke all on function public.sync_client_details_measurements() from public;