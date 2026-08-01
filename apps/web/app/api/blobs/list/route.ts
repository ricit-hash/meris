import { NextResponse } from 'next/server';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { listManifests } from '../../../../lib/manifest-store';
import {
  getShelbyClient,
  isShelbyConfigured,
  formatBlobSize,
  getManifestBlobReferences,
  isBlobIndexerSchemaUnavailable,
} from '../../../../lib/shelby';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ListedBlob = {
  name: string;
  sizeBytes: number;
  size: string;
  isWritten: boolean;
  creationMicros?: number;
};

function serializeBlob(blob: {
  name?: string;
  size: bigint | number | string;
  isWritten?: boolean;
  creationMicros?: bigint | number | string;
}): ListedBlob {
  const sizeBytes = Number(blob.size);
  return {
    name: blob.name ?? '',
    sizeBytes,
    size: formatBlobSize(sizeBytes),
    isWritten: blob.isWritten ?? false,
    creationMicros: blob.creationMicros ? Number(blob.creationMicros) : undefined,
  };
}

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
      source: 'indexer',
      blobs: blobs.map(serializeBlob),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    if (isBlobIndexerSchemaUnavailable(message)) {
      const references = getManifestBlobReferences(listManifests(), account);
      const verified = await Promise.all(
        references.map(async (reference): Promise<ListedBlob | null> => {
          try {
            const metadata = await client.coordination.getFullObjectMetadata({
              account: AccountAddress.fromString(reference.account),
              name: reference.name as never,
            });
            return metadata ? serializeBlob({ ...metadata, name: reference.name }) : null;
          } catch {
            return null;
          }
        }),
      );
      const blobs = verified.filter((blob): blob is ListedBlob => blob !== null);

      return NextResponse.json({
        account,
        count: blobs.length,
        source: 'verified-manifests',
        partial: true,
        blobs,
      });
    }
    return NextResponse.json({ error: 'Shelby blob listing is temporarily unavailable.' }, { status: 502 });
  }
}
