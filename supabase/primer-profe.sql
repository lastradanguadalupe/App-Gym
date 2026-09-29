-- ============================================================
-- Alta / baja MANUAL de profes
--
-- Corré esto desde el Supabase SQL Editor (dashboard > SQL > New query).
-- Es la UNICA via habilitada: las RPCs grant_staff_access / revoke_staff_access
-- se eliminaron y la pantalla "Equipo" ya no existe en la app, porque cualquier
-- entrenador autenticado podia promover a otro y escalar privilegios.
--
-- Editá los valores de abajo y corré el bloque que necesites.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Habilitar un profe nuevo (todavia NO registrado en la app)
--    Insertar el email lo habilita para registrarse como profe.
-- ------------------------------------------------------------
insert into public.staff_allowlist (email, note)
values ('ENTRENADOR@mail.com', 'alta manual')
on conflict (email) do nothing;

-- ------------------------------------------------------------
-- 2) Promover una cuenta que YA existe (se habia registrado como alumno)
-- ------------------------------------------------------------
update public.profiles
   set role = 'profe', updated_at = now()
 where email = 'ENTRENADOR@mail.com'
   and role = 'cliente';

-- ------------------------------------------------------------
-- 3) Ver la allow-list vigente
-- ------------------------------------------------------------
select email, note, created_at
from public.staff_allowlist
order by created_at desc;

-- ------------------------------------------------------------
-- 4) Dar de baja un profe
--    OJO: solo bajalo de rol si no tiene alumnos ni rutinas, o esos
--    registros quedan huerfanos. Verificá antes con:
--
--    select
--      (select count(*) from public.profiles     where profe_id = p.id) as alumnos,
--      (select count(*) from public.routines    where profe_id = p.id) as rutinas
--      from public.profiles p
--     where p.email = 'ENTRENADOR@mail.com' and p.role = 'profe';
-- ------------------------------------------------------------
delete from public.staff_allowlist where email = 'ENTRENADOR@mail.com';

update public.profiles
   set role = 'cliente', updated_at = now()
 where email = 'ENTRENADOR@mail.com'
   and role = 'profe'
   and not exists (select 1 from public.profiles  c where c.profe_id = public.profiles.id)
   and not exists (select 1 from public.routines   r where r.profe_id = public.profiles.id);
