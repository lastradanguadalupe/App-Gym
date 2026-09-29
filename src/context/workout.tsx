import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useSession } from '@/context/session';
import { insertSession } from '@/lib/db';
import { weekdayOf } from '@/lib/format';

const STORAGE_KEY = 'appgym.workout.v1';

type WorkoutStatus = 'idle' | 'running' | 'paused';

export interface WorkoutStartInput {
  blockId?: number | null;
  routineId?: number | null;
  label?: string | null;
}

type Persisted = {
  status: WorkoutStatus;
  startedAt: number | null;
  accumulatedMs: number;
  blockId: number | null;
  routineId: number | null;
  label: string | null;
};

const IDLE: Persisted = {
  status: 'idle',
  startedAt: null,
  accumulatedMs: 0,
  blockId: null,
  routineId: null,
  label: null,
};

type WorkoutContextValue = {
  status: WorkoutStatus;
  elapsedMs: number;
  label: string | null;
  blockId: number | null;
  routineId: number | null;
  start: (input?: WorkoutStartInput) => void;
  pause: () => void;
  resume: () => void;
  finish: () => Promise<number | null>;
  discard: () => Promise<void>;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [state, setState] = useState<Persisted>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const hydrated = useRef(false);

  const elapsedMs = useMemo(() => {
    if (state.status === 'running' && state.startedAt != null) {
      return state.accumulatedMs + (now - state.startedAt);
    }
    return state.accumulatedMs;
  }, [state, now]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Persisted;
        if (parsed && typeof parsed === 'object' && 'status' in parsed) {
          setState(parsed);
        }
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true;
      });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  useEffect(() => {
    if (state.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state.status]);

  const finish = async (): Promise<number | null> => {
    const minutes = Math.max(1, Math.round(elapsedMs / 60000));
    const blockId = state.blockId;
    const routineId = state.routineId;
    setState(IDLE);
    if (!session) return null;
    try {
      const id = await insertSession({
        client_id: session.user.id,
        block_id: blockId,
        routine_id: routineId,
        weekday: weekdayOf(new Date()),
        duration_minutes: minutes,
      });
      console.log('[workout] sesión guardada', id);
      return id;
    } catch (e) {
      console.warn('No se pudo guardar la sesión', e);
      return null;
    }
  };

  const value = useMemo<WorkoutContextValue>(
    () => ({
      status: state.status,
      elapsedMs,
      label: state.label,
      blockId: state.blockId,
      routineId: state.routineId,
      start: (input) => {
        console.log('[workout] start', input);
        setState({
          status: 'running',
          startedAt: Date.now(),
          accumulatedMs: 0,
          blockId: input?.blockId ?? null,
          routineId: input?.routineId ?? null,
          label: input?.label ?? null,
        });
      },
      pause: () =>
        setState((s) =>
          s.status === 'running' && s.startedAt != null
            ? {
                ...s,
                status: 'paused',
                accumulatedMs: s.accumulatedMs + (Date.now() - s.startedAt),
                startedAt: null,
              }
            : s
        ),
      resume: () =>
        setState((s) => (s.status === 'paused' ? { ...s, status: 'running', startedAt: Date.now() } : s)),
      finish,
      discard: async () => {
        setState(IDLE);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, elapsedMs, session]
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout debe usarse dentro de <WorkoutProvider>');
  return ctx;
}