export type MarketplaceSurface = 'app' | 'public';

export type MarketplaceContext = {
  href: string;
  scrollY: number;
  savedAt: number;
};

export const MARKETPLACE_CONTEXT_TTL_MS = 30 * 60 * 1000;

const BASE_ORIGIN = 'http://meris.local';
const ALLOWED_KEYS = ['q', 'sort', 'cat', 'delivery', 'price', 'license'] as const;

function basePath(surface: MarketplaceSurface): string {
  return surface === 'app' ? '/app/marketplace' : '/catalog';
}

function canonicalize(surface: MarketplaceSurface, raw: string): string {
  const fallback = basePath(surface);
  try {
    const parsed = new URL(raw, BASE_ORIGIN);
    if (parsed.origin !== BASE_ORIGIN || parsed.pathname !== fallback) return fallback;
    const params = new URLSearchParams();
    for (const key of ALLOWED_KEYS) {
      const value = parsed.searchParams.get(key);
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `${fallback}?${query}` : fallback;
  } catch {
    return fallback;
  }
}

export function canonicalMarketplaceHref(surface: MarketplaceSurface, href: string): string {
  return canonicalize(surface, href);
}

export function validateMarketplaceOrigin(raw: string | null, surface: MarketplaceSurface): string {
  return raw ? canonicalize(surface, raw) : basePath(surface);
}

function storageKey(href: string): string {
  return `meris:marketplace-context:${href}`;
}

export function saveMarketplaceContext(href: string, scrollY: number, now = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    const safeScroll = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
    window.sessionStorage.setItem(storageKey(href), JSON.stringify({ href, scrollY: safeScroll, savedAt: now }));
  } catch {
    // Scroll restoration is best effort and must never block navigation.
  }
}

export function readMarketplaceContext(href: string, now = Date.now()): MarketplaceContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = storageKey(href);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MarketplaceContext>;
    if (typeof parsed.href !== 'string' || parsed.href !== href || typeof parsed.scrollY !== 'number' || !Number.isFinite(parsed.scrollY) || parsed.scrollY < 0 || typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt) || now - parsed.savedAt > MARKETPLACE_CONTEXT_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return { href: parsed.href, scrollY: parsed.scrollY, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function clearMarketplaceContext(href: string): void {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(storageKey(href)); } catch { /* best effort */ }
}

export function shouldRestoreMarketplaceScroll(input: { embedded: boolean; href: string; manifestState: 'loading' | 'ready' | 'error'; itemCount: number; restoredHref: string | null }): boolean {
  return input.embedded && input.href.startsWith('/app/marketplace') && input.manifestState !== 'loading' && input.itemCount > 0 && input.restoredHref !== input.href;
}

export function clampScrollTarget(scrollY: number, scrollHeight: number, viewportHeight: number): number {
  const max = Math.max(0, scrollHeight - viewportHeight);
  return Math.min(max, Math.max(0, Number.isFinite(scrollY) ? scrollY : 0));
}
