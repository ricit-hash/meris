/**
 * Blob expiration policy. The Shelby contract accepts an arbitrary u64
 * expiration; Meris keeps a sane, env-configurable cap on top.
 */

export function parseExpiryDays(value: unknown, maxDays: number): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.min(Math.floor(n), Math.max(1, Math.floor(maxDays)));
}

/** Epoch ms when a blob uploaded `now` with `days` of life expires. */
export function blobExpiresAtMs(now: number, days: number): number {
  return now + Math.floor(days) * 86_400_000;
}
