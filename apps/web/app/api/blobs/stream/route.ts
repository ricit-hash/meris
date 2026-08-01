import { NextResponse } from 'next/server';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { getShelbyClient, isShelbyConfigured } from '../../../../lib/shelby';
import { verifyStream } from '../../../../lib/signed-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account')?.trim() ?? '';
  const name = searchParams.get('name')?.trim() ?? '';
  const startRaw = searchParams.get('start');
  const endRaw = searchParams.get('end');
  const expRaw = searchParams.get('exp');
  const sig = searchParams.get('sig') ?? '';

  if (!account.startsWith('0x') || !name) {
    return NextResponse.json({ error: 'account (0x…) and name are required.' }, { status: 400 });
  }

  const start = Number(startRaw ?? 0);
  if (!Number.isFinite(start) || start < 0) {
    return NextResponse.json({ error: 'start must be a non-negative integer.' }, { status: 400 });
  }
  const end = endRaw !== null && endRaw !== '' ? Number(endRaw) : undefined;
  if (end !== undefined && (!Number.isFinite(end) || end <= start)) {
    return NextResponse.json({ error: 'end must be an integer greater than start.' }, { status: 400 });
  }
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= 0) {
    return NextResponse.json({ error: 'exp is required.' }, { status: 400 });
  }

  // Access control: every stream request needs a valid HMAC signature.
  const valid = verifyStream(sig, {
    account,
    name,
    start,
    end,
    exp,
  });
  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired stream signature.' }, { status: 401 });
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
    const blob = await client.download({
      account: AccountAddress.fromString(account),
      blobName: name,
      range: { start, end },
    });

    const stream = blob.readable as unknown as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(blob.contentLength ?? end ?? 0),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name.split('/').pop() ?? 'blob')}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Shelby download failed: ${message}` }, { status: 502 });
  }
}
