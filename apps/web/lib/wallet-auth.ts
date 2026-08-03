/**
 * Wallet-signature verification for Meris publish actions (upload, publish,
 * delist, edit).
 *
 * The wallet signs a message via AIP-62 `aptos:signMessage`; the client sends
 * the signature, the full message that was signed, and the account public key.
 * The server derives the account address from the public key and verifies the
 * Ed25519 signature over the full message.
 */
import { createPublicKey, verify as verifyEd25519 } from 'node:crypto';
import {
  AccountAddress,
  AuthenticationKey,
  Ed25519PublicKey,
  Ed25519Signature,
} from '@aptos-labs/ts-sdk';

export type OwnershipAction = 'delist' | 'edit' | 'upload' | 'publish' | 'vote' | 'profile' | 'discussion' | 'listings' | 'ledger';

export type VerifyResult = { ok: boolean; reason?: string; sigInfo?: Record<string, string | number> };

export type SignatureParams = {
  action: OwnershipAction;
  /** Manifest id, blob name, or blob path the signature is bound to. */
  context: string;
  publicKeyHex: string;
  signature: string;
  fullMessage: string;
  now?: number;
};

const ALLOWED_ACTIONS: readonly OwnershipAction[] = ['delist', 'edit', 'upload', 'publish', 'vote', 'profile', 'discussion', 'listings', 'ledger'];
const MAX_SKEW_MS = 5 * 60 * 1000;

function parseEd25519Signature(signature: string): Ed25519Signature | null {
  // Raw 64-byte hex Ed25519 signature (what ts-sdk account.sign returns).
  const hex = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (/^[0-9a-fA-F]{128}$/.test(hex)) {
    try {
      return new Ed25519Signature(`0x${hex}`);
    } catch {
      // fall through
    }
  }
  // Hex-prefixed BCS AccountSignature (ed25519 variant): "00" + 64 bytes.
  if (/^[0-9a-fA-F]{130}$/.test(hex) && hex.startsWith('00')) {
    try {
      return new Ed25519Signature(`0x${hex.slice(2)}`);
    } catch {
      // fall through
    }
  }
  // Base64 payloads — try the common shapes:
  //  - 64 bytes: raw signature
  //  - 65 bytes, tag 0: BCS AccountSignature (ed25519)
  //  - 99 bytes, tags [4|2]/0/0: BCS SingleKeySignature over ed25519
  try {
    const bytes = Buffer.from(signature, 'base64');
    if (bytes.length === 64) {
      return new Ed25519Signature(`0x${bytes.toString('hex')}`);
    }
    if (bytes.length === 65 && bytes[0] === 0) {
      return new Ed25519Signature(`0x${bytes.subarray(1, 65).toString('hex')}`);
    }
    if (bytes.length === 99 && (bytes[0] === 4 || bytes[0] === 2) && bytes[1] === 0 && bytes[34] === 0) {
      return new Ed25519Signature(`0x${bytes.subarray(35, 99).toString('hex')}`);
    }
  } catch {
    // not a base64 payload
  }
  return null;
}

function rawSignatureBytes(signature: string): Buffer | null {
  const hex = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (/^[0-9a-fA-F]{128}$/.test(hex)) return Buffer.from(hex, 'hex');
  try {
    const bytes = Buffer.from(signature, 'base64');
    if (bytes.length === 64) return bytes;
    if (bytes.length === 65 && bytes[0] === 0) return bytes.subarray(1);
    if (bytes.length === 99 && (bytes[0] === 4 || bytes[0] === 2) && bytes[1] === 0 && bytes[34] === 0) {
      return bytes.subarray(35);
    }
  } catch {
    // unsupported encoding
  }
  return null;
}

function verifyWithNodeCrypto(publicKeyHex: string, signature: string, message: string): boolean {
  const rawKey = publicKeyHex.replace(/^0x/, '');
  const rawSignature = rawSignatureBytes(signature);
  if (!/^[0-9a-fA-F]{64}$/.test(rawKey) || !rawSignature) return false;
  try {
    const spki = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(rawKey, 'hex'),
    ]);
    const key = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    return verifyEd25519(null, Buffer.from(message, 'utf8'), key, rawSignature);
  } catch {
    return false;
  }
}

