export type OnboardingCompletionReason = 'explore' | 'publish' | 'skip';

export type HomeOnboardingRecord = {
  version: 1;
  completedAt: number;
  reason: OnboardingCompletionReason;
};

const STORAGE_PREFIX = 'meris:onboarding:home:';

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}${address.trim().toLowerCase()}`;
}

function isRecord(value: unknown): value is HomeOnboardingRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<HomeOnboardingRecord>;
  return record.version === 1
    && typeof record.completedAt === 'number'
    && Number.isFinite(record.completedAt)
    && (record.reason === 'explore' || record.reason === 'publish' || record.reason === 'skip');
}

export function hasCompletedHomeOnboarding(address: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(storageKey(address));
    if (!raw) return false;
    return isRecord(JSON.parse(raw));
  } catch {
    return false;
  }
}

export function completeHomeOnboarding(address: string, reason: OnboardingCompletionReason): void {
  if (typeof window === 'undefined') return;
  try {
    const record: HomeOnboardingRecord = { version: 1, completedAt: Date.now(), reason };
    window.localStorage.setItem(storageKey(address), JSON.stringify(record));
  } catch {
    // Storage is presentation-only; blocked storage must not block navigation.
  }
}
