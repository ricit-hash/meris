import { NextResponse } from 'next/server';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { getShelbyClient, isShelbyConfigured, parseBlobPath, formatBlobSize } from '../../../../lib/shelby';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const blobPath = (body as { blobPath?: unknown })?.blobPath;
  if (typeof blobPath !== 'string' || !blobPath.trim()) {
    return NextResponse.json({ error: 'blobPath is required (shelby://account/name).' }, { status: 400 });
  }

  const parsed = parseBlobPath(blobPath);
  if (!parsed || !parsed.account.startsWith('0x')) {
    return NextResponse.json(
      { error: 'blobPath must be shelby://{0x-account}/{blob-name} with an on-chain account address.' },
      { status: 400 },
    );
  }

  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }

  const client = getShelbyClient();
  if (!client) {
    return NextResponse.json({ error: 'Shelby client failed to initialize.' }, { status: 503 });
  }

  try {
    const metadata = await client.coordination.getFullObjectMetadata({
      account: AccountAddress.fromString(parsed.account),
      name: parsed.name as never,
    });

    if (!metadata) {
      return NextResponse.json(
        { error: 'Blob not found on the Shelby network. Check the account address and blob name.', found: false },
        { status: 404 },
      );
    }

    return NextResponse.json({
      found: true,
      account: parsed.account,
      name: parsed.name,
      sizeBytes: Number(metadata.size),
      size: formatBlobSize(Number(metadata.size)),
      owner: metadata.owner?.toString?.() ?? String(metadata.owner),
      isWritten: metadata.isWritten ?? true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Shelby verify failed: ${message}` }, { status: 502 });
  }
}
