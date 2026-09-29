export type Role = 'cliente' | 'profe';
export type Region = 'superior' | 'inferior' | 'core' | 'full';
export type Experiencia = 'inicio' | 'intermedio' | 'avanzado';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
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

export interface RoutineBlockExercise {
  id: number;
  block_id: number;
  exercise_id: number;
  sets: number;
  reps: string;
  rest_seconds: number;
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