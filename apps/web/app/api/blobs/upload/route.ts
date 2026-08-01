import { NextResponse } from 'next/server';
import {
  getShelbyClient,
  getShelbyAccount,
  isShelbyConfigured,
  formatBlobSize,
} from '../../../../lib/shelby';
import { buildLineEnds, looksLineIndexable } from '../../../../lib/row-index';
import { setRowIndex } from '../../../../lib/row-index-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(request: Request) {
  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }
  const account = getShelbyAccount();
  if (!account) {
    return NextResponse.json(
      { error: 'SHELBY_ACCOUNT_PRIVATE_KEY is not configured.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  const file = form.get('file');
  const blobNameRaw = form.get('blobName');
  if (!(file instanceof File) || typeof blobNameRaw !== 'string' || !blobNameRaw.trim()) {
    return NextResponse.json({ error: 'file and blobName are required.' }, { status: 400 });
  }

  const blobName = blobNameRaw.trim().replace(/^\/+/, '');
  if (!/^[a-zA-Z0-9._\-\/]+$/.test(blobName)) {
    return NextResponse.json(
      { error: 'blobName may only contain letters, digits, . _ - /' },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds the 100 MB limit for this phase.' },
      { status: 413 },
    );
  }

  const client = getShelbyClient();
  if (!client) {
    return NextResponse.json({ error: 'Shelby client failed to initialize.' }, { status: 503 });
  }

  try {
    const expirationMicros = Date.now() * 1000 + 90 * 24 * 60 * 60 * 1_000_000; // 90 hari
    await client.upload({ blobData: bytes, signer: account, blobName, expirationMicros });
    const accountAddress = account.accountAddress.toString();

    // Build a line index for exact row-boundary slicing. Binary files and
    // single-line files are skipped — they keep byte-proportional fallback.
    let lineCount: number | undefined;
    if (looksLineIndexable(bytes)) {
      const lineEnds = buildLineEnds(bytes);
      setRowIndex(accountAddress, blobName, lineEnds, bytes.length);
      lineCount = lineEnds.length;
    }

    return NextResponse.json({
      ok: true,
      account: accountAddress,
      name: blobName,
      sizeBytes: bytes.length,
      size: formatBlobSize(bytes.length),
      blobPath: `shelby://${accountAddress}/${blobName}`,
      lineCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Shelby upload failed: ${message}` }, { status: 502 });
  }
}
