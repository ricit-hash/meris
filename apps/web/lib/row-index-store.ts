import { readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWriteJson } from './atomic-json';

/**
 * Persistent row-index sidecar: blob path -> line offsets.
 *
 * The index is small relative to the blob (one number per line) and lives on
 * the Meris server. The actual bytes stay in Shelby storage — the index only
 * lets a range request end exactly on a line boundary.
 */

type RowIndexEntry = {
  lineEnds: number[];
  totalBytes: number;
  updatedAt: number;
};

type RowIndexStore = Record<string, RowIndexEntry>;

function storePath(): string {
  return process.env.ROW_INDEX_FILE ?? path.join(process.cwd(), 'data', 'row-indexes.json');
}

function readAll(): RowIndexStore {
  try {
    const raw = readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as RowIndexStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(store: RowIndexStore): void {
  atomicWriteJson(storePath(), store);
}

export function rowIndexKey(account: string, name: string): string {
  return `${account.trim().toLowerCase()}/${name}`;
}

/** Line-end offsets for a blob, or undefined when no index was built. */
export function getRowIndex(account: string, name: string): number[] | undefined {
  return readAll()[rowIndexKey(account, name)]?.lineEnds;
}

/** Number of lines in the indexed blob, or undefined when not indexed. */
export function getRowIndexLineCount(account: string, name: string): number | undefined {
  return readAll()[rowIndexKey(account, name)]?.lineEnds.length;
}

export function setRowIndex(account: string, name: string, lineEnds: number[], totalBytes: number): void {
  const store = readAll();
  store[rowIndexKey(account, name)] = { lineEnds, totalBytes, updatedAt: Date.now() };
  writeAll(store);
}
