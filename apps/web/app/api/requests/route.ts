import { NextResponse } from 'next/server';
import { isShelbyConfigured, parseBlobPath } from '../../../lib/shelby';
import { signStream } from '../../../lib/signed-url';
import { verifyTransaction, confirmChannelAndBuildApproval, getMicropaymentClient } from '../../../lib/payments';
import { getManifest } from '../../../lib/manifest-store';
import { addLedgerEntry } from '../../../lib/ledger';
import { resolveEndOffset, parseByteSize, declaredSliceEndBytes } from '../../../lib/row-index';
import { getRowIndex } from '../../../lib/row-index-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGN_TTL_MS = 5 * 60 * 1000; // 5 menit

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as {
    blobPath?: unknown;
    start?: unknown;
    end?: unknown;
    records?: unknown;
    rangeBytes?: unknown;
    manifestId?: unknown;
    createHash?: unknown;
    pendingKeyId?: unknown;
    buyer?: unknown;
  };
  if (typeof b.blobPath !== 'string') {
    return NextResponse.json({ error: 'blobPath is required.' }, { status: 400 });
  }

  const parsed = parseBlobPath(b.blobPath);
  if (!parsed || !parsed.account.startsWith('0x') || !parsed.name) {
    return NextResponse.json(
      { error: 'blobPath must be shelby://{0x-account}/{blob-name}.' },
      { status: 400 },
    );
  }

  const start = typeof b.start === 'number' && Number.isFinite(b.start) ? Math.max(0, Math.floor(b.start)) : 0;
  const endRaw = typeof b.end === 'number' && Number.isFinite(b.end) ? Math.max(start + 1, Math.floor(b.end)) : undefined;

  // Exact row-boundary slicing when the blob has a line index and the buyer
  // requested a record count; otherwise keep the byte range as-is.
  const records =
    typeof b.records === 'number' && Number.isFinite(b.records) ? Math.max(0, Math.floor(b.records)) : undefined;
  const resolved = resolveEndOffset({
    lineEnds: getRowIndex(parsed.account, parsed.name),
    records,
    end: endRaw,
  });
  let end = resolved.end;
  let endExact = resolved.exact;

  // Paid listing: wajib manifest + channel create yang sukses on-chain.
  let paidManifest: ReturnType<typeof getManifest> | null = null;
  if (typeof b.manifestId === 'string' && b.manifestId.startsWith('m-')) {
    const manifest = getManifest(b.manifestId);
    if (!manifest) {
      return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
    }
    paidManifest = manifest;
    if (manifest.priceShelbyUSD > 0) {
      if (typeof b.buyer !== 'string' || !b.buyer.startsWith('0x')) {
        return NextResponse.json({ error: 'buyer wallet address is required.' }, { status: 400 });
      }
      const channelClient = getMicropaymentClient();
      if (!channelClient) {
        return NextResponse.json(
          { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
          { status: 503 },
        );
      }

      if (typeof b.pendingKeyId === 'string') {
        // New channel: buyer signed create_channel; verify it and confirm funding.
        if (typeof b.createHash !== 'string' || !b.createHash) {
          return NextResponse.json({ error: 'createHash is required when creating a channel.' }, { status: 400 });
        }
        try {
          await verifyTransaction(b.createHash);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown';
          if (message.includes('not configured')) {
            return NextResponse.json({ error: message }, { status: 503 });
          }
          return NextResponse.json({ error: `Channel creation not verified on-chain: ${message}` }, { status: 502 });
        }
        try {
          const amountOnChain = BigInt(Math.round(manifest.priceShelbyUSD * 10 ** 8)).toString();
          const confirmed = await confirmChannelAndBuildApproval({
            sender: b.buyer,
            receiver: manifest.publisherAddress,
            minAmountOnChain: amountOnChain,
            pendingKeyId: b.pendingKeyId,
          });
          if (!confirmed.funded) {
            return NextResponse.json(
              { error: 'Channel was created but the deposit is below the listing price.' },
              { status: 402 },
            );
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown';
          return NextResponse.json({ error: `Channel confirmation failed: ${message}` }, { status: 502 });
        }
      } else {
        // Existing channel: server verifies funding (reuse path from quote).
        const { AccountAddress } = await import('@aptos-labs/ts-sdk');
        const channels = await channelClient.getChannelInfo({
          sender: AccountAddress.fromString(b.buyer),
          receiver: AccountAddress.fromString(manifest.publisherAddress),
        });
        const min = BigInt(Math.round(manifest.priceShelbyUSD * 10 ** 8));
        const funded = channels.some((c) => c.balance >= min);
        if (!funded) {
          return NextResponse.json(
            { error: 'No funded channel for this purchase — request a new quote.' },
            { status: 402 },
          );
        }
      }
    }
  }

  // Catat transaksi ke ledger (free: amount 0, hash kosong).
  if (paidManifest && typeof b.buyer === 'string' && b.buyer.startsWith('0x')) {
    addLedgerEntry({
      manifestId: paidManifest.id,
      blobPath: paidManifest.blobPath,
      buyer: b.buyer,
      seller: paidManifest.publisherAddress || 'unknown',
      amountShelbyUSD: paidManifest.priceShelbyUSD,
      hash: typeof b.createHash === 'string' ? b.createHash : '',
      kind: paidManifest.kind,
      rangeBytes: typeof b.rangeBytes === 'number' && Number.isFinite(b.rangeBytes) ? Math.max(0, Math.floor(b.rangeBytes)) : undefined,
    });
  }

  // Unindexed paid listings: cap the byte range at the declared slice so a
  // buyer can never request more bytes than the records they paid for.
  let endClamped = false;
  if (
    !endExact &&
    records !== undefined &&
    records > 0 &&
    paidManifest &&
    paidManifest.records > 0
  ) {
    const declared = parseByteSize(paidManifest.fileSize);
    if (declared > 0) {
      const cap = declaredSliceEndBytes(declared, records, paidManifest.records);
      if (end === undefined || end > cap) endClamped = true;
      end = end !== undefined ? Math.min(end, cap) : cap;
      if (end <= start) {
        return NextResponse.json(
          { error: 'Requested range is outside the declared listing size.' },
          { status: 400 },
        );
      }
    }
  }

  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }

  const exp = Date.now() + SIGN_TTL_MS;
  const sig = signStream({ account: parsed.account, name: parsed.name, start, end, exp });
  if (!sig) {
    return NextResponse.json(
      { error: 'SHELBY_STREAM_SECRET is not configured.' },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    account: parsed.account,
    name: parsed.name,
    start: String(start),
    exp: String(exp),
    sig,
  });
  if (end !== undefined) params.set('end', String(end));

  return NextResponse.json({ url: `/api/blobs/stream?${params.toString()}`, endExact, endClamped });
}
