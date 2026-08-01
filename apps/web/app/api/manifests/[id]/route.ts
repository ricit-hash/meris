import { NextResponse } from 'next/server';
import { getManifest, deleteManifest, updateManifest } from '../../../../lib/manifest-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const manifest = getManifest(id);
  if (!manifest) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }
  return NextResponse.json({ manifest });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const manifest = getManifest(id);
  if (!manifest) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }

  let requester = '';
  try {
    const body = (await request.json()) as { requester?: unknown };
    if (typeof body.requester === 'string') requester = body.requester;
  } catch {
    // body optional — legacy manifests without publisherAddress may delete without requester
  }

  // Guard: manifest dengan publisherAddress wajib dihapus oleh pemiliknya.
  if (manifest.publisherAddress && requester !== manifest.publisherAddress) {
    return NextResponse.json({ error: 'Only the publisher can delist this listing.' }, { status: 403 });
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
    description?: unknown;
    priceShelbyUSD?: unknown;
    license?: unknown;
    format?: unknown;
  };

  // Guard: hanya publisher yang bisa edit.
  if (manifest.publisherAddress && b.requester !== manifest.publisherAddress) {
    return NextResponse.json({ error: 'Only the publisher can edit this listing.' }, { status: 403 });
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
