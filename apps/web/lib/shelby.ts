// Server-only module: imported exclusively by app/api/* route handlers.
// Never import this from a client component.
import { Ed25519Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';

let client: ShelbyNodeClient | null = null;

/**
 * The server-side Aptos account used to register/upload blobs on the Shelby
 * network. Returns null when SHELBY_ACCOUNT_PRIVATE_KEY is not configured.
 */
export function getShelbyAccount(): Ed25519Account | null {
  const key = process.env.SHELBY_ACCOUNT_PRIVATE_KEY?.trim();
  if (!key) return null;
  try {
    return new Ed25519Account({ privateKey: new Ed25519PrivateKey(key) });
  } catch {
    return null;
  }
}

/**
 * Lazily build the Shelby client from env config. Returns null when Shelby is
 * not configured (no API key) — callers must handle that gracefully.
 */
export function getShelbyClient(): ShelbyNodeClient | null {
  if (client) return client;
  const apiKey = process.env.SHELBY_API_KEY?.trim();
  if (!apiKey) return null;
  const network = (process.env.SHELBY_NETWORK?.trim() ?? 'shelbynet') as 'shelbynet' | 'testnet' | 'local';
  client = new ShelbyNodeClient({
    network: network as never,
    apiKey,
    // Storage region where blobs are written. `shelbynet-1` is the only
    // activated location on shelbynet; override via SHELBY_LOCATION.
    locationHint: process.env.SHELBY_LOCATION?.trim() || 'shelbynet-1',
  });
  return client;
}

/** True when the server can actually reach Shelby (API key configured). */
export function isShelbyConfigured(): boolean {
  return Boolean(process.env.SHELBY_API_KEY?.trim());
}

/** The current public Shelby indexer may expose processor status only. */
export function isBlobIndexerSchemaUnavailable(message: string): boolean {
  return /field ['"]blobs['"] not found in type:? ['"]query_root['"]/i.test(message);
}

export type ParsedBlobPath = { account: string; name: string } | null;

/**
 * Parse `shelby://{account}/{name...}` into account + blob name.
 * Also accepts a bare `{name}` (account resolved by the caller).
 */
export function parseBlobPath(path: string): ParsedBlobPath {
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('shelby://')) {
    const rest = trimmed.slice('shelby://'.length);
    const slash = rest.indexOf('/');
    if (slash <= 0) return null;
    const account = rest.slice(0, slash).trim();
    const name = rest.slice(slash + 1).trim();
    if (!account || !name) return null;
    return { account, name };
  }
  return { account: '', name: trimmed };
}

export function formatBlobSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
