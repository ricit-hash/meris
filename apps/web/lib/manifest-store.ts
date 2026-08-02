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
  priceShelbyUSD: number;
  kind: 'range' | 'file';
  blobPath: string;
  fileSize: string;
  records: number;
  publisher: string;
  publisherAddress: string;
  uploadedAt?: number;
  expiresAt?: number;
  downloads?: number;
  votes?: number;
  voters?: string[];
  /** Immutable dataset version. Existing manifests migrate to version 1. */
  version: number;
  /** Previous version in this immutable chain. */
  parentManifestId?: string;
  /** First manifest in this immutable chain. */
  rootManifestId: string;
  /** Publisher-supplied summary of what changed in this version. */
  changelog?: string;
  createdAt: number;
};

type ManifestInput = Omit<Manifest, 'id' | 'createdAt' | 'version' | 'rootManifestId'> & {
  version?: number;
  rootManifestId?: string;
};

function storePath(): string {
  return process.env.MANIFEST_FILE ?? path.join(process.cwd(), 'data', 'manifests.json');
}

function readAll(): Manifest[] {
  try {
    const raw = readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Array<Partial<Manifest> & { priceUsd?: number }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({
      ...m,
      priceShelbyUSD: typeof m.priceShelbyUSD === 'number' ? m.priceShelbyUSD : (m.priceUsd ?? 0),
      publisherAddress: m.publisherAddress ?? '',
      downloads: typeof m.downloads === 'number' ? m.downloads : 0,
      votes: typeof m.votes === 'number' ? m.votes : 0,
      voters: Array.isArray(m.voters) ? m.voters : [],
      version: typeof m.version === 'number' && m.version > 0 ? m.version : 1,
      rootManifestId: m.rootManifestId ?? m.id ?? '',
    })) as Manifest[];
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

/** Catalog view: one current manifest per immutable dataset chain. */
export function listLatestManifests(): Manifest[] {
  const latest = new Map<string, Manifest>();
  for (const manifest of readAll()) {
    const root = manifest.rootManifestId || manifest.id;
    const existing = latest.get(root);
    if (!existing || manifest.version > existing.version || (manifest.version === existing.version && manifest.createdAt > existing.createdAt)) {
      latest.set(root, manifest);
    }
  }
  return [...latest.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getManifest(id: string): Manifest | undefined {
  return readAll().find((m) => m.id === id);
}

export function getManifestVersions(id: string): Manifest[] {
  const manifest = getManifest(id);
  if (!manifest) return [];
  const root = manifest.rootManifestId || manifest.id;
  return readAll().filter((m) => (m.rootManifestId || m.id) === root).sort((a, b) => b.version - a.version);
}

export function createManifest(input: ManifestInput): Manifest {
  const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const manifest: Manifest = {
    ...input,
    id,
    version: input.version ?? 1,
    rootManifestId: input.rootManifestId ?? id,
    createdAt: Date.now(),
  };
  const list = readAll();
  list.unshift(manifest);
  writeAll(list);
  return manifest;
}

/** Create a new immutable version; the parent manifest is never mutated. */
export function createManifestVersion(
  id: string,
  updates: Partial<Pick<Manifest, 'description' | 'priceShelbyUSD' | 'license' | 'format'>> & { changelog?: string },
): Manifest {
  const list = readAll();
  const current = list.find((m) => m.id === id);
  if (!current) throw new Error('Manifest not found.');
  const next: Manifest = {
    ...current,
    ...updates,
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    version: current.version + 1,
    parentManifestId: current.id,
    rootManifestId: current.rootManifestId || current.id,
    createdAt: Date.now(),
    downloads: 0,
    votes: 0,
    voters: [],
  };
  list.unshift(next);
  writeAll(list);
  return next;
}

export function deleteManifest(id: string): boolean {
  const list = readAll();
  const next = list.filter((m) => m.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}

/** @deprecated Use createManifestVersion. Kept as a safe immutable alias for callers. */
export function updateManifest(
  id: string,
  updates: Partial<Pick<Manifest, 'description' | 'priceShelbyUSD' | 'license' | 'format'>> & { changelog?: string },
): Manifest {
  return createManifestVersion(id, updates);
}

export function incrementDownloads(id: string): void {
  const list = readAll();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], downloads: (list[idx].downloads ?? 0) + 1 };
  writeAll(list);
}

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
