export type PublisherProfile = {
  username: string;
  discord: string;
  x: string;
};

const PROFILE_KEY = 'meris_publisher_profile';
const LEGACY_PROFILE_KEY = 'aletheia_publisher_profile';

export function getProfile(): PublisherProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const current = window.localStorage.getItem(PROFILE_KEY);
    const legacy = current ? null : window.localStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacy) window.localStorage.setItem(PROFILE_KEY, legacy);
    const raw = current ?? legacy;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PublisherProfile>;
    if (!parsed?.username) return null;
    return {
      username: parsed.username,
      discord: parsed.discord ?? '',
      x: parsed.x ?? '',
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: PublisherProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
