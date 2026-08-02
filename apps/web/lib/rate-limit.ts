/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Single-process only — fits the current single-instance Render deployment.
 * Move to a shared store (Redis) before scaling to multiple instances.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Allow `max` requests per `windowMs` for a key. */
export function checkRateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

/** Test helper + explicit reset on deploy. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Best-effort client IP from proxy headers (Render sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
