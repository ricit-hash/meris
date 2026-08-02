import { NextResponse } from 'next/server';
import { getManifest, applyVote } from '../../../../../lib/manifest-store';
import { recoverPublisherAddress } from '../../../../../lib/wallet-auth';
import { checkRateLimit } from '../../../../../lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VOTES_PER_ADDRESS = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getManifest(id)) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const b = body as { vote?: unknown; publicKeyHex?: unknown; signature?: unknown; fullMessage?: unknown };
  const direction = b.vote === 1 ? 1 : b.vote === -1 ? -1 : null;
  if (direction === null) {
    return NextResponse.json({ error: 'vote must be 1 or -1.' }, { status: 400 });
  }

  // Wallet-proof: one vote per wallet, signature-bound to the listing id.
  const verified = recoverPublisherAddress({
    action: 'vote',
    context: id,
    publicKeyHex: typeof b.publicKeyHex === 'string' ? b.publicKeyHex : '',
    signature: typeof b.signature === 'string' ? b.signature : '',
    fullMessage: typeof b.fullMessage === 'string' ? b.fullMessage : '',
  });
  if (!verified.ok || !verified.address) {
    return NextResponse.json(
      { error: `Voting requires a wallet signature (${verified.reason ?? 'invalid signature'}).` },
      { status: 401 },
    );
  }
  if (!checkRateLimit(`vote:${verified.address}`, VOTES_PER_ADDRESS, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many votes — try again later.' },
      { status: 429 },
    );
  }

  const result = applyVote(id, verified.address, direction);
  if (!result) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }
  return NextResponse.json({ votes: result.votes, voters: result.voters });
}
