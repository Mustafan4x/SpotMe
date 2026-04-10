import { describe, it, expect } from 'vitest';
import {
  validateExerciseName,
  validateRoutineName,
  validateMuscleGroup,
  validateSetData,
  validateSetNumber,
  validateEmail,
  validatePassword,
  validateUUID,
  sanitizeText,
  sanitizeForLike,
} from '@/lib/validation';

// ---------------------------------------------------------------------------
// sanitizeText
// ---------------------------------------------------------------------------

describe('sanitizeText', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('strips HTML tags', () => {
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('strips nested HTML tags', () => {
    expect(sanitizeText('<div><p>text</p></div>')).toBe('text');
  });

  it('handles self-closing tags', () => {
    expect(sanitizeText('before<br/>after')).toBe('beforeafter');
  });

  it('strips tags with attributes', () => {
    expect(sanitizeText('<a href="evil.com">click</a>')).toBe('click');
    expect(sanitizeText('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('leaves plain text untouched', () => {
    expect(sanitizeText('Bench Press 5x5')).toBe('Bench Press 5x5');
  });

  it('returns empty string for null/undefined-ish input', () => {
    expect(sanitizeText('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// sanitizeForLike
// ---------------------------------------------------------------------------

describe('sanitizeForLike', () => {
  it('escapes % characters', () => {
    expect(sanitizeForLike('100%')).toBe('100\\%');
  });

  it('escapes _ characters', () => {
    expect(sanitizeForLike('bench_press')).toBe('bench\\_press');
  });

  it('escapes backslash characters', () => {
    expect(sanitizeForLike('a\\b')).toBe('a\\\\b');
  });

  it('leaves normal text unchanged', () => {
    expect(sanitizeForLike('Bench Press')).toBe('Bench Press');
  });
});

// ---------------------------------------------------------------------------
// validateExerciseName
// ---------------------------------------------------------------------------

describe('validateExerciseName', () => {
  it('accepts a valid exercise name', () => {
    expect(validateExerciseName('Bench Press')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validateExerciseName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects whitespace-only string', () => {
    const result = validateExerciseName('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects names that are only HTML tags', () => {
    const result = validateExerciseName('<script></script>');
    expect(result.valid).toBe(false);
  });

  it('rejects names containing HTML tags', () => {
    const result = validateExerciseName('<b>Bench</b> Press');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it('rejects names exceeding 200 characters', () => {
    const longName = 'A'.repeat(201);
    const result = validateExerciseName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('200');
  });

  it('accepts names exactly at the 200-character limit', () => {
    const maxName = 'A'.repeat(200);
    expect(validateExerciseName(maxName)).toEqual({ valid: true });
  });

  it('accepts names with numbers and special characters', () => {
    expect(validateExerciseName('Dumbbell Curl (3-sec negative)')).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// validateRoutineName
// ---------------------------------------------------------------------------

describe('validateRoutineName', () => {
  it('accepts a valid routine name', () => {
    expect(validateRoutineName('Push Day')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    expect(validateRoutineName('').valid).toBe(false);
  });

  it('rejects whitespace-only', () => {
    expect(validateRoutineName('   ').valid).toBe(false);
  });

  it('rejects HTML injection', () => {
    const result = validateRoutineName('<img src=x onerror=alert(1)>');
    expect(result.valid).toBe(false);
  });

  it('rejects names exceeding 200 characters', () => {
    const result = validateRoutineName('B'.repeat(201));
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateMuscleGroup
// ---------------------------------------------------------------------------

describe('validateMuscleGroup', () => {
  it('accepts valid muscle group', () => {
    expect(validateMuscleGroup('Chest')).toEqual({ valid: true });
  });

  it('accepts empty/null/undefined (optional field)', () => {
    expect(validateMuscleGroup('').valid).toBe(true);
    expect(validateMuscleGroup(null).valid).toBe(true);
    expect(validateMuscleGroup(undefined).valid).toBe(true);
  });

  it('rejects HTML in muscle group', () => {
    expect(validateMuscleGroup('<b>Chest</b>').valid).toBe(false);
  });

  it('rejects muscle group exceeding 100 characters', () => {
    expect(validateMuscleGroup('X'.repeat(101)).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateSetData
// ---------------------------------------------------------------------------

describe('validateSetData', () => {
  it('accepts valid set data', () => {
    expect(validateSetData(10, 135, 2)).toEqual({ valid: true });
  });

  it('accepts bodyweight (0 weight)', () => {
    expect(validateSetData(10, 0, 2)).toEqual({ valid: true });
  });

  it('rejects negative reps', () => {
    const result = validateSetData(-1, 135, 2);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Reps');
  });

  it('rejects zero reps', () => {
    expect(validateSetData(0, 135, 2).valid).toBe(false);
  });

  it('rejects negative weight', () => {
    const result = validateSetData(10, -50, 2);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Weight');
  });

  it('rejects RIR below 0', () => {
    const result = validateSetData(10, 135, -1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('RIR');
  });

  it('rejects RIR above 5', () => {
    const result = validateSetData(10, 135, 6);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('RIR');
  });

  it('accepts RIR at boundary values (0 and 5)', () => {
    expect(validateSetData(1, 0, 0)).toEqual({ valid: true });
    expect(validateSetData(1, 0, 5)).toEqual({ valid: true });
  });

  it('rejects non-integer reps', () => {
    expect(validateSetData(10.5, 135, 2).valid).toBe(false);
  });

  it('rejects non-numeric values', () => {
    expect(validateSetData('abc', 135, 2).valid).toBe(false);
    expect(validateSetData(10, 'abc', 2).valid).toBe(false);
    expect(validateSetData(10, 135, 'abc').valid).toBe(false);
  });

  it('rejects reps exceeding 9999', () => {
    expect(validateSetData(10000, 100, 2).valid).toBe(false);
  });

  it('rejects weight exceeding 99999', () => {
    expect(validateSetData(10, 100000, 2).valid).toBe(false);
  });

  it('handles string numbers (form inputs)', () => {
    expect(validateSetData('10', '135', '2')).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// validateSetNumber
// ---------------------------------------------------------------------------

describe('validateSetNumber', () => {
  it('accepts valid set numbers', () => {
    expect(validateSetNumber(1)).toEqual({ valid: true });
    expect(validateSetNumber(10)).toEqual({ valid: true });
  });

  it('rejects zero', () => {
    expect(validateSetNumber(0).valid).toBe(false);
  });

  it('rejects negative numbers', () => {
    expect(validateSetNumber(-1).valid).toBe(false);
  });

  it('rejects numbers exceeding 99', () => {
    expect(validateSetNumber(100).valid).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(validateSetNumber(1.5).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------

describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
    expect(validateEmail('first.last@domain.co')).toEqual({ valid: true });
    expect(validateEmail('user+tag@example.com')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    expect(validateEmail('').valid).toBe(false);
  });

  it('rejects missing @ symbol', () => {
    expect(validateEmail('userexample.com').valid).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('rejects missing TLD', () => {
    expect(validateEmail('user@domain').valid).toBe(false);
  });

  it('rejects email with spaces', () => {
    expect(validateEmail('user @example.com').valid).toBe(false);
  });

  it('rejects emails exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@b.co';
    expect(validateEmail(longEmail).valid).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(validateEmail(' user@example.com ').valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validatePassword
// ---------------------------------------------------------------------------

describe('validatePassword', () => {
  it('accepts passwords of 8+ characters', () => {
    expect(validatePassword('12345678')).toEqual({ valid: true });
    expect(validatePassword('a very long password indeed')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('1234567');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });

  it('accepts exactly 8 characters', () => {
    expect(validatePassword('abcdefgh')).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// validateUUID
// ---------------------------------------------------------------------------

describe('validateUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    expect(validateUUID('').valid).toBe(false);
  });

  it('rejects non-UUID strings', () => {
    expect(validateUUID('not-a-uuid').valid).toBe(false);
    expect(validateUUID('12345').valid).toBe(false);
  });

  it('rejects UUIDs with wrong format', () => {
    expect(validateUUID('550e8400e29b41d4a716446655440000').valid).toBe(false); // no dashes
  });

  it('accepts uppercase UUIDs', () => {
    expect(validateUUID('550E8400-E29B-41D4-A716-446655440000')).toEqual({ valid: true });
  });
});
