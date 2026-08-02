import { NextResponse } from 'next/server';
import { getShelbyClient, isShelbyConfigured, parseBlobPath } from '../../../../lib/shelby';
import { looksLineIndexable } from '../../../../lib/row-index';
import { parseCsvHead } from '../../../../lib/csv-preview';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREVIEW_BYTES = 64 * 1024; // read the first 64 KB
const PREVIEWS_PER_IP = 120;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const b = body as { blobPath?: unknown };
  if (typeof b.blobPath !== 'string') {
    return NextResponse.json({ error: 'blobPath is required.' }, { status: 400 });
  }
  const parsed = parseBlobPath(b.blobPath);
  if (!parsed) {
    return NextResponse.json({ error: 'blobPath must be shelby://{0x-account}/{blob-name}.' }, { status: 400 });
  }
  if (!checkRateLimit(`preview:ip:${clientIp(request)}`, PREVIEWS_PER_IP, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many preview requests — try again later.' },
      { status: 429 },
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
    const metadata = await client.coordination.getBlobMetadata({
      account: parsed.account,
      name: parsed.name as never,
    });
    if (!metadata) {
      return NextResponse.json({ found: false });
    }
    const blob = await client.download({
      account: parsed.account,
      blobName: parsed.name,
      range: { start: 0, end: PREVIEW_BYTES - 1 },
    });
    const chunks: Uint8Array[] = [];
    const reader = blob.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    if (!looksLineIndexable(bytes)) {
      return NextResponse.json({
        found: true,
        binary: true,
        sizeBytes: bytes.length,
      });
    }

    const text = bytes.toString('utf8');
    const head = parseCsvHead(text);
    return NextResponse.json({ found: true, ...head });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Preview failed: ${message}` }, { status: 502 });
  }
}
