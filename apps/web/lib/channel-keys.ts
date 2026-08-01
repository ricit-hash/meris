// Server-side store for micropayment channel signing keys.
// The server mints an ephemeral Ed25519 keypair per prospective channel; the
// public key goes into the create_channel payload the buyer signs (deposit),
// and the private key is held here so the server can produce the WithdrawApproval
// signature the receiver needs to withdraw. Pending entries are cleared once
// the channel is confirmed on-chain.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export type PendingChannelKey = {
  /** sender (buyer) address */
  sender: string;
  /** receiver (publisher) address */
  receiver: string;
  /** hex private key of the channel keypair */
  privateKeyHex: string;
  /** on-chain deposit in smallest units */
  deposit: string;
  createdAt: number;
};

export type ChannelKey = PendingChannelKey & {
  /** on-chain channel id */
  channelId: string;
};

function storePath(): string {
  return process.env.CHANNEL_KEYS_FILE ?? path.join(process.cwd(), 'data', 'channel-keys.json');
}

type FileShape = { pending: Record<string, PendingChannelKey>; confirmed: Record<string, ChannelKey> };

function readAll(): FileShape {
  try {
    const parsed = JSON.parse(readFileSync(storePath(), 'utf8')) as FileShape;
    return { pending: parsed.pending ?? {}, confirmed: parsed.confirmed ?? {} };
  } catch {
    return { pending: {}, confirmed: {} };
  }
}

function writeAll(shape: FileShape): void {
  const p = storePath();
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(shape, null, 2));
}

/** Key used while a channel is being created (before the tx confirms). */
export function addPendingChannelKey(entry: PendingChannelKey): string {
  const id = `pk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const shape = readAll();
  shape.pending[id] = entry;
  writeAll(shape);
  return id;
}

export function getPendingChannelKey(id: string): PendingChannelKey | null {
  return readAll().pending[id] ?? null;
}

export function removePendingChannelKey(id: string): void {
  const shape = readAll();
  delete shape.pending[id];
  writeAll(shape);
}

/** Store the confirmed channel key once create_channel is on-chain. */
export function addConfirmedChannelKey(entry: ChannelKey): void {
  const shape = readAll();
  shape.confirmed[entry.channelId] = entry;
  writeAll(shape);
}

export function getConfirmedChannelKey(channelId: string): ChannelKey | null {
  return readAll().confirmed[channelId] ?? null;
}
