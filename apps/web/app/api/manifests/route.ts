import { NextResponse } from 'next/server';
import { listManifests, createManifest, type ManifestCategory } from '../../../lib/manifest-store';
import { parseBlobPath } from '../../../lib/shelby';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ manifests: listManifests() });
}

const CATEGORIES = new Set(['AI-ready', 'Web3', 'Research', 'Agent']);
const KINDS = new Set(['range', 'file']);

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
  const publisherAddress =
    typeof b.publisherAddress === 'string' && b.publisherAddress.trim().startsWith('0x')
      ? b.publisherAddress.trim()
      : '';
  const uploadedAt =
    typeof b.uploadedAt === 'number' && Number.isFinite(b.uploadedAt) ? Math.floor(b.uploadedAt) : undefined;

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
  });

  return NextResponse.json({ manifest }, { status: 201 });
}
