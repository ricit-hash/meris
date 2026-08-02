import { NextResponse } from 'next/server';
import {
  getShelbyClient,
  getShelbyAccount,
  isShelbyConfigured,
} from '../../../lib/shelby';
import {
  profileBlobName,
  isValidWalletAddress,
  isValidUsername,
  buildProfileBlob,
  parseProfileBlob,
} from '../../../lib/profile-blob';
import { verifyPublisherSignature } from '../../../lib/wallet-auth';
import { checkRateLimit } from '../../../lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROFILES_PER_ADDRESS = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * GET ?wallet=0x… — read a wallet's profile blob from Shelby storage.
 * Profiles live as `profile-{wallet}.json` blobs, registered on-chain.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet') ?? '';
  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json({ error: 'wallet must be a 0x hex address.' }, { status: 400 });
  }
  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }
  const account = getShelbyAccount();
  const client = getShelbyClient();
  if (!account || !client) {
    return NextResponse.json({ error: 'Shelby client failed to initialize.' }, { status: 503 });
  }

  const name = profileBlobName(wallet);
  try {
    const metadata = await client.coordination.getBlobMetadata({ account: account.accountAddress, name: name as never });
    if (!metadata) {
      return NextResponse.json({ found: false });
    }
    const blob = await client.download({ account: account.accountAddress, blobName: name });
    const chunks: Uint8Array[] = [];
    const reader = blob.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const profile = parseProfileBlob(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    if (!profile) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Profile read failed: ${message}` }, { status: 502 });
  }
}

/**
 * PUT — write the wallet's profile blob. Wallet-signature-gated: the derived
 * address from the signature decides which profile blob is written.
 */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const b = body as {
    wallet?: unknown;
    username?: unknown;
    bio?: unknown;
    publicKeyHex?: unknown;
    signature?: unknown;
    fullMessage?: unknown;
  };
  if (typeof b.username !== 'string' || !isValidUsername(b.username)) {
    return NextResponse.json({ error: 'username must be 3-32 chars (letters, digits, _ -).' }, { status: 400 });
  }
  if (typeof b.wallet !== 'string' || !isValidWalletAddress(b.wallet)) {
    return NextResponse.json({ error: 'wallet must be a 0x hex address.' }, { status: 400 });
  }
  const bio = typeof b.bio === 'string' ? b.bio.trim().slice(0, 240) : '';
  const wallet = b.wallet.trim().toLowerCase();

  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }
  const account = getShelbyAccount();
  const client = getShelbyClient();
  if (!account || !client) {
    return NextResponse.json({ error: 'Shelby client failed to initialize.' }, { status: 503 });
  }

  // Wallet-proof: only the wallet owner can write its own profile blob.
  const verified = verifyPublisherSignature({
    expectedAddress: wallet,
    action: 'profile',
    context: wallet,
    publicKeyHex: typeof b.publicKeyHex === 'string' ? b.publicKeyHex : '',
    signature: typeof b.signature === 'string' ? b.signature : '',
    fullMessage: typeof b.fullMessage === 'string' ? b.fullMessage : '',
  });
  if (!verified.ok) {
    return NextResponse.json(
      { error: `Profile update requires a wallet signature (${verified.reason ?? 'invalid signature'}).` },
      { status: 401 },
    );
  }
  if (!checkRateLimit(`profile:${wallet}`, PROFILES_PER_ADDRESS, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: `Too many profile updates — try again later (limit ${PROFILES_PER_ADDRESS}/hour).` },
      { status: 429 },
    );
  }

  const name = profileBlobName(wallet);
  const blobData = buildProfileBlob({ username: b.username.trim(), bio, updatedAt: Date.now() });
  try {
    const expirationMicros = Date.now() * 1000 + 365 * 24 * 60 * 60 * 1_000_000; // 1 tahun
    await client.upload({ blobData, signer: account, blobName: name, expirationMicros });
    return NextResponse.json({
      ok: true,
      blobPath: `shelby://${account.accountAddress.toString()}/${name}`,
      username: b.username.trim(),
      bio,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Profile save failed: ${message}` }, { status: 502 });
  }
}
