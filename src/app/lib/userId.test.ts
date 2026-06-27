import { describe, expect, it } from 'vitest';

import { isValidUserId } from './userId';

describe('isValidUserId', () => {
  it('accepts valid UUIDs', () => {
    expect(isValidUserId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isValidUserId('not-a-uuid')).toBe(false);
    expect(isValidUserId('')).toBe(false);
  });
});
