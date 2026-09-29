import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { Text } from 'react-native';

import { WorkoutProvider, useWorkout, type WorkoutStartInput } from '@/context/workout';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

const mockInsertSession = jest.fn();
jest.mock('@/lib/db', () => ({
  insertSession: (...args: unknown[]) => mockInsertSession(...args),
}));

// El prefijo `mock` es lo que permite que jest.mock lo vea pese al hoisting,
// asi cada test puede cambiar de usuario.
let mockSession: { user: { id: string } } | null = { user: { id: 'user-1' } };
jest.mock('@/context/session', () => ({ useSession: () => ({ session: mockSession }) }));

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

/** Input que se pasa a start(); se reemplaza por test. */
let startInput: WorkoutStartInput | undefined;

/**
 * Monta el provider con renderHook y deja asentar la hidratacion.
 * En RNTL 14 render/renderHook son async.
 */
async function mount() {
  const { result } = await renderHook(() => useWorkout(), { wrapper: WorkoutProvider });
  await act(async () => {});
  return result;
}

const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  startInput = undefined;
  mockSession = { user: { id: 'user-1' } };
  getItem.mockResolvedValue(null);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('WorkoutProvider', () => {
  it('arranca en idle con el timer en cero', async () => {
    const w = await mount();
    expect(w.current.status).toBe('idle');
    expect(w.current.elapsedMs).toBe(0);
  });

  it('arranca en running y acumula tiempo', async () => {
    const w = await mount();
    await act(async () => w.current.start());
    expect(w.current.status).toBe('running');

    await advance(5_000);
    expect(w.current.elapsedMs).toBe(5_000);
  });

  it('guarda el label, blockId y routineId al arrancar', async () => {
    startInput = { label: 'Pecho', blockId: 7, routineId: 3 };
    const w = await mount();
    await act(async () => w.current.start(startInput));

    expect(w.current.label).toBe('Pecho');
    expect(w.current.blockId).toBe(7);
    expect(w.current.routineId).toBe(3);
  });

  it('pause congela el contador', async () => {
    const w = await mount();
    await act(async () => w.current.start());
    await advance(10_000);
    await act(async () => w.current.pause());

    expect(w.current.status).toBe('paused');
    expect(w.current.elapsedMs).toBe(10_000);

    await advance(30_000);
    expect(w.current.elapsedMs).toBe(10_000);
  });

  it('resume sigue contando desde donde se pauso, sin doble conteo', async () => {
    const w = await mount();
    await act(async () => w.current.start());
    await advance(10_000);
    await act(async () => w.current.pause());
    await advance(60_000); // en pausa: no cuenta
    await act(async () => w.current.resume());
    await advance(5_000);

    expect(w.current.status).toBe('running');
    expect(w.current.elapsedMs).toBe(15_000);
  });

  it('pause es idempotente y no suma el tiempo dos veces', async () => {
    const w = await mount();
    await act(async () => w.current.start());
    await advance(10_000);
    await act(async () => w.current.pause());
    await act(async () => w.current.pause());
    await act(async () => w.current.pause());

    expect(w.current.elapsedMs).toBe(10_000);
  });

  it('resume no hace nada si el timer no estaba pausado', async () => {
    const w = await mount();
    await act(async () => w.current.start());
    await advance(5_000);
    await act(async () => w.current.resume());
    await advance(1_000);

    expect(w.current.status).toBe('running');
    expect(w.current.elapsedMs).toBe(6_000);
  });

  it('varios ciclos de pause y resume no pierden ni duplican tiempo', async () => {
    const w = await mount();
    await act(async () => w.current.start());

    for (let i = 0; i < 3; i++) {
      await advance(2_000);
      await act(async () => w.current.pause());
      await advance(10_000); // en pausa, no cuenta
      await act(async () => w.current.resume());
    }
    await advance(2_000);

    expect(w.current.elapsedMs).toBe(8_000);
  });

  it('arrancar de nuevo sobre un timer corriendo reinicia el contador', async () => {
    const w = await mount();
    await act(async () => w.current.start());
    await advance(30_000);
    await act(async () => w.current.start());
    await advance(1_000);

    expect(w.current.elapsedMs).toBe(1_000);
  });

  it('descarta el timer y vuelve a idle sin guardar nada', async () => {
    startInput = { label: 'Espalda', blockId: 1, routineId: 2 };
    const w = await mount();
    await act(async () => w.current.start(startInput));
    await advance(5_000);
    await act(async () => w.current.discard());

    expect(w.current.status).toBe('idle');
    expect(w.current.elapsedMs).toBe(0);
    expect(w.current.label).toBeNull();
    expect(mockInsertSession).not.toHaveBeenCalled();
  });

  it('useWorkout fuera del provider lanza un error explicito', async () => {
    await expect(renderHook(() => useWorkout())).rejects.toThrow(
      /debe usarse dentro de <WorkoutProvider>/
    );
  });
});

