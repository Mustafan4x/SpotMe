import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

import type { WorkoutSession, WorkoutSet } from '@/lib/types';
import {
  saveOfflineSet,
  saveOfflineSession,
  getOfflineQueue,
  getOfflineSessions,
  getOfflineSets,
  syncOfflineData,
  clearSyncedEntries,
  _resetDBForTesting,
} from '@/lib/offline';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    user_id: 'user-1',
    routine_id: 'routine-1',
    started_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set-1',
    session_id: 'session-1',
    exercise_id: 'exercise-1',
    set_number: 1,
    reps: 10,
    weight: 135,
    rir: 2,
    logged_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  // Close the existing connection and reset the singleton
  await _resetDBForTesting();

  // Delete the database so each test starts clean
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('spotme-offline');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

// ---------------------------------------------------------------------------
// saveOfflineSet & saveOfflineSession
// ---------------------------------------------------------------------------

describe('Saving offline data', () => {
  it('saves a workout set to IndexedDB with pending status', async () => {
    const set = makeSet();
    await saveOfflineSet(set);

    const queue = await getOfflineQueue();
    expect(queue.sets).toHaveLength(1);
    expect(queue.sets[0]).toMatchObject({
      id: 'set-1',
      sync_status: 'pending',
    });
  });

  it('saves a workout session to IndexedDB with pending status', async () => {
    const session = makeSession();
    await saveOfflineSession(session);

    const queue = await getOfflineQueue();
    expect(queue.sessions).toHaveLength(1);
    expect(queue.sessions[0]).toMatchObject({
      id: 'session-1',
      sync_status: 'pending',
    });
  });

  it('saves multiple sets and sessions', async () => {
    await saveOfflineSession(makeSession({ id: 's1' }));
    await saveOfflineSession(makeSession({ id: 's2' }));
    await saveOfflineSet(makeSet({ id: 'set-1' }));
    await saveOfflineSet(makeSet({ id: 'set-2' }));
    await saveOfflineSet(makeSet({ id: 'set-3' }));

    const queue = await getOfflineQueue();
    expect(queue.sessions).toHaveLength(2);
    expect(queue.sets).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// getOfflineQueue
// ---------------------------------------------------------------------------

describe('getOfflineQueue', () => {
  it('returns only pending and error items (not synced)', async () => {
    await saveOfflineSet(makeSet({ id: 'set-pending' }));
    await saveOfflineSet(makeSet({ id: 'set-synced' }));

    const queue = await getOfflineQueue();
    expect(queue.sets).toHaveLength(2);
    expect(queue.sets.every((s) => s.sync_status === 'pending')).toBe(true);
  });

  it('returns empty queues when nothing is stored', async () => {
    const queue = await getOfflineQueue();
    expect(queue.sessions).toEqual([]);
    expect(queue.sets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getOfflineSessions & getOfflineSets
// ---------------------------------------------------------------------------

describe('Reading offline data', () => {
  it('getOfflineSessions returns all stored sessions', async () => {
    await saveOfflineSession(makeSession({ id: 's1' }));
    await saveOfflineSession(makeSession({ id: 's2' }));

    const sessions = await getOfflineSessions();
    expect(sessions).toHaveLength(2);
  });

  it('getOfflineSets returns sets for a specific session', async () => {
    await saveOfflineSet(makeSet({ id: 'set-1', session_id: 'session-A' }));
    await saveOfflineSet(makeSet({ id: 'set-2', session_id: 'session-A' }));
    await saveOfflineSet(makeSet({ id: 'set-3', session_id: 'session-B' }));

    const setsA = await getOfflineSets('session-A');
    expect(setsA).toHaveLength(2);

    const setsB = await getOfflineSets('session-B');
    expect(setsB).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// syncOfflineData
// ---------------------------------------------------------------------------

describe('syncOfflineData', () => {
  it('pushes all pending entries and marks them as synced', async () => {
    await saveOfflineSession(makeSession({ id: 's1' }));
    await saveOfflineSet(makeSet({ id: 'set-1', session_id: 's1' }));

    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as unknown as Parameters<typeof syncOfflineData>[0];

    const result = await syncOfflineData(mockClient);

    expect(result.syncedSessions).toBe(1);
    expect(result.syncedSets).toBe(1);
    expect(result.failedSessions).toBe(0);
    expect(result.failedSets).toBe(0);

    const queue = await getOfflineQueue();
    expect(queue.sessions).toHaveLength(0);
    expect(queue.sets).toHaveLength(0);
  });

  it('retains entries that fail to sync with error status', async () => {
    await saveOfflineSession(makeSession({ id: 's-fail' }));
    await saveOfflineSet(makeSet({ id: 'set-fail', session_id: 's-fail' }));

    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Network error' } }),
      }),
    } as unknown as Parameters<typeof syncOfflineData>[0];

    const result = await syncOfflineData(mockClient);

    expect(result.failedSessions).toBe(1);
    expect(result.failedSets).toBe(1);

    const queue = await getOfflineQueue();
    expect(queue.sessions).toHaveLength(1);
    expect(queue.sessions[0].sync_status).toBe('error');
    expect(queue.sessions[0].sync_error).toBe('Network error');
    expect(queue.sets).toHaveLength(1);
    expect(queue.sets[0].sync_status).toBe('error');
  });

  it('handles partial sync failure (some succeed, some fail)', async () => {
    await saveOfflineSession(makeSession({ id: 's1' }));
    await saveOfflineSession(makeSession({ id: 's2' }));

    let callCount = 0;
    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve({ error: null });
          return Promise.resolve({ error: { message: 'Server error' } });
        }),
      }),
    } as unknown as Parameters<typeof syncOfflineData>[0];

    const result = await syncOfflineData(mockClient);

    expect(result.syncedSessions).toBe(1);
    expect(result.failedSessions).toBe(1);

    const queue = await getOfflineQueue();
    expect(queue.sessions).toHaveLength(1);
    expect(queue.sessions[0].id).toBe('s2');
    expect(queue.sessions[0].sync_status).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// clearSyncedEntries
// ---------------------------------------------------------------------------

describe('clearSyncedEntries', () => {
  it('removes synced entries but keeps pending and error entries', async () => {
    await saveOfflineSession(makeSession({ id: 's-synced' }));
    await saveOfflineSession(makeSession({ id: 's-pending' }));

    let callCount = 0;
    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve({ error: null });
          return Promise.resolve({ error: { message: 'fail' } });
        }),
      }),
    } as unknown as Parameters<typeof syncOfflineData>[0];

    await syncOfflineData(mockClient);
    await clearSyncedEntries();

    const all = await getOfflineSessions();
    expect(all).toHaveLength(1);
    // The remaining session should have error status (the one that failed to sync)
    expect(all[0].sync_status).toBe('error');
  });
});
