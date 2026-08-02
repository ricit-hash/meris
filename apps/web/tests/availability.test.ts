import { describe, expect, it } from 'vitest';
import { deriveAvailability, formatExpiry } from '../lib/availability';

describe('availability state', () => {
  const now = Date.UTC(2026, 0, 1);

  it('prioritizes expiry, then probe failures, then missing blobs', () => {
    expect(deriveAvailability({ now, expiresAt: now, found: true })).toBe('expired');
    expect(deriveAvailability({ now, expiresAt: now + 1000, found: true, probeFailed: true })).toBe('unavailable');
    expect(deriveAvailability({ now, found: false })).toBe('missing');
    expect(deriveAvailability({ now, found: true })).toBe('available');
  });

  it('formats remaining expiry in days', () => {
    expect(formatExpiry(now + 2 * 24 * 60 * 60 * 1000, now)).toBe('Expires in 2 days');
    expect(formatExpiry(now - 1, now)).toBe('Expired');
    expect(formatExpiry(undefined, now)).toBe('No expiry recorded');
  });
});
