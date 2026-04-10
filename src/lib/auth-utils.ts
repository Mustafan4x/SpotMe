// ============================================================================
// SpotMe: Authentication Utility Functions (SEC-2)
// ============================================================================
// Supplementary auth helpers for password validation, session checks, and
// secure sign-out. These do NOT modify useAuth.ts or supabase.ts.
//
// AUDIT DATE: 2026-04-10
//
// FINDINGS FROM AUTH AUDIT:
//
// 1. JWT STORAGE: Supabase JS client stores tokens in localStorage by default.
//    This is acceptable for this app's threat model (small user base, low-value
//    data). For higher-security apps, cookie-based storage via @supabase/ssr
//    would be preferred to mitigate XSS-based token theft.
//
// 2. SIGN-OUT: useAuth.ts calls supabase.auth.signOut() which clears the
//    session from localStorage and revokes the refresh token server-side.
//    This is correct. The onAuthStateChange listener then sets user to null.
//
// 3. UNAUTHENTICATED ACCESS: All RLS policies require auth.uid() to be
//    non-null (after our hardening in 002_rls_hardening.sql). The Supabase
//    client will return empty results for unauthenticated queries. The
//    database.ts functions that do writes (createRoutine, startSession, etc.)
//    check for user before inserting, which is correct.
//
// 4. PASSWORD VALIDATION: Supabase Auth enforces a minimum password length
//    on the server side (default 6 chars). We recommend setting this to 8+
//    in Supabase Dashboard > Auth > Policies. The client-side validation
//    below provides immediate feedback before the server round-trip.
//
// 5. SESSION REFRESH: The Supabase JS client automatically refreshes the
//    access token before expiry. No additional logic is needed.
//
// RECOMMENDATIONS (not implemented here, require config changes):
// - Set minimum password length to 8 in Supabase Dashboard
// - Consider enabling "Confirm email" in Supabase Auth settings
// - Consider rate limiting on auth endpoints (Supabase provides this by default)
// ============================================================================

import type { SupabaseClient, User } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Password Validation
// ============================================================================

const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate a password meets minimum security requirements.
 * - At least 8 characters
 *
 * This is client-side validation for immediate user feedback.
 * Supabase Auth also enforces server-side rules.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Validate email format.
 * Uses a practical regex that covers standard email formats.
 * Not RFC 5322 compliant (intentionally simpler).
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  // Practical email regex: local@domain.tld
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

// ============================================================================
// Session Checks
// ============================================================================

/**
 * Check if the current Supabase session is valid and return the user.
 * Returns null if not authenticated or session is expired.
 *
 * Prefer this over checking localStorage directly, as it validates
 * the token with Supabase and refreshes if needed.
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient
): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Check if a valid session exists without fetching the full user.
 * Faster than getAuthenticatedUser for simple auth guards.
 */
export async function isAuthenticated(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    return !error && session !== null;
  } catch {
    return false;
  }
}

/**
 * Securely sign out: clears session from Supabase and ensures local
 * storage is clean. Call this instead of supabase.auth.signOut() directly
 * if you need additional cleanup (e.g., clearing IndexedDB offline cache).
 */
export async function secureSignOut(
  supabase: SupabaseClient,
  options?: { clearOfflineData?: boolean }
): Promise<void> {
  // Sign out from Supabase (clears localStorage tokens, revokes refresh token)
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Log but don't throw -- we still want to clear local state
    console.error('Sign-out error:', error.message);
  }

  // If requested, clear offline data from IndexedDB
  // This prevents stale workout data from persisting after sign-out
  if (options?.clearOfflineData) {
    try {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name && db.name.startsWith('spotme')) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    } catch {
      // indexedDB.databases() may not be supported in all browsers
      // Fail silently -- this is a best-effort cleanup
    }
  }
}

// ============================================================================
// Auth Guard Helper
// ============================================================================

/**
 * Require authentication or throw. Use in database functions that need
 * a guaranteed user ID.
 *
 * Example:
 *   const userId = await requireAuth(supabase);
 *   // userId is guaranteed non-null here
 */
export async function requireAuth(supabase: SupabaseClient): Promise<string> {
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user.id;
}