describe('persistencia', () => {
  it('no escribe en AsyncStorage antes de hidratar', async () => {
    getItem.mockReturnValue(new Promise(() => {})); // la hidratacion queda pendiente
    await mount();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('hidrata desde AsyncStorage con el tiempo ya cubierto', async () => {
    const T0 = new Date('2026-03-01T10:00:00Z').getTime();
    jest.setSystemTime(T0);
    getItem.mockResolvedValue(
      JSON.stringify({
        status: 'running',
        startedAt: T0 - 5_000,
        accumulatedMs: 0,
        blockId: 1,
        routineId: 2,
        label: 'Espalda',
      })
    );

    const w = await mount();
    expect(w.current.status).toBe('running');
    expect(w.current.elapsedMs).toBe(5_000);
    expect(w.current.label).toBe('Espalda');
  });

  it('un estado corrupto en storage no rompe la app', async () => {
    getItem.mockResolvedValue('{ esto no es json');
    const w = await mount();
    expect(w.current.status).toBe('idle');
  });

  it('ignora un payload sin el campo status', async () => {
    getItem.mockResolvedValue(JSON.stringify({ acumulado: 99 }));
    const w = await mount();
    expect(w.current.status).toBe('idle');
  });

  it('persiste el estado cuando arranca', async () => {
    const w = await mount();
    setItem.mockClear();
    await act(async () => w.current.start({ label: 'Pierna' }));

    expect(setItem).toHaveBeenCalledWith('appgym.workout.v1', expect.stringContaining('running'));
  });
});

describe('finish', () => {
  beforeEach(() => {
    mockInsertSession.mockResolvedValue(42);
  });

  it('guarda la sesion con la duracion en minutos y vuelve a idle', async () => {
    const w = await mount();
    await act(async () => w.current.start({ label: 'Pierna', blockId: 4, routineId: 5 }));
    await advance(20 * 60 * 1000);

    let id: number | null = null;
    await act(async () => {
      id = await w.current.finish();
    });

    expect(id).toBe(42);
    expect(mockInsertSession).toHaveBeenCalledTimes(1);
    expect(mockInsertSession).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'user-1',
        block_id: 4,
        routine_id: 5,
        duration_minutes: 20,
      })
    );
    expect(w.current.status).toBe('idle');
  });

  it('redondea a al menos 1 minuto aunque el entrenamiento sea de segundos', async () => {
    const w = await mount();
    await act(async () => w.current.start());
    await advance(3_000);
    await act(async () => {
      await w.current.finish();
    });

    expect(mockInsertSession.mock.calls[0][0].duration_minutes).toBe(1);
  });

  it('deja el estado en idle aunque el guardado falle', async () => {
    mockInsertSession.mockRejectedValueOnce(new Error('RLS'));
    const w = await mount();
    await act(async () => w.current.start());

    let id: number | null = null;
    await act(async () => {
      id = await w.current.finish();
    });

    expect(id).toBeNull();
    expect(w.current.status).toBe('idle');
  });

  it('no intenta guardar si no hay sesion', async () => {
    mockSession = null;
    const w = await mount();
    await act(async () => w.current.start());

    let id: number | null = null;
    await act(async () => {
      id = await w.current.finish();
    });

    expect(id).toBeNull();
    expect(mockInsertSession).not.toHaveBeenCalled();
    expect(w.current.status).toBe('idle');
  });
});

describe('integracion con la UI', () => {
  it('la pantalla refleja el estado del provider', async () => {
    function Screen() {
      const w = useWorkout();
      return <Text testID="status">{w.status}</Text>;
    }

    const r = await render(<Screen />, { wrapper: WorkoutProvider });
    expect(r.getByTestId('status')).toHaveTextContent('idle');

    // El intervalo del provider actualiza `now` cada segundo.
    await advance(1_000);
    expect(r.getByTestId('status')).toHaveTextContent('idle');
  });

  it('un control del consumer puede disparar start y pausar', async () => {
    function Screen() {
      const w = useWorkout();
      return <Text testID="toggle" onPress={() => (w.status === 'running' ? w.pause() : w.start())}>
        {w.status}
      </Text>;
    }

    const r = await render(<Screen />, { wrapper: WorkoutProvider });
    await act(async () => {});
    await fireEvent.press(r.getByTestId('toggle'));
    expect(r.getByTestId('toggle')).toHaveTextContent('running');

    await advance(2_000);
    await fireEvent.press(r.getByTestId('toggle'));
    expect(r.getByTestId('toggle')).toHaveTextContent('paused');
  });
});
