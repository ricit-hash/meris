import { NextResponse } from 'next/server';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { getManifest } from '../../../../../lib/manifest-store';
import { deriveAvailability } from '../../../../../lib/availability';
import { getRowIndexLineCount } from '../../../../../lib/row-index-store';
import { getShelbyClient, isShelbyConfigured, parseBlobPath } from '../../../../../lib/shelby';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manifest = getManifest(id);
  if (!manifest) return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });

  const checkedAt = Date.now();
  const parsed = parseBlobPath(manifest.blobPath);
  const totalLines = parsed?.account ? getRowIndexLineCount(parsed.account, parsed.name) : undefined;
  if (manifest.expiresAt && manifest.expiresAt <= checkedAt) {
    return NextResponse.json({
      status: deriveAvailability({ expiresAt: manifest.expiresAt, now: checkedAt, found: true }),
      checkedAt,
      expiresAt: manifest.expiresAt,
      exactSlicing: totalLines !== undefined,
      totalLines,
    });
  }
  if (!parsed?.account || !parsed.name || !isShelbyConfigured()) {
    return NextResponse.json({
      status: deriveAvailability({ expiresAt: manifest.expiresAt, now: checkedAt, found: false, probeFailed: true }),
      checkedAt,
      expiresAt: manifest.expiresAt,
      exactSlicing: totalLines !== undefined,
      totalLines,
    });
  }

  const client = getShelbyClient();
  if (!client) {
    return NextResponse.json({ status: 'unavailable', checkedAt, expiresAt: manifest.expiresAt, exactSlicing: totalLines !== undefined, totalLines });
  }

  try {
    const metadata = await client.coordination.getBlobMetadata({
      account: AccountAddress.fromString(parsed.account),
      name: parsed.name as never,
    });
    const found = Boolean(metadata);
    return NextResponse.json({
      status: deriveAvailability({ expiresAt: manifest.expiresAt, now: checkedAt, found }),
      checkedAt,
      expiresAt: manifest.expiresAt,
      exactSlicing: totalLines !== undefined,
      totalLines,
      sizeBytes: metadata ? Number(metadata.size) : undefined,
      isWritten: metadata?.isWritten ?? undefined,
    });
  } catch {
    return NextResponse.json({
      status: deriveAvailability({ expiresAt: manifest.expiresAt, now: checkedAt, found: false, probeFailed: true }),
      checkedAt,
      expiresAt: manifest.expiresAt,
      exactSlicing: totalLines !== undefined,
      totalLines,
    });
  }
}
