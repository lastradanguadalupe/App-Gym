-- ============================================================
-- Fix #9 (ALTO): cualquier profe podia promover a otro a profe (alcance global)
--
-- grant_staff_access / revoke_staff_access solo verificaban is_profe(),
-- es decir: CUALQUIER entrenador autenticado podia:
--   1) habilitar cualquier email en la allow-list
--   2) promover al instante una cuenta existente a role = 'profe'
-- Eso es escalacion de privilegios entre tenants, no una accion de
-- gestion de alumnos.
--
-- Decision del owner: la alta de un profe nuevo es una accion MANUAL
-- (UPDATE/INSERT directo desde el SQL Editor), no exposed en la app.
--
-- Por lo tanto se eliminan las RPCs de gestion. Se conservan:
--   - public.staff_allowlist  (tabla; la consulta handle_new_user)
--   - public.is_staff_allowlisted() (helper del trigger, sin execute para public)
--   - public.handle_new_user() (trigger de alta, ya endurecido)
-- ============================================================

drop function if exists public.grant_staff_access(text, text);
drop function if exists public.revoke_staff_access(text);
drop function if exists public.list_staff_allowlist();

-- Cinturon y tirantes: si alguien recrea estas funciones a mano, no
-- arrancan con execute para authenticated.
revoke execute on function public.is_staff_allowlisted(text) from public;
