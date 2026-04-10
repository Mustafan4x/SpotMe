import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the Supabase client before importing the module under test
// ---------------------------------------------------------------------------

// Chain-able query builder mock
function createQueryBuilder(resolvedValue: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'not', 'ilike',
    'order', 'limit', 'single',
    'from',
  ];
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  // The terminal call that resolves the promise (using then-able pattern)
  // Supabase client returns a PromiseLike from the chain, so we need `then`
  builder['then'] = (resolve: (v: unknown) => void) => resolve(resolvedValue);

  // Make it awaitable directly
  (builder as Record<string, unknown>)[Symbol.toStringTag] = 'Promise';

  return builder;
}

const mockAuthUser = { id: 'user-123', email: 'test@example.com' };

// We need a shared builder per test so we can inspect calls
let mockBuilder: ReturnType<typeof createQueryBuilder>;

const { mockSupabase } = vi.hoisted(() => {
  return {
    mockSupabase: {
      from: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null }),
      },
    },
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Now import the functions under test
import {
  getRoutines,
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  duplicateRoutine,
  getExercises,
  searchExercises,
  createExercise,
  addExerciseToRoutine,
  removeExerciseFromRoutine,
  reorderRoutineExercises,
  startSession,
  completeSession,
  getRecentSessions,
  logSet,
  updateSet,
  deleteSet,
  getSetsForSession,
  getLastSessionSets,
} from '@/lib/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set up mockSupabase.from to return a builder that resolves to `data`.
 * Returns the builder for call inspection.
 */
function setupFrom(data: unknown, error: null | { message: string } = null) {
  mockBuilder = createQueryBuilder({ data, error });
  mockSupabase.from.mockReturnValue(mockBuilder);
  return mockBuilder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAuthUser }, error: null });
});

// ---------------------------------------------------------------------------
// Routines CRUD
// ---------------------------------------------------------------------------

describe('Routines CRUD', () => {
  it('getRoutines returns an array of routines', async () => {
    const fakeRoutines = [
      { id: 'r1', user_id: 'user-123', name: 'Push Day', created_at: '', updated_at: '' },
    ];
    setupFrom(fakeRoutines);

    const result = await getRoutines();
    expect(result).toEqual(fakeRoutines);
    expect(mockSupabase.from).toHaveBeenCalledWith('routines');
  });

  it('getRoutine returns a single routine with exercises', async () => {
    const fakeRoutine = {
      id: 'r1',
      user_id: 'user-123',
      name: 'Push Day',
      routine_exercises: [],
    };
    setupFrom(fakeRoutine);

    const result = await getRoutine('r1');
    expect(result).toEqual(fakeRoutine);
  });

  it('createRoutine sends user_id from auth and returns the routine', async () => {
    const newRoutine = { id: 'r-new', user_id: 'user-123', name: 'Leg Day', created_at: '', updated_at: '' };
    setupFrom(newRoutine);

    const result = await createRoutine('Leg Day');
    expect(result).toEqual(newRoutine);
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockBuilder.insert).toHaveBeenCalledWith({ name: 'Leg Day', user_id: 'user-123' });
  });

  it('createRoutine throws when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    setupFrom(null);

    await expect(createRoutine('Nope')).rejects.toThrow('Not authenticated');
  });

  it('updateRoutine sends updated name', async () => {
    const updated = { id: 'r1', name: 'New Name' };
    setupFrom(updated);

    const result = await updateRoutine('r1', { name: 'New Name' });
    expect(result).toEqual(updated);
    expect(mockBuilder.update).toHaveBeenCalledWith({ name: 'New Name' });
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('deleteRoutine calls delete with correct id', async () => {
    setupFrom(null, null);
    // deleteRoutine does not use unwrap, it checks error directly
    // We need to make the builder resolve with no error
    await deleteRoutine('r1');
    expect(mockSupabase.from).toHaveBeenCalledWith('routines');
    expect(mockBuilder.delete).toHaveBeenCalled();
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'r1');
  });
});

// ---------------------------------------------------------------------------
// duplicateRoutine
// ---------------------------------------------------------------------------

