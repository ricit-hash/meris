import { NextResponse } from 'next/server';
import { listManifests, createManifest, type ManifestCategory } from '../../../lib/manifest-store';
import { parseBlobPath } from '../../../lib/shelby';
import { recoverPublisherAddress } from '../../../lib/wallet-auth';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getRowIndexLineCount } from '../../../lib/row-index-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publisher = url.searchParams.get('publisher')?.trim().toLowerCase() ?? '';
  const manifests = listManifests()
    .filter((m) => !publisher || (m.publisher ?? '').trim().toLowerCase() === publisher)
    .map((m) => {
      const parsed = parseBlobPath(m.blobPath);
      const totalLines = parsed ? getRowIndexLineCount(parsed.account, parsed.name) : undefined;
      return {
        ...m,
        hasRowIndex: totalLines !== undefined,
        totalLines,
      };
    });
  return NextResponse.json({ manifests });
}

const CATEGORIES = new Set(['AI-ready', 'Web3', 'Research', 'Agent']);
const KINDS = new Set(['range', 'file']);
const PUBLISH_PER_ADDRESS = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as {
    name?: unknown;
    description?: unknown;
    category?: unknown;
    format?: unknown;
    license?: unknown;
    priceShelbyUSD?: unknown;
    kind?: unknown;
    blobPath?: unknown;
    fileSize?: unknown;
    records?: unknown;
    publisher?: unknown;
    publisherAddress?: unknown;
    uploadedAt?: unknown;
    expiresAt?: unknown;
    publicKeyHex?: unknown;
    signature?: unknown;
    fullMessage?: unknown;
  };

  if (typeof b.name !== 'string' || b.name.trim().length < 3) {
    return NextResponse.json({ error: 'name is required (min 3 characters).' }, { status: 400 });
  }
  if (typeof b.category !== 'string' || !CATEGORIES.has(b.category)) {
    return NextResponse.json({ error: 'category must be one of AI-ready, Web3, Research, Agent.' }, { status: 400 });
  }
  if (typeof b.format !== 'string' || !b.format.trim()) {
    return NextResponse.json({ error: 'format is required.' }, { status: 400 });
  }
  if (typeof b.kind !== 'string' || !KINDS.has(b.kind)) {
    return NextResponse.json({ error: 'kind must be range or file.' }, { status: 400 });
  }
  const priceShelbyUSD = typeof b.priceShelbyUSD === 'number' && Number.isFinite(b.priceShelbyUSD) ? b.priceShelbyUSD : NaN;
  if (Number.isNaN(priceShelbyUSD) || priceShelbyUSD < 0) {
    return NextResponse.json({ error: 'priceShelbyUSD must be a number >= 0.' }, { status: 400 });
  }
  if (typeof b.blobPath !== 'string' || !parseBlobPath(b.blobPath)) {
    return NextResponse.json({ error: 'blobPath must be shelby://{account}/{name}.' }, { status: 400 });
  }
  const records = typeof b.records === 'number' && Number.isFinite(b.records) ? b.records : 0;
  if (b.kind === 'range' && records < 1) {
    return NextResponse.json({ error: 'records is required for range-delivery listings.' }, { status: 400 });
  }
  const publisher = typeof b.publisher === 'string' && b.publisher.trim() ? b.publisher.trim() : 'publisher';

  // Wallet-proof: the publisher address is derived from the verified signature,
  // never taken from the client — this kills both spam and address spoofing.
  const verified = recoverPublisherAddress({
    action: 'publish',
    context: b.blobPath.trim(),
    publicKeyHex: typeof b.publicKeyHex === 'string' ? b.publicKeyHex : '',
    signature: typeof b.signature === 'string' ? b.signature : '',
    fullMessage: typeof b.fullMessage === 'string' ? b.fullMessage : '',
  });
  if (!verified.ok || !verified.address) {
    return NextResponse.json(
      { error: `Publishing requires a wallet signature (${verified.reason ?? 'invalid signature'}).` },
      { status: 401 },
    );
  }
  if (!checkRateLimit(`publish:${verified.address}`, PUBLISH_PER_ADDRESS, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: `Too many listings — try again later (limit ${PUBLISH_PER_ADDRESS}/hour per wallet).` },
      { status: 429 },
    );
  }
  const publisherAddress = verified.address;

  const uploadedAt =
    typeof b.uploadedAt === 'number' && Number.isFinite(b.uploadedAt) ? Math.floor(b.uploadedAt) : undefined;
  const expiresAt =
    typeof b.expiresAt === 'number' && Number.isFinite(b.expiresAt) ? Math.floor(b.expiresAt) : undefined;

  const manifest = createManifest({
    name: b.name.trim(),
    description: typeof b.description === 'string' ? b.description.trim() : '',
    category: b.category as ManifestCategory,
    format: b.format.trim(),
    license: typeof b.license === 'string' && b.license.trim() ? b.license.trim() : 'Not specified',
    priceShelbyUSD,
    kind: b.kind as 'range' | 'file',
    blobPath: b.blobPath.trim(),
    fileSize: typeof b.fileSize === 'string' && b.fileSize.trim() ? b.fileSize.trim() : '—',
    records,
    publisher,
    publisherAddress,
    uploadedAt,
    expiresAt,
  });

  return NextResponse.json({ manifest }, { status: 201 });
}
