import { NextResponse } from 'next/server';
import { getManifest, deleteManifest, updateManifest } from '../../../../lib/manifest-store';
import { parseBlobPath } from '../../../../lib/shelby';
import { getRowIndexLineCount } from '../../../../lib/row-index-store';
import { verifyPublisherSignature } from '../../../../lib/wallet-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const manifest = getManifest(id);
  if (!manifest) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }
  const parsed = parseBlobPath(manifest.blobPath);
  const totalLines = parsed?.account ? getRowIndexLineCount(parsed.account, parsed.name) : undefined;
  return NextResponse.json({ manifest, hasRowIndex: totalLines !== undefined, totalLines });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const manifest = getManifest(id);
  if (!manifest) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }

  let body: { requester?: unknown; publicKeyHex?: unknown; signature?: unknown; fullMessage?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // body optional — legacy manifests without publisherAddress may delete without requester
  }

  // Guard: manifest dengan publisherAddress wajib dihapus oleh pemiliknya —
  // dibuktikan dengan wallet signature, bukan klaim address dari client.
  if (manifest.publisherAddress) {
    const verified = verifyPublisherSignature({
      expectedAddress: manifest.publisherAddress,
      action: 'delist',
      context: id,
      publicKeyHex: typeof body.publicKeyHex === 'string' ? body.publicKeyHex : '',
      signature: typeof body.signature === 'string' ? body.signature : '',
      fullMessage: typeof body.fullMessage === 'string' ? body.fullMessage : '',
    });
    if (!verified.ok) {
      return NextResponse.json(
        { error: `Only the publisher can delist this listing (${verified.reason ?? 'invalid signature'}).` },
        { status: 403 },
      );
    }
  }

  deleteManifest(id);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const manifest = getManifest(id);
  if (!manifest) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const b = body as {
    requester?: unknown;
    publicKeyHex?: unknown;
    signature?: unknown;
    fullMessage?: unknown;
    description?: unknown;
    priceShelbyUSD?: unknown;
    license?: unknown;
    format?: unknown;
  };

  // Guard: hanya publisher yang bisa edit — dibuktikan dengan wallet signature.
  if (manifest.publisherAddress) {
    const verified = verifyPublisherSignature({
      expectedAddress: manifest.publisherAddress,
      action: 'edit',
      context: id,
      publicKeyHex: typeof b.publicKeyHex === 'string' ? b.publicKeyHex : '',
      signature: typeof b.signature === 'string' ? b.signature : '',
      fullMessage: typeof b.fullMessage === 'string' ? b.fullMessage : '',
    });
    if (!verified.ok) {
      return NextResponse.json(
        { error: `Only the publisher can edit this listing (${verified.reason ?? 'invalid signature'}).` },
        { status: 403 },
      );
    }
  }

  const updates: { description?: string; priceShelbyUSD?: number; license?: string; format?: string } = {};
  if (typeof b.description === 'string') updates.description = b.description.trim();
  if (typeof b.priceShelbyUSD === 'number' && Number.isFinite(b.priceShelbyUSD)) {
    updates.priceShelbyUSD = Math.max(0, Math.round(b.priceShelbyUSD * 100) / 100);
  }
  if (typeof b.license === 'string') updates.license = b.license.trim();
  if (typeof b.format === 'string') updates.format = b.format.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const updated = updateManifest(id, updates);
  return NextResponse.json({ manifest: updated });
}
