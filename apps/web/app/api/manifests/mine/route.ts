import { NextResponse } from 'next/server';
import { listLatestManifests } from '../../../../lib/manifest-store';
import { recoverPublisherAddress } from '../../../../lib/wallet-auth';
import { getRowIndexLineCount } from '../../../../lib/row-index-store';
import { parseBlobPath } from '../../../../lib/shelby';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { publicKeyHex?: unknown; signature?: unknown; fullMessage?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const publicKeyHex = typeof body.publicKeyHex === 'string' ? body.publicKeyHex : '';
  const signature = typeof body.signature === 'string' ? body.signature : '';
  const fullMessage = typeof body.fullMessage === 'string' ? body.fullMessage : '';
  const verified = recoverPublisherAddress({ action: 'listings', context: 'publisher', publicKeyHex, signature, fullMessage });
  if (!verified.ok || !verified.address) return NextResponse.json({ error: verified.reason ?? 'Wallet proof required.' }, { status: 401 });
  const manifests = listLatestManifests().filter((manifest) => manifest.publisherAddress?.toLowerCase() === verified.address!.toLowerCase()).map((manifest) => {
    const parsed = parseBlobPath(manifest.blobPath);
    const totalLines = parsed ? getRowIndexLineCount(parsed.account, parsed.name) : undefined;
    return { ...manifest, hasRowIndex: totalLines !== undefined, totalLines };
  });
  return NextResponse.json({ manifests });
}
