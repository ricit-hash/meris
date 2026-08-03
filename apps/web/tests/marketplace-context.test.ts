import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MARKETPLACE_CONTEXT_TTL_MS,
  canonicalMarketplaceHref,
  clampScrollTarget,
  clearMarketplaceContext,
  readMarketplaceContext,
  saveMarketplaceContext,
  validateMarketplaceOrigin,
} from '../lib/marketplace-context';

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
  clear: () => memory.clear(),
};
vi.stubGlobal('window', { sessionStorage: storage });

afterEach(() => {
  memory.clear();
  vi.restoreAllMocks();
  vi.stubGlobal('window', { sessionStorage: storage });
});

describe('marketplace context URLs', () => {
  it('keeps only canonical Marketplace query keys', () => {
    expect(canonicalMarketplaceHref('app', '/app/marketplace?q=events&cat=Public&evil=1')).toBe('/app/marketplace?q=events&cat=Public');
    expect(canonicalMarketplaceHref('public', '/catalog?q=events&sort=Newest&evil=1')).toBe('/catalog?q=events&sort=Newest');
  });

  it('falls back when the origin or surface is invalid', () => {
    expect(validateMarketplaceOrigin('https://evil.example/app/marketplace?q=x', 'app')).toBe('/app/marketplace');
    expect(validateMarketplaceOrigin('/catalog?q=x', 'app')).toBe('/app/marketplace');
    expect(validateMarketplaceOrigin('/app/marketplace?q=x', 'public')).toBe('/catalog');
  });
});

describe('marketplace context storage', () => {
  it('saves and reads a context by exact canonical href', () => {
    saveMarketplaceContext('/app/marketplace?q=events', 640, 1_000);
    expect(readMarketplaceContext('/app/marketplace?q=events', 1_001)).toEqual({ href: '/app/marketplace?q=events', scrollY: 640, savedAt: 1_000 });
    expect(readMarketplaceContext('/app/marketplace?q=other', 1_001)).toBeNull();
  });

  it('expires stale records and clears them', () => {
    saveMarketplaceContext('/app/marketplace', 640, 1_000);
    expect(readMarketplaceContext('/app/marketplace', 1_000 + MARKETPLACE_CONTEXT_TTL_MS + 1)).toBeNull();
    expect(memory.size).toBe(0);
  });

  it('ignores malformed records and storage failures', () => {
    memory.set('meris:marketplace-context:/app/marketplace', '{broken');
    expect(readMarketplaceContext('/app/marketplace', 1_000)).toBeNull();
    vi.stubGlobal('window', { sessionStorage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } } });
    expect(readMarketplaceContext('/app/marketplace')).toBeNull();
    expect(() => saveMarketplaceContext('/app/marketplace', 1)).not.toThrow();
    expect(() => clearMarketplaceContext('/app/marketplace')).not.toThrow();
  });
});

describe('scroll target', () => {
  it('clamps to the document maximum', () => {
    expect(clampScrollTarget(640, 2_000, 800)).toBe(640);
    expect(clampScrollTarget(640, 400, 800)).toBe(0);
    expect(clampScrollTarget(-10, 2_000, 800)).toBe(0);
  });
});
