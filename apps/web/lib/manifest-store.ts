import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

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
  /** Epoch ms when the blob was uploaded to Shelby. Blobs expire 90 days after upload. */
  uploadedAt?: number;
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
      };
      return migrated;
    });
  } catch {
    return [];
  }
}

function writeAll(list: Manifest[]): void {
  const p = storePath();
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(list, null, 2));
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
