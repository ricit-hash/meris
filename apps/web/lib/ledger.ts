import { readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWriteJson } from './atomic-json';

export type LedgerEntry = {
  id: string;
  manifestId: string;
  blobPath: string;
  buyer: string;
  seller: string;
  amountShelbyUSD: number;
  hash: string;
  kind: 'range' | 'file';
  /** Manifest title captured at purchase time for stable buyer history. */
  manifestName?: string;
  /** Number of records purchased for a range request. */
  records?: number;
  /** Existing or newly confirmed micropayment channel. */
  channelId?: string;
  /** Requested byte window (range-delivery only). */
  rangeBytes?: number;
  createdAt: number;
};

type LedgerInput = Omit<LedgerEntry, 'id' | 'createdAt'>;

function storePath(): string {
  return process.env.LEDGER_FILE ?? path.join(process.cwd(), 'data', 'ledger.json');
}

function readAll(): LedgerEntry[] {
  try {
    const raw = readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as LedgerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: LedgerEntry[]): void {
  atomicWriteJson(storePath(), list);
}

export function addLedgerEntry(input: LedgerInput): LedgerEntry {
  const entry: LedgerEntry = {
    ...input,
    id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  const list = readAll();
  list.unshift(entry);
  writeAll(list);
  return entry;
}

export function listLedger(opts?: { account?: string; role?: 'buyer' | 'seller' }): LedgerEntry[] {
  const all = readAll();
  if (!opts?.account) return all;
  if (opts.role === 'buyer') return all.filter((e) => e.buyer === opts.account);
  if (opts.role === 'seller') return all.filter((e) => e.seller === opts.account);
  return all.filter((e) => e.buyer === opts.account || e.seller === opts.account);
}

/** Total ShelbyUSD received by an account as seller. */
export function sumRevenue(account: string): number {
  const total = readAll()
    .filter((e) => e.seller === account)
    .reduce((sum, e) => sum + e.amountShelbyUSD, 0);
  return Math.round(total * 100) / 100;
}