describe('duplicateRoutine', () => {
  it('creates a copy with " (Copy)" suffix and copies exercises', async () => {
    const originalRoutine = {
      id: 'r-orig',
      user_id: 'user-123',
      name: 'Push Day',
      routine_exercises: [
        { id: 're-1', routine_id: 'r-orig', exercise_id: 'e1', order_index: 0, default_sets: 3, exercise: { id: 'e1', name: 'Bench Press' } },
        { id: 're-2', routine_id: 'r-orig', exercise_id: 'e2', order_index: 1, default_sets: 4, exercise: { id: 'e2', name: 'Flyes' } },
      ],
    };
    const newRoutine = { id: 'r-new', user_id: 'user-123', name: 'Push Day (Copy)' };

    // The function calls getRoutine, then createRoutine, then inserts routine_exercises
    // We need multiple from() calls to resolve differently.
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // getRoutine -> from('routines').select(...).eq(...).order(...).single()
        return createQueryBuilder({ data: originalRoutine, error: null });
      }
      if (callCount === 2) {
        // createRoutine -> from('routines').insert(...).select().single()
        return createQueryBuilder({ data: newRoutine, error: null });
      }
      // Copy routine_exercises -> from('routine_exercises').insert(...)
      return createQueryBuilder({ data: null, error: null });
    });

    const result = await duplicateRoutine('r-orig');
    expect(result).toEqual(newRoutine);
    expect(result.name).toBe('Push Day (Copy)');
  });
});

// ---------------------------------------------------------------------------
// reorderRoutineExercises
// ---------------------------------------------------------------------------

describe('reorderRoutineExercises', () => {
  it('updates each exercise with correct order_index', async () => {
    const orderedIds = ['re-c', 're-a', 're-b'];
    const builders: ReturnType<typeof createQueryBuilder>[] = [];

    mockSupabase.from.mockImplementation(() => {
      const b = createQueryBuilder({ data: null, error: null });
      builders.push(b);
      return b;
    });

    await reorderRoutineExercises('routine-1', orderedIds);

    // Should have called from('routine_exercises') for each ID
    expect(mockSupabase.from).toHaveBeenCalledTimes(3);

    // Each builder should have update called with the correct order_index
    expect(builders[0].update).toHaveBeenCalledWith({ order_index: 0 });
    expect(builders[1].update).toHaveBeenCalledWith({ order_index: 1 });
    expect(builders[2].update).toHaveBeenCalledWith({ order_index: 2 });

    // Each should filter by id and routine_id
    for (let i = 0; i < 3; i++) {
      expect(builders[i].eq).toHaveBeenCalledWith('id', orderedIds[i]);
      expect(builders[i].eq).toHaveBeenCalledWith('routine_id', 'routine-1');
    }
  });
});

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

