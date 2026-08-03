import { describe, expect, it } from 'vitest';
import { shouldRestoreMarketplaceScroll } from '../lib/marketplace-context';

describe('marketplace scroll restore decision', () => {
  it('waits for embedded data and a non-empty stable list', () => {
    const base = { embedded: true, href: '/app/marketplace', restoredHref: null, itemCount: 3 };
    expect(shouldRestoreMarketplaceScroll({ ...base, manifestState: 'loading' })).toBe(false);
    expect(shouldRestoreMarketplaceScroll({ ...base, manifestState: 'ready' })).toBe(true);
    expect(shouldRestoreMarketplaceScroll({ ...base, manifestState: 'error' })).toBe(true);
  });

  it('does not restore for public, empty, or already-restored states', () => {
    expect(shouldRestoreMarketplaceScroll({ embedded: false, href: '/catalog', manifestState: 'ready', itemCount: 3, restoredHref: null })).toBe(false);
    expect(shouldRestoreMarketplaceScroll({ embedded: true, href: '/app/marketplace', manifestState: 'ready', itemCount: 0, restoredHref: null })).toBe(false);
    expect(shouldRestoreMarketplaceScroll({ embedded: true, href: '/app/marketplace', manifestState: 'ready', itemCount: 3, restoredHref: '/app/marketplace' })).toBe(false);
  });
});
