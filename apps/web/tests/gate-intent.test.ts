import { describe, expect, it } from 'vitest';
import { gateCopy, parseGateIntent, safeGateNext } from '../lib/gate-intent';

describe('gate intent', () => {
  it('uses contextual copy for buyer and publisher flows', () => {
    expect(gateCopy(parseGateIntent('purchase')).title).toBe('Connect to buy.');
    expect(gateCopy(parseGateIntent('publish')).title).toBe('Connect to publish.');
    expect(gateCopy(parseGateIntent(null)).title).toBe('Connect to continue.');
  });

  it('only allows safe internal next paths', () => {
    expect(safeGateNext('/catalog/m-123')).toBe('/catalog/m-123');
    expect(safeGateNext('https://evil.example')).toBe('/profile');
    expect(safeGateNext('//evil.example')).toBe('/profile');
    expect(safeGateNext('/\\evil')).toBe('/profile');
  });
});
