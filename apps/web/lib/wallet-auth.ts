/**
 * Wallet-signature verification for Meris publish actions (upload, publish,
 * delist, edit).
 *
 * The wallet signs a message via AIP-62 `aptos:signMessage`; the client sends
 * the signature, the full message that was signed, and the account public key.
 * The server derives the account address from the public key and verifies the
 * Ed25519 signature over the full message.
 */
import {
  AccountAddress,
  AuthenticationKey,
  Ed25519PublicKey,
  Ed25519Signature,
} from '@aptos-labs/ts-sdk';

export type OwnershipAction = 'delist' | 'edit' | 'upload' | 'publish' | 'vote' | 'profile' | 'discussion';

export type VerifyResult = { ok: boolean; reason?: string };

export type SignatureParams = {
  action: OwnershipAction;
  /** Manifest id, blob name, or blob path the signature is bound to. */
  context: string;
  publicKeyHex: string;
  signature: string;
  fullMessage: string;
  now?: number;
};

const ALLOWED_ACTIONS: readonly OwnershipAction[] = ['delist', 'edit', 'upload', 'publish', 'vote', 'profile', 'discussion'];
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
 * Verify the signature payload and recover the signer address. `address` is
 * set only when everything checks out.
 */
function verifySignature(params: SignatureParams): { ok: boolean; reason?: string; address?: string } {
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

  const message = new TextEncoder().encode(params.fullMessage);
  if (!publicKey.verifySignature({ message, signature })) {
    return { ok: false, reason: 'signature verification failed' };
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
): { ok: boolean; reason?: string; address?: string } {
  return verifySignature(params);
}

/** Derive an Aptos address from a hex public key (throws on bad input). */
export function deriveAddressFromPublicKey(publicKeyHex: string): string {
  return AuthenticationKey.fromPublicKey({ publicKey: new Ed25519PublicKey(publicKeyHex) })
    .derivedAddress()
    .toString()
    .toLowerCase();
}
