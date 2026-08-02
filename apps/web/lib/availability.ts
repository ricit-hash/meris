export type AvailabilityStatus = 'available' | 'expired' | 'missing' | 'unavailable';

export type AvailabilityInput = {
  expiresAt?: number;
  now?: number;
  found: boolean;
  probeFailed?: boolean;
};

export function deriveAvailability({ expiresAt, now = Date.now(), found, probeFailed = false }: AvailabilityInput): AvailabilityStatus {
  if (typeof expiresAt === 'number' && expiresAt <= now) return 'expired';
  if (probeFailed) return 'unavailable';
  if (!found) return 'missing';
  return 'available';
}

export function formatExpiry(expiresAt: number | undefined, now = Date.now()): string {
  if (typeof expiresAt !== 'number') return 'No expiry recorded';
  const remaining = expiresAt - now;
  if (remaining <= 0) return 'Expired';
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return days === 1 ? 'Expires in 1 day' : `Expires in ${days} days`;
}
