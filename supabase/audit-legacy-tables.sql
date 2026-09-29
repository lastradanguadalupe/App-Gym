-- ============================================================
-- Audit: DDL de las 3 tablas huerfanas (NO destructivo)
--
-- No dropea nada. Solo reconstruye el DDL desde el catalogo de Postgres para
-- que quede guardado antes del borrado. Corre esto PRIMERO, guardate el
-- resultado, y recien despues corré drop-legacy-tables.sql.
--
-- Tablas: usuarios, ejercicios, rutinas
-- (existen en la base pero no estan en ninguna migracion del repo)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Columnas, tipos, defaults y nullability -> CREATE TABLE
-- ------------------------------------------------------------
select
  'create table public.' || c.relname || E' (\n  ' ||
  string_agg(
    '  ' || a.attname
      || ' ' || format_type(a.atttypid, a.atttypmod)
      || case when a.attnotnull then ' not null' else '' end
      || case when a.attidentity <> '' then ' generated always as identity' else '' end
      || case when pg_get_expr(ad.adbin, ad.adrelid) is not null
              then ' default ' || pg_get_expr(ad.adbin, ad.adrelid)
              else '' end
    , E',\n  ' order by a.attnum
  ) || E'\n);' as ddl_reconstruido
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a
  on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef ad
  on ad.adrelid = c.oid and ad.adnum = a.attnum
where n.nspname = 'public'
  and c.relname in ('usuarios', 'ejercicios', 'rutinas')
group by c.relname
order by c.relname;


-- ------------------------------------------------------------
-- 2) Restricciones (PK, UNIQUE, FK, CHECK) -> ALTER TABLE ... ADD CONSTRAINT
-- ------------------------------------------------------------
select
  'alter table public.' || c.relname || ' add ' || con.conname || E';\n  -- '
    || case con.contype
         when 'p' then 'PRIMARY KEY'
         when 'u' then 'UNIQUE'
         when 'f' then 'FOREIGN KEY -> '
              || (select cl2.relname from pg_class cl2 where cl2.oid = con.confrelid)
              || ' (' || (
                   select string_agg(a2.attname, ', ' order by k2.ord)
                   from unnest(con.conkey) with ordinality as k2(attnum, ord)
                   join pg_attribute a2 on a2.attrelid = con.conrelid and a2.attnum = k2.attnum
                 ) || ')'
         when 'c' then 'CHECK'
       end
    || case when pg_get_constraintdef(con.oid) is not null
            then E'\n  -- ' || pg_get_constraintdef(con.oid)
            else '' end as constraint_ddl
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('usuarios', 'ejercicios', 'rutinas')
order by c.relname, con.conname;


-- ------------------------------------------------------------
-- 3) Politicas RLS (incluye las recursivas que hay que eliminar)
-- ------------------------------------------------------------
select
  c.relname as tabla,
  pol.polname as policy,
  case pol.polcmd
    when 'r' then 'SELECT' when 'a' then 'INSERT'
    when 'w' then 'UPDATE' when 'd' then 'DELETE'
    when '*' then 'ALL'
  end as comando,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('usuarios', 'ejercicios', 'rutinas')
order by c.relname, pol.polname;


-- ------------------------------------------------------------
-- 4) Indices
-- ------------------------------------------------------------
-- pg_get_indexdev ya devuelve un CREATE INDEX completo y listo para pegar.
select
  c.relname as tabla,
  pg_get_indexdef(x.indexrelid) as index_ddl
from pg_index x
join pg_class c on c.oid = x.indrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('usuarios', 'ejercicios', 'rutinas')
order by c.relname, pg_get_indexdef(x.indexrelid);


-- ------------------------------------------------------------
-- 5) Privilegios de anon / authenticated  <-- relevante para el hallazgo #3
-- ------------------------------------------------------------
select
  c.relname as tabla,
  gr.grantee,
  has_table_privilege(gr.grantee, c.oid, 'SELECT') as puede_select,
  has_table_privilege(gr.grantee, c.oid, 'INSERT') as puede_insert,
  has_table_privilege(gr.grantee, c.oid, 'UPDATE') as puede_update,
  has_table_privilege(gr.grantee, c.oid, 'DELETE') as puede_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral (
  select unnest(array['anon', 'authenticated']) as grantee
) gr
where n.nspname = 'public'
  and c.relkind = 'r'
  and (
    has_table_privilege(gr.grantee, c.oid, 'SELECT')
    or has_table_privilege(gr.grantee, c.oid, 'INSERT')
    or has_table_privilege(gr.grantee, c.oid, 'UPDATE')
    or has_table_privilege(gr.grantee, c.oid, 'DELETE')
  )
order by c.relname, gr.grantee;


-- ------------------------------------------------------------
-- 6) Conteo de filas (sanity: deberian dar 0)
-- ------------------------------------------------------------
select 'usuarios' as tabla, count(*) as filas from public.usuarios
union all select 'ejercicios', count(*) from public.ejercicios
union all select 'rutinas',  count(*) from public.rutinas;


-- ------------------------------------------------------------
-- 7) CUERPO REAL de las funciones de seguridad  <-- cierra el hallazgo #4
--
-- handle_new_user tiene DOS definiciones en el repo:
--   init.sql:95              -> respeta el metadata 'role' => ESCALACION
--   staff_allowlist.sql:39   -> exige staff_allowlist     => segura
-- Esta query muestra cual esta viva de verdad. Si la version segura tiene
-- "is_staff_allowlisted", el codigo muerto de init.sql NO se esta ejecutando.
-- ------------------------------------------------------------
select
  p.proname as funcion,
  pg_get_functiondef(p.oid) as cuerpo,
  case
    when p.proname = 'handle_new_user'
     and pg_get_functiondef(p.oid) like '%is_staff_allowlisted%'
      then 'OK  -> version endurecida (respeta allowlist)'
    when p.proname = 'handle_new_user'
      then 'FALTA -> version VULNERABLE de init.sql activa (escalacion de rol)'
  end as veredicto
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user', 'is_staff_allowlisted', 'is_profe', 'my_role',
    'search_clients', 'search_clients_by_email', 'assign_profe'
  )
order by p.proname;
