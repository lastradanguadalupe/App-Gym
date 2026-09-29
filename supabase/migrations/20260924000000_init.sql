-- ============================================================
-- AppGym - Initial schema
-- Roles: 'cliente' (socio) y 'profe' (entrenador/admin)
-- ============================================================

create extension if not exists "pgcrypto";

-- Privilegios de arranque.
--
-- 'anon' NO recibe privilegios de tabla: si los recibiera, cualquier request
-- sin sesion llegaria hasta RLS. Con RLS eso no equivale a leer datos, pero si
-- a enumerar que tablas existen y a disparar errores de policy (la 42P17 de
-- las tablas huerfanas). La politica real la aplican los column grants de
-- 20260928000000_security_hardening.sql, que si le dan acceso a 'authenticated'.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all routines in schema public to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant all on routines to authenticated;

-- ============================================================
-- Helper functions (security definer, bypass RLS, no recursion)
-- ============================================================

create or replace function public.my_role()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (select p.role from public.profiles p where p.id = auth.uid());
end;
$$;

create or replace function public.is_profe()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profe');
end;
$$;

create or replace function public.is_cliente()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'cliente');
end;
$$;

-- Id del profe asignado al usuario actual (para que el socio vea a su profe).
create or replace function public.my_profe_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (select p.profe_id from public.profiles p where p.id = auth.uid());
end;
$$;

create or replace function public.can_access_routine(rid bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.routines r
    where r.id = rid and (r.profe_id = auth.uid() or r.cliente_id = auth.uid())
  );
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- New user → profile row.
--
-- Version fail-closed: el rol NUNCA sale del metadata del signup, siempre
-- 'cliente'. La version de 20260927000000_staff_allowlist.sql es la que honra
-- role='profe', y solo si el email esta en staff_allowlist.
--
-- No se borra esta definicion porque el trigger de abajo la necesita para
-- existir: eliminarla haria fallar el CREATE TRIGGER en un reset limpio.
-- Lo que se elimina es la escalada de privilegios, no la presencia de la
-- funcion.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'cliente'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Profe asigna un alumno a sí mismo.
create or replace function public.assign_profe(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_profe() then
    update public.profiles
       set profe_id = auth.uid(), updated_at = now()
     where id = target and role = 'cliente';
  end if;
end;
$$;

-- ============================================================
-- profiles
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'cliente' check (role in ('cliente', 'profe')),
  profe_id    uuid references public.profiles (id) on delete set null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_profe_id_idx on public.profiles (profe_id);
create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_profe"
  on public.profiles for select
  using (auth.uid() = id or public.is_profe() or id = public.my_profe_id());

create policy "profiles_insert_profe"
  on public.profiles for insert
  with check (public.is_profe());

create policy "profiles_update_own_or_profe"
  on public.profiles for update
  using (auth.uid() = id or public.is_profe())
  with check (
    (auth.uid() = id and role = public.my_role())
    or
    (public.is_profe() and role = 'cliente')
  );

-- ============================================================
-- client_details (formulario del socio: edad, altura, peso, ...)
-- ============================================================

create table if not exists public.client_details (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  fecha_nacimiento date,
  altura_cm        numeric(5,1),
  peso_kg          numeric(5,1),
  objetivo         text,
  enfermedades     text[] default '{}',
  lesiones         text[] default '{}',
  experiencia      text check (experiencia in ('inicio','intermedio','avanzado')),
  rutina_activa    boolean default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id)
);

alter table public.client_details enable row level security;

create policy "client_details_select_own_or_profe"
  on public.client_details for select
  using (user_id = auth.uid() or public.is_profe());

create policy "client_details_insert_own"
  on public.client_details for insert
  with check (user_id = auth.uid());

create policy "client_details_update_own_or_profe"
  on public.client_details for update
  using (user_id = auth.uid() or public.is_profe());

create trigger client_details_set_updated_at
  before update on public.client_details
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Catálogo de músculos y ejercicios
-- ============================================================

create table if not exists public.muscle_groups (
  id      bigint generated always as identity primary key,
  name    text not null unique,
  region  text not null check (region in ('superior','inferior','core','full'))
);

alter table public.muscle_groups enable row level security;

create policy "muscle_groups_select_authenticated"
  on public.muscle_groups for select
  using (auth.role() = 'authenticated');

create policy "muscle_groups_write_profe"
  on public.muscle_groups for all
  using (public.is_profe())
  with check (public.is_profe());