/**
 * Verify the signature payload and recover the signer address. `address` is
 * set only when everything checks out.
 */
function verifySignature(params: SignatureParams): { ok: boolean; reason?: string; address?: string; sigInfo?: Record<string, string | number> } {
  const now = params.now ?? Date.now();

  if (!ALLOWED_ACTIONS.includes(params.action)) {
    return { ok: false, reason: 'unsupported action' };
  }

  // The signed message must carry the exact action + context + expiry.
  // The wallet appends its own `\nnonce: …` after our plaintext — ignored here;
  // a short expiry provides the replay window.
  const escapedContext = params.context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = params.fullMessage.match(
    new RegExp(`meris:${params.action}:${escapedContext}:(\\d+)`),
  );
  if (!match) {
    return { ok: false, reason: 'payload not signed for this action/context' };
  }
  const expiry = Number(match[1]);
  if (!Number.isFinite(expiry) || expiry <= now) {
    return { ok: false, reason: 'signature expired' };
  }
  if (expiry - now > MAX_SKEW_MS) {
    return { ok: false, reason: 'signature expiry too far in the future' };
  }

  let publicKey: Ed25519PublicKey;
  try {
    publicKey = new Ed25519PublicKey(params.publicKeyHex);
  } catch {
    return { ok: false, reason: 'invalid public key' };
  }

  const derived = AuthenticationKey.fromPublicKey({ publicKey })
    .derivedAddress()
    .toString()
    .toLowerCase();

  const signature = parseEd25519Signature(params.signature);
  if (!signature) {
    return { ok: false, reason: 'unsupported signature format' };
  }

  const messageCandidates = [params.fullMessage];
  const canonicalMessage = params.fullMessage.replace(/\r\n/g, '\n');
  if (canonicalMessage !== params.fullMessage) messageCandidates.push(canonicalMessage);
  // Some multipart parsers canonicalize text fields to CRLF. Wallets sign the
  // returned LF message, so verify the canonical LF representation too.
  const wrapped = canonicalMessage.match(/^APTOS\nmessage: ([\s\S]*)\nnonce: [^\n]*$/);
  if (wrapped?.[1]) messageCandidates.push(wrapped[1]);
  const verifiedMessage = messageCandidates.some((candidate) =>
    publicKey.verifySignature({ message: new TextEncoder().encode(candidate), signature })
    || verifyWithNodeCrypto(params.publicKeyHex, params.signature, candidate),
  );
  if (!verifiedMessage) {
    return {
      ok: false,
      reason: 'signature verification failed',
      sigInfo: {
        sigLength: params.signature.length,
        sigPrefix: params.signature.slice(0, 16),
        publicKeyLength: params.publicKeyHex.length,
        publicKeyPrefix: params.publicKeyHex.slice(0, 18),
        derivedAddress: derived,
        fullMessageLength: params.fullMessage.length,
        fullMessagePrefix: params.fullMessage.slice(0, 60).replace(/\n/g, '\\n'),
        fullMessageSuffix: params.fullMessage.slice(-40).replace(/\n/g, '\\n'),
      },
    };
  }

  return { ok: true, address: derived };
}

/**
 * Verify a signature and require the signer to be `expectedAddress`.
 * Used for delist/edit where the owner is already recorded in the manifest.
 */
export function verifyPublisherSignature(
  params: SignatureParams & { expectedAddress: string },
): VerifyResult {
  const result = verifySignature(params);
  if (!result.ok) return result;
  if (result.address !== params.expectedAddress.trim().toLowerCase()) {
    return { ok: false, reason: 'public key does not match the publisher address' };
  }
  return { ok: true };
}

/**
 * Verify a signature and return the signer address.
 * Used for upload/publish where no owner is recorded in advance — the derived
 * address becomes the publisher address, never the client-supplied one.
 */
export function recoverPublisherAddress(
  params: SignatureParams,
): { ok: boolean; reason?: string; address?: string; sigInfo?: Record<string, string | number> } {
  return verifySignature(params);
}

/** Derive an Aptos address from a hex public key (throws on bad input). */
export function deriveAddressFromPublicKey(publicKeyHex: string): string {
  return AuthenticationKey.fromPublicKey({ publicKey: new Ed25519PublicKey(publicKeyHex) })
    .derivedAddress()
    .toString()
    .toLowerCase();
}
