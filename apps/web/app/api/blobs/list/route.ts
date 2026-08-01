import { NextResponse } from 'next/server';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { getShelbyClient, isShelbyConfigured, formatBlobSize, isBlobIndexerSchemaUnavailable } from '../../../../lib/shelby';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account')?.trim() ?? '';
  if (!account.startsWith('0x')) {
    return NextResponse.json({ error: 'account (0x…) is required.' }, { status: 400 });
  }

  const client = getShelbyClient();
  if (!client) {
    return NextResponse.json({ error: 'Shelby client failed to initialize.' }, { status: 503 });
  }

  try {
    const blobs = await client.coordination.getAccountBlobs({
      account: AccountAddress.fromString(account),
    });

    return NextResponse.json({
      account,
      count: blobs.length,
      blobs: blobs.map((b) => ({
        name: b.name ?? '',
        sizeBytes: Number(b.size),
        size: formatBlobSize(Number(b.size)),
        isWritten: b.isWritten ?? false,
        creationMicros: b.creationMicros ? Number(b.creationMicros) : undefined,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    if (isBlobIndexerSchemaUnavailable(message)) {
      return NextResponse.json({
        indexerUnavailable: true,
        error: 'Shelby blob index is temporarily unavailable. Published manifests remain accessible.',
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Shelby blob listing is temporarily unavailable.' }, { status: 502 });
  }
}
