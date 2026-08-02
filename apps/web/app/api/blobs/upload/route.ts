import { NextResponse } from 'next/server';
import {
  getShelbyClient,
  getShelbyAccount,
  isShelbyConfigured,
  formatBlobSize,
} from '../../../../lib/shelby';
import { buildLineEnds, looksLineIndexable } from '../../../../lib/row-index';
import { setRowIndex } from '../../../../lib/row-index-store';
import { recoverPublisherAddress } from '../../../../lib/wallet-auth';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit';
import { isAllowedOrigin } from '../../../../lib/origin';
import { parseExpiryDays, blobExpiresAtMs } from '../../../../lib/blob-expiry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
const UPLOADS_PER_ADDRESS = 10;
const UPLOADS_PER_IP = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_EXPIRY_DAYS = Number(process.env.BLOB_EXPIRATION_DAYS ?? 90);
const MAX_EXPIRY_DAYS = Number(process.env.MAX_BLOB_EXPIRATION_DAYS ?? 365);

export async function POST(request: Request) {
  // CSRF: multipart uploads are a CORS "simple request" — block cross-site
  // form posts that would burn the server's Shelby gas without asking the user.
  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return NextResponse.json({ error: 'Cross-origin uploads are not allowed.' }, { status: 403 });
  }

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
  const publicKeyHexRaw = form.get('publicKeyHex');
  const signatureRaw = form.get('signature');
  const fullMessageRaw = form.get('fullMessage');
  if (!(file instanceof File) || typeof blobNameRaw !== 'string' || !blobNameRaw.trim()) {
    return NextResponse.json({ error: 'file and blobName are required.' }, { status: 400 });
  }

  const blobName = blobNameRaw.trim().replace(/^\/+/, '');
  if (!/^[a-zA-Z0-9._\-/]+$/.test(blobName)) {
    return NextResponse.json(
      { error: 'blobName may only contain letters, digits, . _ - /' },
      { status: 400 },
    );
  }

  // Wallet-proof: uploads burn the server's Shelby gas, so the caller must be
  // a real wallet holder who signs meris:upload:{blobName}:{expiry}.
  const verified = recoverPublisherAddress({
    action: 'upload',
    context: blobName,
    publicKeyHex: typeof publicKeyHexRaw === 'string' ? publicKeyHexRaw : '',
    signature: typeof signatureRaw === 'string' ? signatureRaw : '',
    fullMessage: typeof fullMessageRaw === 'string' ? fullMessageRaw : '',
  });
  if (!verified.ok || !verified.address) {
    return NextResponse.json(
      {
        error: `Upload requires a wallet signature (${verified.reason ?? 'invalid signature'}).`,
        ...(verified.sigInfo ? { sigInfo: verified.sigInfo } : {}),
      },
      { status: 401 },
    );
  }
  if (!checkRateLimit(`upload:${verified.address}`, UPLOADS_PER_ADDRESS, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: `Too many uploads — try again later (limit ${UPLOADS_PER_ADDRESS}/hour per wallet).` },
      { status: 429 },
    );
  }
  if (!checkRateLimit(`upload:ip:${clientIp(request)}`, UPLOADS_PER_IP, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: `Too many uploads from this address — try again later (limit ${UPLOADS_PER_IP}/hour).` },
      { status: 429 },
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
    // Expiry: user choice when sent (capped), else the server default.
    const expiryDays =
      parseExpiryDays(form.get('expiryDays'), MAX_EXPIRY_DAYS) ?? DEFAULT_EXPIRY_DAYS;
    const now = Date.now();
    const expirationMicros = now * 1000 + expiryDays * 24 * 60 * 60 * 1_000_000;
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
      expiresAt: blobExpiresAtMs(now, expiryDays),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Shelby upload failed: ${message}` }, { status: 502 });
  }
}
