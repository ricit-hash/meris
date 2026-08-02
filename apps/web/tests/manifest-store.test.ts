import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createManifest, createManifestVersion, listManifests, listLatestManifests, getManifest, getManifestVersions, incrementDownloads, applyVote } from '../lib/manifest-store';

describe('manifest store', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'manifest-'));
    process.env.MANIFEST_FILE = path.join(dir, 'm.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.MANIFEST_FILE;
  });

  it('creates and lists manifests', () => {
    createManifest({
      name: 'My Set',
      description: '',
      category: 'AI-ready',
      format: 'JSONL',
      license: 'CC BY 4.0',
      priceShelbyUSD: 0,
      kind: 'range',
      blobPath: 'shelby://0x1/x.csv',
      fileSize: '1 MB',
      records: 100,
      publisher: 'meteo-labs',
      publisherAddress: '0x1234',
    });
    const list = listManifests();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('My Set');
    expect(list[0].id.startsWith('m-')).toBe(true);
  });

  it('returns empty list when store file does not exist', () => {
    expect(listManifests()).toEqual([]);
  });

  it('gets a manifest by id', () => {
    const created = createManifest({
      name: 'Paid Set',
      description: '',
      category: 'Web3',
      format: 'Parquet',
      license: 'ODbL',
      priceShelbyUSD: 4.5,
      kind: 'range',
      blobPath: 'shelby://0x1/y.parquet',
      fileSize: '2 MB',
      records: 5000,
      publisher: 'alice',
      publisherAddress: '0xabcd',
    });
    const found = getManifest(created.id);
    expect(found?.priceShelbyUSD).toBe(4.5);
    expect(getManifest('m-999')).toBeUndefined();
  });

  it('counts downloads and migrates missing counters', () => {
    const created = createManifest({
      name: 'Counted',
      description: '',
      category: 'AI-ready',
      format: 'CSV',
      license: 'CC BY 4.0',
      priceShelbyUSD: 0,
      kind: 'range',
      blobPath: 'shelby://0x1/c.csv',
      fileSize: '1 MB',
      records: 100,
      publisher: 'bob',
      publisherAddress: '0xbeef',
    });
    incrementDownloads(created.id);
    incrementDownloads(created.id);
    expect(getManifest(created.id)?.downloads).toBe(2);
    incrementDownloads('m-missing'); // no-op
    expect(listManifests()).toHaveLength(1);
  });

  it('creates immutable versions and returns only the latest catalog version', () => {
    const original = createManifest({ name: 'Versioned', description: 'v1', category: 'Research', format: 'CSV', license: 'CC BY 4.0', priceShelbyUSD: 1, kind: 'range', blobPath: 'shelby://0x1/v.csv', fileSize: '1 MB', records: 10, publisher: 'alice', publisherAddress: '0x1234' });
    const next = createManifestVersion(original.id, { description: 'v2', changelog: 'Added corrected rows.' });
    expect(next.id).not.toBe(original.id);
    expect(next.version).toBe(2);
    expect(next.parentManifestId).toBe(original.id);
    expect(next.rootManifestId).toBe(original.id);
    expect(getManifest(original.id)?.description).toBe('v1');
    expect(getManifestVersions(original.id).map((m) => m.version)).toEqual([2, 1]);
    expect(listLatestManifests().map((m) => m.id)).toEqual([next.id]);
  });

  it('applies one vote per wallet and persists the voter list', () => {
    const created = createManifest({
      name: 'Voted',
      description: '',
      category: 'Web3',
      format: 'CSV',
      license: 'ODbL',
      priceShelbyUSD: 2,
      kind: 'range',
      blobPath: 'shelby://0x1/v.csv',
      fileSize: '1 MB',
      records: 100,
      publisher: 'alice',
      publisherAddress: '0x1234',
    });
    const r1 = applyVote(created.id, '0xaaaa', 1);
    expect(r1).toEqual({ votes: 1, voters: 1 });
    // Second vote from the same wallet replaces, not duplicates.
    applyVote(created.id, '0xaaaa', -1);
    const after = getManifest(created.id);
    expect(after?.votes).toBe(0);
    expect(after?.voters).toEqual(['0xaaaa']);
    // Different wallet adds.
    applyVote(created.id, '0xbbbb', 1);
    expect(getManifest(created.id)?.votes).toBe(1);
    expect(getManifest(created.id)?.voters).toHaveLength(2);
    expect(applyVote('m-missing', '0xaaaa', 1)).toBeNull();
  });
});
