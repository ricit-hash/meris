/**
 * Publisher-ownership verification for manifest delist/edit.
 *
 * The wallet signs a message via AIP-62 `aptos:signMessage`; the client sends
 * the signature, the full message that was signed, and the account public key.
 * The server derives the account address from the public key and checks it
 * matches the manifest publisher, then verifies the Ed25519 signature.
 */
import {
  AccountAddress,
  AuthenticationKey,
  Ed25519PublicKey,
  Ed25519Signature,
} from '@aptos-labs/ts-sdk';

export type OwnershipAction = 'delist' | 'edit';

export type VerifyResult = { ok: boolean; reason?: string };

const ALLOWED_ACTIONS: readonly OwnershipAction[] = ['delist', 'edit'];
const MAX_SKEW_MS = 5 * 60 * 1000;

function parseEd25519Signature(signature: string): Ed25519Signature | null {
  // Raw 64-byte hex Ed25519 signature (what ts-sdk account.sign returns).
  const hex = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (/^[0-9a-fA-F]{128}$/.test(hex)) {
    try {
      return new Ed25519Signature(`0x${hex}`);
    } catch {
      // fall through to BCS parse
    }
  }
  // BCS-serialized AccountSignature in base64 (wallet-standard payloads):
  // u8 variant tag (0 = ed25519) followed by the 64-byte raw signature.
  try {
    const bytes = Buffer.from(signature, 'base64');
    if (bytes.length === 65 && bytes[0] === 0) {
      return new Ed25519Signature(`0x${bytes.subarray(1, 65).toString('hex')}`);
    }
  } catch {
    // not BCS — return null below
  }
  return null;
}

/**
 * Verify that a wallet signature proves ownership of `expectedAddress` for a
 * delist/edit of `manifestId`, signed no longer than MAX_SKEW_MS ago.
 */
export function verifyPublisherSignature(params: {
  expectedAddress: string;
  action: OwnershipAction;
  manifestId: string;
  publicKeyHex: string;
  signature: string;
  fullMessage: string;
  now?: number;
}): VerifyResult {
  const now = params.now ?? Date.now();

  if (!ALLOWED_ACTIONS.includes(params.action)) {
    return { ok: false, reason: 'unsupported action' };
  }

  // The signed message must carry the exact action + manifest id + expiry.
  // The wallet appends its own `\nnonce: …` after our plaintext — ignored here;
  // a short expiry provides the replay window.
  const match = params.fullMessage.match(
    new RegExp(`meris:(${params.action}):([^:]+):(\\d+)`),
  );
  if (!match) {
    return { ok: false, reason: 'payload not signed for this action' };
  }
  const [, action, manifestId, expiryRaw] = match;
  if (action !== params.action || manifestId !== params.manifestId) {
    return { ok: false, reason: 'payload is for a different action or manifest' };
  }
  const expiry = Number(expiryRaw);
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

  // The public key must derive to the publisher address.
  const derived = AuthenticationKey.fromPublicKey({ publicKey }).derivedAddress();
  if (derived.toString() !== params.expectedAddress.trim().toLowerCase()) {
    return { ok: false, reason: 'public key does not match the publisher address' };
  }

  const signature = parseEd25519Signature(params.signature);
  if (!signature) {
    return { ok: false, reason: 'unsupported signature format' };
  }

  const message = new TextEncoder().encode(params.fullMessage);
  if (!publicKey.verifySignature({ message, signature })) {
    return { ok: false, reason: 'signature verification failed' };
  }

  return { ok: true };
}
