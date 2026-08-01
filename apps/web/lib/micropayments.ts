// Server-side store for micropayment WithdrawApproval records. Created when a
// channel is confirmed; consumed when the publisher withdraws.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export type MicropaymentApproval = {
  id: string;
  sender: string;
  receiver: string;
  channelId: string;
  amount: string;
  sequenceNumber: string;
  publicKeyHex: string;
  signatureHex: string;
  status: 'pending' | 'withdrawn';
  createdAt: number;
};

function storePath(): string {
  return process.env.MICROPAYMENTS_FILE ?? path.join(process.cwd(), 'data', 'micropayments.json');
}

function readAll(): MicropaymentApproval[] {
  try {
    const parsed = JSON.parse(readFileSync(storePath(), 'utf8')) as MicropaymentApproval[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: MicropaymentApproval[]): void {
  const p = storePath();
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(list, null, 2));
}

export function storeMicropaymentApproval(input: Omit<MicropaymentApproval, 'id' | 'createdAt'>): MicropaymentApproval {
  const entry: MicropaymentApproval = {
    ...input,
    id: `mp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  const list = readAll();
  list.unshift(entry);
  writeAll(list);
  return entry;
}

export function getMicropaymentApprovals(): MicropaymentApproval[] {
  return readAll();
}

export function markMicropaymentWithdrawn(id: string): boolean {
  const list = readAll();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], status: 'withdrawn' };
  writeAll(list);
  return true;
}
