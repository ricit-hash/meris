/**
 * Publisher profile stored as a Shelby blob (`profile-{wallet}.json`) under the
 * server's Shelby account, like dataset blobs. The blob is registered on-chain
 * and verifiable via getBlobMetadata; writes are wallet-signature-gated.
 */

export type ProfileData = {
  username: string;
  bio: string;
  updatedAt: number;
};

/** Blob name for a wallet's profile. Wallet must be a 0x hex address. */
export function profileBlobName(address: string): string {
  return `profile-${address.trim().toLowerCase()}.json`;
}

export function isValidWalletAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(address.trim());
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(username.trim());
}

export function buildProfileBlob(data: ProfileData): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data, null, 2));
}

export function parseProfileBlob(bytes: Uint8Array): ProfileData | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ProfileData>;
    if (typeof parsed.username !== 'string' || typeof parsed.bio !== 'string') return null;
    return {
      username: parsed.username,
      bio: parsed.bio,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}
