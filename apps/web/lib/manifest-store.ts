import { readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWriteJson } from './atomic-json';

export type ManifestCategory = 'AI-ready' | 'Web3' | 'Research' | 'Agent';

export type Manifest = {
  id: string;
  name: string;
  description: string;
  category: ManifestCategory;
  format: string;
  license: string;
  /** ShelbyUSD. 0 = free listing. */
  priceShelbyUSD: number;
  kind: 'range' | 'file';
  blobPath: string;
  fileSize: string;
  records: number;
  publisher: string;
  /** Wallet address of the publisher — payment receiver. */
  publisherAddress: string;
  /** Epoch ms when the blob was uploaded to Shelby. Blobs expire after upload. */
  uploadedAt?: number;
  /** Epoch ms when the blob expires on Shelby. */
  expiresAt?: number;
  /** Number of signed download URLs issued for this listing. */
  downloads?: number;
  /** Vote delta (upvotes - downvotes). */
  votes?: number;
  /** Wallets that voted (dedupe). */
  voters?: string[];
  createdAt: number;
};

type ManifestInput = Omit<Manifest, 'id' | 'createdAt'>;

function storePath(): string {
  return process.env.MANIFEST_FILE ?? path.join(process.cwd(), 'data', 'manifests.json');
}

function readAll(): Manifest[] {
  try {
    const raw = readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Manifest[];
    if (!Array.isArray(parsed)) return [];
    // Migrate manifests written before the USD -> ShelbyUSD rename.
    return parsed.map((m) => {
      const legacy = m as Manifest & { priceUsd?: number };
      const migrated: Manifest = {
        ...m,
        priceShelbyUSD: typeof legacy.priceShelbyUSD === 'number' ? legacy.priceShelbyUSD : (legacy.priceUsd ?? 0),
        publisherAddress: legacy.publisherAddress ?? '',
        downloads: typeof m.downloads === 'number' ? m.downloads : 0,
        votes: typeof m.votes === 'number' ? m.votes : 0,
        voters: Array.isArray(m.voters) ? m.voters : [],
      };
      return migrated;
    });
  } catch {
    return [];
  }
}

function writeAll(list: Manifest[]): void {
  atomicWriteJson(storePath(), list);
}

export function listManifests(): Manifest[] {
  return readAll();
}

export function getManifest(id: string): Manifest | undefined {
  return readAll().find((m) => m.id === id);
}

export function createManifest(input: ManifestInput): Manifest {
  const manifest: Manifest = {
    ...input,
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  const list = readAll();
  list.unshift(manifest);
  writeAll(list);
  return manifest;
}

/** Remove a manifest from the store. Returns true when it existed. */
export function deleteManifest(id: string): boolean {
  const list = readAll();
  const next = list.filter((m) => m.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}

export function updateManifest(
  id: string,
  updates: Partial<Pick<Manifest, 'description' | 'priceShelbyUSD' | 'license' | 'format'>>,
): Manifest {
  const list = readAll();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Manifest not found.');
  const updated: Manifest = { ...list[idx], ...updates };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

/** Count one signed download for a listing. No-op when the listing is gone. */
export function incrementDownloads(id: string): void {
  const list = readAll();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], downloads: (list[idx].downloads ?? 0) + 1 };
  writeAll(list);
}

/**
 * Apply a wallet's vote (+1/-1) to a listing. The same wallet can vote once;
 * voting again removes the previous vote first. Returns the new vote delta.
 */
export function applyVote(id: string, voter: string, direction: 1 | -1): { votes: number; voters: number } | null {
  const list = readAll();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const m = list[idx];
  const voters = Array.isArray(m.voters) ? [...m.voters] : [];
  const existing = voters.findIndex((v) => v === voter);
  if (existing !== -1) voters.splice(existing, 1);
  voters.push(voter);
  const votes = (m.votes ?? 0) + direction;
  list[idx] = { ...m, votes, voters };
  writeAll(list);
  return { votes, voters: voters.length };
}
