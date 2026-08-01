import { createHmac, timingSafeEqual } from 'node:crypto';

export type StreamParams = {
  account: string;
  name: string;
  start: number;
  end?: number;
  exp: number; // epoch ms
};

function canonical(params: StreamParams): string {
  return [params.account, params.name, params.start, params.end ?? '', params.exp].join('|');
}

function secret(): string | null {
  const s = process.env.SHELBY_STREAM_SECRET?.trim();
  return s || null;
}

/** Sign stream params with HMAC-SHA256. Returns null when secret is not set. */
export function signStream(params: StreamParams): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac('sha256', key).update(canonical(params)).digest('hex');
}

/** Verify a signature for the given params, including expiry. */
export function verifyStream(sig: string, params: StreamParams): boolean {
  const key = secret();
  if (!key) return false;
  if (Date.now() > params.exp) return false;
  const expected = createHmac('sha256', key).update(canonical(params)).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
