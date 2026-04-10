// ============================================================================
// SpotMe: Offline Storage Layer
// ============================================================================
// IndexedDB-backed offline storage using the `idb` library.
// Stores workout sessions and sets locally so users can log workouts
// without internet. Data is synced to Supabase when connectivity returns.
// ============================================================================

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkoutSession, WorkoutSet } from './types';

// ============================================================================
// Database Schema
// ============================================================================

type SyncStatus = 'pending' | 'synced' | 'error';

export interface OfflineWorkoutSession extends WorkoutSession {
  sync_status: SyncStatus;
  sync_error?: string;
}

export interface OfflineWorkoutSet extends WorkoutSet {
  sync_status: SyncStatus;
  sync_error?: string;
}

interface SpotMeOfflineDB extends DBSchema {
  sessions: {
    key: string;
    value: OfflineWorkoutSession;
    indexes: {
      'by-sync-status': SyncStatus;
      'by-user': string;
    };
  };
  sets: {
    key: string;
    value: OfflineWorkoutSet;
    indexes: {
      'by-sync-status': SyncStatus;
      'by-session': string;
    };
  };
}

// ============================================================================
// Database Initialization
// ============================================================================

const DB_NAME = 'spotme-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SpotMeOfflineDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SpotMeOfflineDB>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<SpotMeOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Version 0 -> 1: initial schema
      if (oldVersion < 1) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-sync-status', 'sync_status');
        sessionStore.createIndex('by-user', 'user_id');

        const setStore = db.createObjectStore('sets', { keyPath: 'id' });
        setStore.createIndex('by-sync-status', 'sync_status');
        setStore.createIndex('by-session', 'session_id');
      }
    },
    blocked() {
      console.warn('[Offline] Database upgrade blocked — close other tabs');
    },
    blocking() {
      console.warn('[Offline] This tab is blocking a database upgrade');
    },
    terminated() {
      console.error('[Offline] Database connection terminated unexpectedly');
      dbPromise = null;
    },
  });

  return dbPromise;
}

/**
 * Close the database connection and reset the cached promise.
 * Used in tests to allow a fresh database per test run.
 */
export async function _resetDBForTesting(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

// ============================================================================
// Save Operations
// ============================================================================

/**
 * Store a workout set locally with a pending sync status.
 */
export async function saveOfflineSet(set: WorkoutSet): Promise<void> {
  const db = await getDB();
  const offlineSet: OfflineWorkoutSet = {
    ...set,
    sync_status: 'pending',
  };
  await db.put('sets', offlineSet);
}

/**
 * Store a workout session locally with a pending sync status.
 */
export async function saveOfflineSession(session: WorkoutSession): Promise<void> {
  const db = await getDB();
  const offlineSession: OfflineWorkoutSession = {
    ...session,
    sync_status: 'pending',
  };
  await db.put('sessions', offlineSession);
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all entries (sessions and sets) that have not been synced yet.
 */
export async function getOfflineQueue(): Promise<{
  sessions: OfflineWorkoutSession[];
  sets: OfflineWorkoutSet[];
}> {
  const db = await getDB();
  const [pendingSessions, errorSessions, pendingSets, errorSets] = await Promise.all([
    db.getAllFromIndex('sessions', 'by-sync-status', 'pending'),
    db.getAllFromIndex('sessions', 'by-sync-status', 'error'),
    db.getAllFromIndex('sets', 'by-sync-status', 'pending'),
    db.getAllFromIndex('sets', 'by-sync-status', 'error'),
  ]);

  return {
    sessions: [...pendingSessions, ...errorSessions],
    sets: [...pendingSets, ...errorSets],
  };
}

/**
 * Get all locally stored sessions (for display while offline).
 */
export async function getOfflineSessions(): Promise<OfflineWorkoutSession[]> {
  const db = await getDB();
  return db.getAll('sessions');
}

/**
 * Get all sets for a specific offline session.
 */
export async function getOfflineSets(sessionId: string): Promise<OfflineWorkoutSet[]> {
  const db = await getDB();
  return db.getAllFromIndex('sets', 'by-session', sessionId);
}

// ============================================================================
// Sync Operations
// ============================================================================

export interface SyncResult {
  syncedSessions: number;
  syncedSets: number;
  failedSessions: number;
  failedSets: number;
}

/**
 * Push all offline entries to Supabase, mark as synced on success,
 * keep failed entries with error status for retry.
 */
export async function syncOfflineData(
  supabaseClient: SupabaseClient
): Promise<SyncResult> {
  const db = await getDB();
  const queue = await getOfflineQueue();

  const result: SyncResult = {
    syncedSessions: 0,
    syncedSets: 0,
    failedSessions: 0,
    failedSets: 0,
  };

  // Sync sessions first (sets depend on sessions existing in the DB)
  for (const session of queue.sessions) {
    try {
      const { sync_status, sync_error, ...sessionData } = session;
      const { error } = await supabaseClient
        .from('workout_sessions')
        .upsert(sessionData, { onConflict: 'id' });

      if (error) throw error;

      const synced: OfflineWorkoutSession = {
        ...session,
        sync_status: 'synced',
        sync_error: undefined,
      };
      await db.put('sessions', synced);
      result.syncedSessions++;
    } catch (err: any) {
      const errorMessage = err?.message ?? (err instanceof Error ? err.message : 'Unknown error');
      const failed: OfflineWorkoutSession = {
        ...session,
        sync_status: 'error',
        sync_error: errorMessage,
      };
      await db.put('sessions', failed);
      result.failedSessions++;
    }
  }

  // Sync sets
  for (const set of queue.sets) {
    try {
      const { sync_status, sync_error, ...setData } = set;
      const { error } = await supabaseClient
        .from('workout_sets')
        .upsert(setData, { onConflict: 'id' });

      if (error) throw error;

      const synced: OfflineWorkoutSet = {
        ...set,
        sync_status: 'synced',
        sync_error: undefined,
      };
      await db.put('sets', synced);
      result.syncedSets++;
    } catch (err: any) {
      const errorMessage = err?.message ?? (err instanceof Error ? err.message : 'Unknown error');
      const failed: OfflineWorkoutSet = {
        ...set,
        sync_status: 'error',
        sync_error: errorMessage,
      };
      await db.put('sets', failed);
      result.failedSets++;
    }
  }

  return result;
}

/**
 * Remove all entries that have been successfully synced.
 */
export async function clearSyncedEntries(): Promise<void> {
  const db = await getDB();

  const [syncedSessions, syncedSets] = await Promise.all([
    db.getAllFromIndex('sessions', 'by-sync-status', 'synced'),
    db.getAllFromIndex('sets', 'by-sync-status', 'synced'),
  ]);

  const tx = db.transaction(['sessions', 'sets'], 'readwrite');

  const deleteOps: Promise<void>[] = [];
  for (const session of syncedSessions) {
    deleteOps.push(tx.objectStore('sessions').delete(session.id));
  }
  for (const set of syncedSets) {
    deleteOps.push(tx.objectStore('sets').delete(set.id));
  }

  await Promise.all([...deleteOps, tx.done]);
}
