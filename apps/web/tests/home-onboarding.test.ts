import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeHomeOnboarding, hasCompletedHomeOnboarding } from '../lib/home-onboarding';

const memory = new Map<string, string>();
const localStorageStub = {
  getItem: (name: string) => memory.get(name) ?? null,
  setItem: (name: string, value: string) => { memory.set(name, value); },
  removeItem: (name: string) => { memory.delete(name); },
  clear: () => { memory.clear(); },
};

vi.stubGlobal('window', { localStorage: localStorageStub });
vi.stubGlobal('localStorage', localStorageStub);
vi.stubGlobal('Storage', function Storage() {});

const key = (address: string) => `meris:onboarding:home:${address.toLowerCase()}`;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('home onboarding persistence', () => {
  it('treats a missing record as incomplete', () => {
    expect(hasCompletedHomeOnboarding('0xABC')).toBe(false);
  });

  it('accepts a valid version-one record case-insensitively', () => {
    localStorage.setItem(key('0xABC'), JSON.stringify({ version: 1, completedAt: Date.now(), reason: 'skip' }));
    expect(hasCompletedHomeOnboarding('0xabc')).toBe(true);
  });

  it('ignores malformed and unsupported records', () => {
    localStorage.setItem(key('0xabc'), '{not-json');
    expect(hasCompletedHomeOnboarding('0xabc')).toBe(false);
    localStorage.setItem(key('0xabc'), JSON.stringify({ version: 2, completedAt: Date.now(), reason: 'skip' }));
    expect(hasCompletedHomeOnboarding('0xabc')).toBe(false);
  });

  it('does not throw when storage read fails', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => { throw new Error('blocked'); } } });
    expect(hasCompletedHomeOnboarding('0xabc')).toBe(false);
    vi.stubGlobal('window', { localStorage: localStorageStub });
  });

  it('writes a normalized, versioned completion record', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    completeHomeOnboarding('  0xABC  ', 'explore');
    expect(JSON.parse(localStorage.getItem(key('0xabc'))!)).toEqual({ version: 1, completedAt: now, reason: 'explore' });
  });

  it('does not throw when storage write fails', () => {
    vi.stubGlobal('window', { localStorage: { setItem: () => { throw new Error('blocked'); } } });
    expect(() => completeHomeOnboarding('0xabc', 'publish')).not.toThrow();
    vi.stubGlobal('window', { localStorage: localStorageStub });
  });
});
