import { describe, expect, it } from 'vitest';

import { formatDate } from '~/utils/format';

describe('formatDate', () => {
  it('renders a date as DD/MM/YYYY with zero padding', () => {
    expect(formatDate('2026-07-16T10:30:00Z')).toBe('16/07/2026');
    expect(formatDate('2024-01-05T00:00:00Z')).toBe('05/01/2024');
  });

  it('accepts a date-only string', () => {
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });

  // A table renders whatever the API sends. Missing and malformed values must show
  // an empty cell, never the string "Invalid Date".
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['unparseable text', 'garbage'],
  ])('renders an empty cell for %s', (_label, value) => {
    expect(formatDate(value)).toBe('');
  });

  it('treats the epoch as a real date rather than a missing one', () => {
    // 0 is falsy, so a naive `if (!value)` guard would blank it out.
    expect(formatDate(0)).toBe('01/01/1970');
  });
});