describe('Exercises CRUD', () => {
  it('getExercises returns an array sorted by name', async () => {
    const exercises = [{ id: 'e1', name: 'Bench Press' }];
    setupFrom(exercises);

    const result = await getExercises();
    expect(result).toEqual(exercises);
    expect(mockBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('searchExercises uses ilike with query', async () => {
    setupFrom([]);

    await searchExercises('bench');
    expect(mockBuilder.ilike).toHaveBeenCalledWith('name', '%bench%');
  });

  it('createExercise sets user_id from auth and is_default false', async () => {
    const exercise = { id: 'e-new', name: 'Custom', user_id: 'user-123', is_default: false };
    setupFrom(exercise);

    const result = await createExercise('Custom', 'Chest');
    expect(result).toEqual(exercise);
    expect(mockBuilder.insert).toHaveBeenCalledWith({
      name: 'Custom',
      muscle_group: 'Chest',
      user_id: 'user-123',
      is_default: false,
    });
  });
});

// ---------------------------------------------------------------------------
// Workout Sessions
// ---------------------------------------------------------------------------

describe('Workout Sessions', () => {
  it('startSession sets user_id from auth', async () => {
    const session = { id: 'ws-1', user_id: 'user-123', routine_id: 'r1' };
    setupFrom(session);

    const result = await startSession('r1');
    expect(result).toEqual(session);
    expect(mockBuilder.insert).toHaveBeenCalledWith({
      routine_id: 'r1',
      user_id: 'user-123',
    });
  });

  it('completeSession sets completed_at', async () => {
    const session = { id: 'ws-1', completed_at: '2024-01-01T00:00:00Z' };
    setupFrom(session);

    const result = await completeSession('ws-1');
    expect(result).toEqual(session);
    expect(mockBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed_at: expect.any(String) })
    );
  });

  it('getRecentSessions filters out incomplete sessions', async () => {
    const sessions = [{ id: 'ws-1', completed_at: '2024-01-01', sets: [] }];
    setupFrom(sessions);

    await getRecentSessions(5);
    expect(mockBuilder.not).toHaveBeenCalledWith('completed_at', 'is', null);
    expect(mockBuilder.limit).toHaveBeenCalledWith(5);
  });
});

// ---------------------------------------------------------------------------
// Workout Sets
// ---------------------------------------------------------------------------

describe('Workout Sets', () => {
  it('logSet inserts with correct fields', async () => {
    const set = { id: 'ws-1', session_id: 's1', exercise_id: 'e1', set_number: 1, reps: 10, weight: 135, rir: 2 };
    setupFrom(set);

    const result = await logSet('s1', 'e1', { set_number: 1, reps: 10, weight: 135, rir: 2 });
    expect(result).toEqual(set);
    expect(mockBuilder.insert).toHaveBeenCalledWith({
      session_id: 's1',
      exercise_id: 'e1',
      set_number: 1,
      reps: 10,
      weight: 135,
      rir: 2,
    });
  });

  it('updateSet sends partial data', async () => {
    const updated = { id: 'ws-1', reps: 12 };
    setupFrom(updated);

    await updateSet('ws-1', { reps: 12 });
    expect(mockBuilder.update).toHaveBeenCalledWith({ reps: 12 });
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'ws-1');
  });

  it('deleteSet calls delete with correct id', async () => {
    setupFrom(null, null);
    await deleteSet('set-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('workout_sets');
    expect(mockBuilder.delete).toHaveBeenCalled();
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'set-1');
  });

  it('getSetsForSession orders by exercise_id then set_number', async () => {
    setupFrom([]);
    await getSetsForSession('s1');
    expect(mockBuilder.eq).toHaveBeenCalledWith('session_id', 's1');
    expect(mockBuilder.order).toHaveBeenCalledWith('exercise_id', { ascending: true });
    expect(mockBuilder.order).toHaveBeenCalledWith('set_number', { ascending: true });
  });
});

// ---------------------------------------------------------------------------
// getLastSessionSets
// ---------------------------------------------------------------------------

describe('getLastSessionSets', () => {
  it('returns sets from the most recent completed session for the routine and exercise', async () => {
    const sessionData = { id: 'prev-session' };
    const setsData = [
      { id: 'ws-1', session_id: 'prev-session', exercise_id: 'e1', set_number: 1, reps: 8, weight: 135, rir: 2 },
    ];

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Finding the latest session
        return createQueryBuilder({ data: sessionData, error: null });
      }
      // Fetching sets for that session
      return createQueryBuilder({ data: setsData, error: null });
    });

    const result = await getLastSessionSets('r1', 'e1');
    expect(result).toEqual(setsData);
  });

  it('returns empty array when there is no previous session', async () => {
    mockSupabase.from.mockImplementation(() => {
      return createQueryBuilder({ data: null, error: { message: 'not found' } });
    });

    const result = await getLastSessionSets('r1', 'e1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Auth checks (user_id filters)
// ---------------------------------------------------------------------------

describe('Auth / user_id handling', () => {
  it('createRoutine fetches auth user before inserting', async () => {
    setupFrom({ id: 'r1', name: 'Test', user_id: 'user-123' });
    await createRoutine('Test');
    expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('createExercise fetches auth user before inserting', async () => {
    setupFrom({ id: 'e1', name: 'Test', user_id: 'user-123', is_default: false });
    await createExercise('Test');
    expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('startSession fetches auth user before inserting', async () => {
    setupFrom({ id: 's1', user_id: 'user-123', routine_id: 'r1' });
    await startSession('r1');
    expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
  });
});