create table if not exists public.exercises (
  id              bigint generated always as identity primary key,
  muscle_group_id bigint not null references public.muscle_groups (id) on delete cascade,
  name            text not null,
  instructions    text,
  image_url       text,
  video_url       text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists exercises_muscle_group_idx on public.exercises (muscle_group_id);

alter table public.exercises enable row level security;

create policy "exercises_select_authenticated"
  on public.exercises for select
  using (auth.role() = 'authenticated');

create policy "exercises_write_profe"
  on public.exercises for all
  using (public.is_profe())
  with check (public.is_profe());

-- ============================================================
-- Rutinas, bloques y ejercicios por bloque
-- ============================================================

create table if not exists public.routines (
  id          bigint generated always as identity primary key,
  profe_id    uuid not null references public.profiles (id) on delete cascade,
  cliente_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists routines_cliente_idx on public.routines (cliente_id);
create index if not exists routines_profe_idx on public.routines (profe_id);

alter table public.routines enable row level security;

create policy "routines_select_access"
  on public.routines for select
  using (public.can_access_routine(id));

create policy "routines_insert_profe"
  on public.routines for insert
  with check (public.is_profe() and profe_id = auth.uid());

create policy "routines_update_profe"
  on public.routines for update
  using (profe_id = auth.uid());

create policy "routines_delete_profe"
  on public.routines for delete
  using (profe_id = auth.uid());

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute procedure public.set_updated_at();

create table if not exists public.routine_blocks (
  id          bigint generated always as identity primary key,
  routine_id  bigint not null references public.routines (id) on delete cascade,
  name        text not null,
  region      text not null check (region in ('superior','inferior','core','full')),
  position    int not null default 0
);

create index if not exists routine_blocks_routine_idx on public.routine_blocks (routine_id);

alter table public.routine_blocks enable row level security;

create policy "blocks_select_access"
  on public.routine_blocks for select
  using (public.can_access_routine(routine_id));

create policy "blocks_write_profe"
  on public.routine_blocks for all
  using (public.is_profe())
  with check (public.is_profe());

create table if not exists public.routine_block_exercises (
  id           bigint generated always as identity primary key,
  block_id     bigint not null references public.routine_blocks (id) on delete cascade,
  exercise_id  bigint not null references public.exercises (id) on delete cascade,
  sets         int not null default 3,
  reps         text not null default '10-12',
  rest_seconds int not null default 60,
  notes        text,
  position     int not null default 0
);

create index if not exists rbe_block_idx on public.routine_block_exercises (block_id);

alter table public.routine_block_exercises enable row level security;

create policy "rbe_select_access"
  on public.routine_block_exercises for select
  using (public.can_access_routine((select routine_id from public.routine_blocks b where b.id = block_id)));

create policy "rbe_write_profe"
  on public.routine_block_exercises for all
  using (public.is_profe())
  with check (public.is_profe());

-- ============================================================
-- El socio elige qué día de la semana hace cada bloque
-- 0 = Lunes ... 6 = Domingo
-- ============================================================

create table if not exists public.routine_schedule (
  id          bigint generated always as identity primary key,
  routine_id  bigint not null references public.routines (id) on delete cascade,
  client_id   uuid not null references public.profiles (id) on delete cascade,
  block_id    bigint not null references public.routine_blocks (id) on delete cascade,
  weekday     int not null check (weekday between 0 and 6),
  created_at  timestamptz not null default now(),
  unique (client_id, weekday)
);

alter table public.routine_schedule enable row level security;

create policy "schedule_select"
  on public.routine_schedule for select
  using (client_id = auth.uid() or public.is_profe());

create policy "schedule_write"
  on public.routine_schedule for all
  using (client_id = auth.uid() or public.is_profe())
  with check (client_id = auth.uid() or public.is_profe());

-- ============================================================
-- Sesiones de entrenamiento (día completado + duración)
-- ============================================================

create table if not exists public.workout_sessions (
  id               bigint generated always as identity primary key,
  client_id        uuid not null references public.profiles (id) on delete cascade,
  block_id         bigint references public.routine_blocks (id) on delete set null,
  routine_id       bigint references public.routines (id) on delete set null,
  weekday          int check (weekday between 0 and 6),
  completed_on     timestamptz not null default now(),
  duration_minutes int,
  notes            text
);

create index if not exists workout_sessions_client_idx on public.workout_sessions (client_id, completed_on);

alter table public.workout_sessions enable row level security;

create policy "sessions_select_own_or_profe"
  on public.workout_sessions for select
  using (client_id = auth.uid() or public.is_profe());

create policy "sessions_write_own"
  on public.workout_sessions for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ============================================================
-- Frases motivadoras y tips de alimentación
-- ============================================================

create table if not exists public.motivational_phrases (
  id        bigint generated always as identity primary key,
  text      text not null,
  author    text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.motivational_phrases enable row level security;

create policy "phrases_select_authenticated"
  on public.motivational_phrases for select
  using (auth.role() = 'authenticated');

create policy "phrases_write_profe"
  on public.motivational_phrases for all
  using (public.is_profe())
  with check (public.is_profe());

create table if not exists public.nutrition_tips (
  id         bigint generated always as identity primary key,
  title      text not null,
  body       text,
  is_active  boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.nutrition_tips enable row level security;

create policy "tips_select_authenticated"
  on public.nutrition_tips for select
  using (auth.role() = 'authenticated');

create policy "tips_write_profe"
  on public.nutrition_tips for all
  using (public.is_profe())
  with check (public.is_profe());

-- ============================================================
-- Seed data
-- ============================================================

insert into public.muscle_groups (name, region) values
  ('Pecho',        'superior'),
  ('Espalda',      'superior'),
  ('Hombros',      'superior'),
  ('Bíceps',       'superior'),
  ('Tríceps',      'superior'),
  ('Cuádriceps',   'inferior'),
  ('Femorales',    'inferior'),
  ('Glúteos',      'inferior'),
  ('Pantorrillas', 'inferior'),
  ('Abdominales',  'core'),
  ('Core',         'core')
on conflict (name) do nothing;

insert into public.exercises (muscle_group_id, name, instructions, image_url) values
  ((select id from public.muscle_groups where name = 'Pecho'), 'Press de banca con barra',
   'Acostate en el banco con los pies firmes en el piso. Bajá la barra hasta el pecho manteniendo los codos a 45°, empujá hacia arriba sin bloquear los codos y controlando el descenso.', null),
  ((select id from public.muscle_groups where name = 'Pecho'), 'Press inclinado con mancuernas',
   'Sentate en el banco inclinado con una mancuerna en cada mano. Bajá las mancuernas controlado hasta la altura del pecho y presioná hacia arriba, juntándolas levemente al final.', null),
  ((select id from public.muscle_groups where name = 'Pecho'), 'Aperturas con mancuernas',
   'Acostado, brazos extendidos con una leve flexión de codos. Abrí los brazos en arco controlado y volvé a juntarlos apretando el pecho.', null),
  ((select id from public.muscle_groups where name = 'Pecho'), 'Flexiones de pecho',
   'Con el cuerpo alineado y las manos a la altura de los hombros, bajá el pecho hasta el suelo flexionando los codos y subí empujando con fuerza.', null),

  ((select id from public.muscle_groups where name = 'Espalda'), 'Dominadas',
   'Colgate de la barra con agarre prono. Subí llevando el pecho a la barra y bajá controlado hasta extender los brazos. Si no llegás, usá banda o máquina asistida.', null),
  ((select id from public.muscle_groups where name = 'Espalda'), 'Remo con barra',
   'Con el torso inclinado a 45° y la espalda neutra, traccioná la barra hacia el abdomen y bajá controlado sin arquear la zona lumbar.', null),
  ((select id from public.muscle_groups where name = 'Espalda'), 'Jalón al pecho',
   'Sentado en la máquina, traccioná la barra hacia la parte alta del pecho apretando los omóplatos y volvé controlado.', null),
  ((select id from public.muscle_groups where name = 'Espalda'), 'Remo con mancuerna',
   'Apoyando una mano y una rodilla en el banco, traccioná la mancuerna hacia la cadera con el codo pegado al cuerpo y bajá sin perder la postura.', null),

  ((select id from public.muscle_groups where name = 'Hombros'), 'Press militar con mancuernas',
   'De pie o sentado, elevá las mancuernas desde los hombros hasta extender los brazos sobre la cabeza sin arquear la espalda.', null),
  ((select id from public.muscle_groups where name = 'Hombros'), 'Elevaciones laterales',
   'Con los brazos levemente flexionados, elevá las mancuernas a los costados hasta la altura de los hombros y bajá controlado.', null),
  ((select id from public.muscle_groups where name = 'Hombros'), 'Pájaros (vuelos posteriores)',
   'Torso inclinado y espalda neutra, abrí los brazos hacia los costados apretando la parte posterior del hombro.', null),
  ((select id from public.muscle_groups where name = 'Hombros'), 'Encogimientos',
   'De pie con una mancuerna en cada mano, subí los hombros hacia las orejas y bajá manteniendo los brazos estirados.', null),

  ((select id from public.muscle_groups where name = 'Bíceps'), 'Curl de bíceps con barra',
   'De pie, flexioná los codos llevando la barra al pecho sin mover los hombros y bajá controlado hasta estirar.', null),
  ((select id from public.muscle_groups where name = 'Bíceps'), 'Curl alternado con mancuernas',
   'Sentado o de pie, curl de a un brazo por vez rotando la muñeca mientras subís.', null),
  ((select id from public.muscle_groups where name = 'Bíceps'), 'Curl martillo',
   'Con las palmas enfrentadas (agarre neutro), flexioná los codos llevando las mancuernas hacia los hombros.', null),
  ((select id from public.muscle_groups where name = 'Bíceps'), 'Curl en banco Scott',
   'Apoyá los brazos sobre el banco inclinado y flexioná los codos sin despegar los hombros del apoyo.', null),

  ((select id from public.muscle_groups where name = 'Tríceps'), 'Press francés',
   'Acostado, con la barra o mancuernas sobre el pecho, flexioná los codos llevando el peso hacia la frente y extendé sin mover los brazos.', null),
  ((select id from public.muscle_groups where name = 'Tríceps'), 'Extensión en polea alta',
   'De frente a la polea, descendé la barra hacia el muslo fijando los codos al costado del cuerpo.', null),
  ((select id from public.muscle_groups where name = 'Tríceps'), 'Fondos en paralelas',
   'Con el cuerpo levemente inclinado, flexioná los codos bajando y subí extendiendo sin rotar los hombros.', null),
  ((select id from public.muscle_groups where name = 'Tríceps'), 'Patada de tríceps',
   'Torso inclinado y brazo pegado al cuerpo, extendé el antebrazo hacia atrás hasta estirar el tríceps.', null),

  ((select id from public.muscle_groups where name = 'Cuádriceps'), 'Sentadilla con barra',
   'Con la barra en la espalda y los pies a la altura de los hombros, bajá flexionando rodillas y cadera hasta que los muslos queden paralelos al piso, y subí empujando el piso.', null),
  ((select id from public.muscle_groups where name = 'Cuádriceps'), 'Prensa de piernas',
   'Sentado en la máquina, bajá la plataforma flexionando las rodillas sin que la cadera se despegue y empujá con los pies.', null),
  ((select id from public.muscle_groups where name = 'Cuádriceps'), 'Zancadas',
   'De pie, avanzá un paso largo y bajá hasta que ambas rodillas queden a 90°, luego volvé a la posición inicial.', null),
  ((select id from public.muscle_groups where name = 'Cuádriceps'), 'Extensiones de cuádriceps',
   'Sentado en la máquina, extendé las rodillas levantando el peso hasta estirar las piernas y bajá controlado.', null),

  ((select id from public.muscle_groups where name = 'Femorales'), 'Peso muerto rumano',
   'Con la barra en la mano, bajá el torso hacia adelante llevando la cadera atrás con las piernas casi rectas, sintiendo el estiramiento del femoral, y subí empujando la cadera.', null),
  ((select id from public.muscle_groups where name = 'Femorales'), 'Curl femoral acostado',
   'En la máquina, flexioná las rodillas acercando el tobillo a la cola y bajá controlado.', null),
  ((select id from public.muscle_groups where name = 'Femorales'), 'Buenos días',
   'Con la barra en la espalda, flexioná levemente las rodillas y basculá el torso hacia adelante sintiendo el femoral, volvé con la cadera.', null),

  ((select id from public.muscle_groups where name = 'Glúteos'), 'Hip thrust',
   'Apoyando la espalda alta en el banco, empujá la cadera hacia arriba con el peso en la cadera y apretá el glúteo al final.', null),
  ((select id from public.muscle_groups where name = 'Glúteos'), 'Peso muerto con piernas rígidas',
   'Manteniendo piernas casi rectas, bajá la barra rozando las piernas y subí apretando los glúteos.', null),
  ((select id from public.muscle_groups where name = 'Glúteos'), 'Abducción con máquina',
   'Sentado en la máquina, abrí las piernas venciendo la resistencia apretando el glúteo externo y volvé controlado.', null),
  ((select id from public.muscle_groups where name = 'Glúteos'), 'Puente de glúteo',
   'Acostado, con los pies apoyados, elevá la cadera apretando los glúteos y mantené 1 segundo antes de bajar.', null),

  ((select id from public.muscle_groups where name = 'Pantorrillas'), 'Elevación de pantorrillas de pie',
   'De pie con los talones al borde de una superficie, elevá y bajá el talón con amplitud completa.', null),
  ((select id from public.muscle_groups where name = 'Pantorrillas'), 'Elevación de pantorrillas sentado',
   'Sentado con el peso en las rodillas, elevá los talones apretando la pantorrilla y bajá hasta estirarla.', null),

  ((select id from public.muscle_groups where name = 'Abdominales'), 'Crunch abdominal',
   'Acostado, flexioná el tronco llevando las costillas hacia la pelvis sin tirar del cuello, y volvé sin apoyar del todo.', null),
  ((select id from public.muscle_groups where name = 'Abdominales'), 'Plancha',
   'Apoyado en antebrazos y puntas de pies, mantené el cuerpo en línea recta sin dejar caer la cadera.', null),
  ((select id from public.muscle_groups where name = 'Abdominales'), 'Elevación de piernas',
   'Acostado o colgado, elevá las piernas rectas hasta formar 90° y bajá controlado sin arquear la espalda.', null),
  ((select id from public.muscle_groups where name = 'Abdominales'), 'Rueda abdominal',
   'De rodillas, rodá hacia adelante llevando el cuerpo horizontal y volvé contrayendo el abdomen.', null),

  ((select id from public.muscle_groups where name = 'Core'), 'Dead bug',
   'Acostado con brazos y piernas elevadas, extendé el brazo y la pierna opuesta en simultáneo manteniendo la lumbar pegada al piso.', null),
  ((select id from public.muscle_groups where name = 'Core'), 'Plancha lateral',
   'Apoyado en un antebrazo y el costado del pie, mantené el cuerpo alineado de costado sin dejar caer la cadera.', null),
  ((select id from public.muscle_groups where name = 'Core'), 'Bird dog',
   'En cuatro puntos, extendé el brazo y la pierna opuesta al mismo tiempo manteniendo la espalda neutra.', null)
on conflict do nothing;

insert into public.motivational_phrases (text, author) values
  ('El éxito es la suma de pequeños esfuerzos repetidos día tras día.', 'Robert Collier'),
  ('No cuentes los días, hacé que los días cuenten.', 'Muhammad Ali'),
  ('La disciplina es el puente entre tus metas y tus logros.', 'Jim Rohn'),
  ('Sufre ahora y vive el resto de tu vida como un campeón.', 'Muhammad Ali'),
  ('La única mala sesión de entrenamiento es la que no hiciste.', null),
  ('Tu cuerpo puede soportar casi cualquier cosa. Es tu mente la que hay que convencer.', null),
  ('El dolor que hoy sentís es la fuerza que mañana vas a tener.', null),
  ('Ningún progreso es pequeño. Cada rep cuenta.', null)
on conflict do nothing;

insert into public.nutrition_tips (title, body) values
  ('Proteína en cada comida', 'Sumá una fuente de proteína (carne, pollo, pescado, huevos o legumbres) en cada comida para favorecer la recuperación y el desarrollo muscular.'),
  ('No te saltes el desayuno', 'Arrancar el día con una comida equilibrada te da energía para entrenar mejor y evita picar comida poco saludable a media mañana.'),
  ('Hidratación constante', 'Tomá agua a lo largo del día y en especial antes, durante y después del entrenamiento. La sed ya es señal de deshidratación.'),
  ('Carbohidratos según el momento', 'Priorizá carbohidratos complejos (avena, arroz, papa, batata) sobre todo antes de entrenar para tener energía disponible.'),
  ('Dormí al menos 7 horas', 'El descanso es parte del entrenamiento: mientras dormís es cuando el cuerpo se recupera y crece el músculo.'),
  ('No eliminés grasas', 'Incluí grasas buenas (palta, frutos secos, aceite de oliva) en cantidades moderadas; son necesarias para las hormonas y las articulaciones.')
on conflict do nothing;