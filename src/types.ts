export type Role = 'cliente' | 'profe';
export type Region = 'superior' | 'inferior' | 'core' | 'full';
export type Experiencia = 'inicio' | 'intermedio' | 'avanzado';

/** Opciones cerradas de sexo. `null` = el usuario no lo completó. */
export type Sexo = 'masculino' | 'femenino' | 'prefiero no decirlo';

/** Idiomas soportados por la app. El valor va a `profiles.idioma`. */
export type Idioma = 'es' | 'en';

export const SEXOS: readonly Sexo[] = ['masculino', 'femenino', 'prefiero no decirlo'] as const;

export const IDIOMAS: readonly Idioma[] = ['es', 'en'] as const;

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  idioma: Idioma;
  role: Role;
  profe_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDetails {
  id: number;
  user_id: string;
  fecha_nacimiento: string | null;
  sexo: Sexo | null;
  altura_cm: number | null;
  peso_kg: number | null;
  objetivo: string | null;
  enfermedades: string[];
  lesiones: string[];
  experiencia: Experiencia | null;
  rutina_activa: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Una fila de `profe_details`: datos personales del entrenador.
 *
 * Vive aparte de `client_details` a propósito. Esa tabla es el cuestionario del
 * socio y su RLS deja que el profe asignado la lea; los datos del profe no los
 * tiene que ver nadie más que él.
 */
export interface ProfeDetails {
  user_id: string;
  fecha_nacimiento: string | null;
  sexo: Sexo | null;
  anios_experiencia: number | null;
  created_at: string;
  updated_at: string;
}

/** Una fila de `medidas_corporales`: un punto del gráfico de evolución. */
export interface MedidaCorporal {
  id: number;
  usuario_id: string;
  fecha: string;
  peso_kg: number;
  altura_cm: number | null;
  creado_en: string;
}

/** Tipos de consentimiento que registra la app. */
export type ConsentType = 'privacy_policy' | 'health_data';

/**
 * Una fila de `consents`. Es un historial de solo agregar: cada aceptación o
 * retiro es una fila nueva, y el estado vigente es la última por
 * (`user_id`, `type`) ordenada por `created_at` e `id`.
 */
export interface Consent {
  id: number;
  user_id: string;
  type: ConsentType;
  policy_version: string;
  granted: boolean;
  created_at: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
  region: Region;
}

export interface Exercise {
  id: number;
  muscle_group_id: number;
  name: string;
  instructions: string | null;
  image_url: string | null;
  video_url: string | null;
  created_by: string | null;
  created_at: string;
  muscle_groups?: MuscleGroup;
}

export interface Routine {
  id: number;
  profe_id: string;
  cliente_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineBlock {
  id: number;
  routine_id: number;
  name: string;
  region: Region;
  position: number;
}

/**
 * Una fila de `routine_block_exercises`.
 *
 * `sets`, `reps`, `rest_seconds` y `peso_kg` son opcionales a propósito: el
 * profe los define ejercicio por ejercicio y no hay valores por defecto. `null`
 * = "sin definir" y se muestra como "—" o se omite, nunca como un número
 * inventado. `peso_kg = 0` significa "peso corporal / sin peso".
 */
export interface RoutineBlockExercise {
  id: number;
  block_id: number;
  exercise_id: number;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  peso_kg: number | null;
  notes: string | null;
  position: number;
  exercises?: Exercise & { muscle_groups?: MuscleGroup };
}

export interface RoutineSchedule {
  id: number;
  routine_id: number;
  client_id: string;
  block_id: number;
  weekday: number;
  created_at: string;
}

export interface WorkoutSession {
  id: number;
  client_id: string;
  block_id: number | null;
  routine_id: number | null;
  weekday: number | null;
  completed_on: string;
  duration_minutes: number | null;
  notes: string | null;
  routine_blocks?: RoutineBlock;
}

export interface MotivationalPhrase {
  id: number;
  text: string;
  author: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NutritionTip {
  id: number;
  title: string;
  body: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}