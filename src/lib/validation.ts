// ============================================================================
// SpotMe: Input Validation Functions (SEC-3)
// ============================================================================
// Pure, synchronous validation functions for all user-supplied data.
// These should be called before any Supabase insert/update operation.
//
// AUDIT DATE: 2026-04-10
//
// FINDINGS FROM DATABASE.TS AUDIT:
//
// 1. PARAMETERIZED QUERIES: All database.ts queries use the Supabase JS client
//    methods (.select, .insert, .update, .delete, .eq, .ilike, etc.). These
//    are parameterized by the PostgREST layer -- no SQL injection risk.
//    CONFIRMED: No raw SQL or string concatenation found.
//
// 2. ILIKE PATTERN INJECTION (searchExercises): The searchExercises function
//    passes user input directly into .ilike('name', `%${query}%`). While this
//    is parameterized (no SQL injection), the user could include ILIKE
//    wildcards (%, _) to craft unexpected search patterns. This is a low-risk
//    issue (it only affects their own search results due to RLS), but the
//    sanitizeForLike helper below can escape these characters if desired.
//
// 3. MISSING CLIENT-SIDE VALIDATION: database.ts does not validate inputs
//    before sending to Supabase. The database CHECK constraints (reps > 0,
//    weight >= 0, rir 0-5, etc.) will reject bad data, but with a cryptic
//    Postgres error. Client-side validation provides better UX.
//
// 4. USER ID HANDLING: createRoutine, createExercise, and startSession all
//    correctly fetch auth.uid() and set user_id from it, never from user
//    input. This prevents user_id spoofing at the application layer.
//
// All functions return { valid: boolean, error?: string }.
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_NAME_LENGTH = 200; // Matches DB CHECK constraint in 002_rls_hardening.sql
const MAX_MUSCLE_GROUP_LENGTH = 100; // Matches DB CHECK constraint
const MAX_REPS = 9999; // Practical upper bound
const MAX_WEIGHT = 99999; // In lbs, practical upper bound
const MAX_SET_NUMBER = 99; // Practical upper bound
const MIN_RIR = 0;
const MAX_RIR = 5;

// Regex to detect HTML tags including script, style, and event handlers
const HTML_TAG_REGEX = /<[^>]*>/g;

// ============================================================================
// Text Sanitization
// ============================================================================

/**
 * Strip any HTML tags from input and trim whitespace.
 * Does NOT decode HTML entities -- just removes angle-bracket tags.
 *
 * This provides defense-in-depth against stored XSS, complementing
 * React's built-in JSX escaping which handles output encoding.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input.replace(HTML_TAG_REGEX, '').trim();
}

/**
 * Escape ILIKE wildcard characters (% and _) in a search query.
 * Use when passing user input to Supabase .ilike() to prevent
 * wildcard injection.
 */
export function sanitizeForLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// ============================================================================
// Name Validation (Exercises, Routines)
// ============================================================================

/**
 * Validate an exercise name.
 * - Required (non-empty after trimming)
 * - Max 200 characters (matches DB constraint)
 * - No HTML tags (defense-in-depth)
 */
export function validateExerciseName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Exercise name is required' };
  }

  const sanitized = sanitizeText(name);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Exercise name cannot be only HTML tags or whitespace' };
  }

  if (sanitized !== name.trim()) {
    return { valid: false, error: 'Exercise name contains invalid characters' };
  }

  if (sanitized.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Exercise name must be ${MAX_NAME_LENGTH} characters or less`,
    };
  }

  return { valid: true };
}

/**
 * Validate a routine name.
 * Same rules as exercise name.
 */
export function validateRoutineName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Routine name is required' };
  }

  const sanitized = sanitizeText(name);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Routine name cannot be only HTML tags or whitespace' };
  }

  if (sanitized !== name.trim()) {
    return { valid: false, error: 'Routine name contains invalid characters' };
  }

  if (sanitized.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Routine name must be ${MAX_NAME_LENGTH} characters or less`,
    };
  }

  return { valid: true };
}

/**
 * Validate a muscle group name (optional field).
 * If provided, same rules as names but with shorter max length.
 */
export function validateMuscleGroup(muscleGroup: string | undefined | null): ValidationResult {
  if (!muscleGroup || !muscleGroup.trim()) {
    return { valid: true }; // Optional field
  }

  const sanitized = sanitizeText(muscleGroup);

  if (sanitized !== muscleGroup.trim()) {
    return { valid: false, error: 'Muscle group contains invalid characters' };
  }

  if (sanitized.length > MAX_MUSCLE_GROUP_LENGTH) {
    return {
      valid: false,
      error: `Muscle group must be ${MAX_MUSCLE_GROUP_LENGTH} characters or less`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Set Data Validation
// ============================================================================

/**
 * Validate workout set data (reps, weight, rir).
 * All values must be numbers within acceptable ranges.
 * Matches the CHECK constraints in 001_initial_schema.sql.
 */
export function validateSetData(
  reps: unknown,
  weight: unknown,
  rir: unknown
): ValidationResult {
  // Reps validation
  const repsNum = Number(reps);
  if (!Number.isFinite(repsNum) || !Number.isInteger(repsNum)) {
    return { valid: false, error: 'Reps must be a whole number' };
  }
  if (repsNum < 1) {
    return { valid: false, error: 'Reps must be at least 1' };
  }
  if (repsNum > MAX_REPS) {
    return { valid: false, error: `Reps cannot exceed ${MAX_REPS}` };
  }

  // Weight validation
  const weightNum = Number(weight);
  if (!Number.isFinite(weightNum)) {
    return { valid: false, error: 'Weight must be a number' };
  }
  if (weightNum < 0) {
    return { valid: false, error: 'Weight cannot be negative' };
  }
  if (weightNum > MAX_WEIGHT) {
    return { valid: false, error: `Weight cannot exceed ${MAX_WEIGHT} lbs` };
  }

  // RIR validation
  const rirNum = Number(rir);
  if (!Number.isFinite(rirNum) || !Number.isInteger(rirNum)) {
    return { valid: false, error: 'RIR must be a whole number' };
  }
  if (rirNum < MIN_RIR || rirNum > MAX_RIR) {
    return {
      valid: false,
      error: `RIR must be between ${MIN_RIR} and ${MAX_RIR}`,
    };
  }

  return { valid: true };
}

/**
 * Validate a set number.
 */
export function validateSetNumber(setNumber: unknown): ValidationResult {
  const num = Number(setNumber);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'Set number must be a whole number' };
  }
  if (num < 1) {
    return { valid: false, error: 'Set number must be at least 1' };
  }
  if (num > MAX_SET_NUMBER) {
    return { valid: false, error: `Set number cannot exceed ${MAX_SET_NUMBER}` };
  }
  return { valid: true };
}

// ============================================================================
// Email and Password Validation
// ============================================================================

/**
 * Validate email format.
 * Uses a practical regex covering standard email formats.
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

/**
 * Validate password meets minimum requirements.
 * Minimum 8 characters.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters',
    };
  }

  return { valid: true };
}

// ============================================================================
// UUID Validation
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUID v4 format.
 * Use when accepting IDs from URL params or user input.
 */
export function validateUUID(id: string): ValidationResult {
  if (!id) {
    return { valid: false, error: 'ID is required' };
  }

  if (!UUID_REGEX.test(id)) {
    return { valid: false, error: 'Invalid ID format' };
  }

  return { valid: true };
}
