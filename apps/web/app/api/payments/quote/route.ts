import { NextResponse } from 'next/server';
import { getManifest } from '../../../../lib/manifest-store';
import { parseBlobPath } from '../../../../lib/shelby';
import { prepareChannelCreation, getMicropaymentClient } from '../../../../lib/payments';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { AccountAddress } from '@aptos-labs/ts-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QUOTES_PER_ADDRESS = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as { manifestId?: unknown; blobPath?: unknown; start?: unknown; end?: unknown; buyer?: unknown };
  if (typeof b.manifestId !== 'string' || !b.manifestId.startsWith('m-')) {
    return NextResponse.json(
      { error: 'Payments require a published manifest (m-*). Publish the dataset first.' },
      { status: 400 },
    );
  }
  const manifest = getManifest(b.manifestId);
  if (!manifest) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }
  if (manifest.priceShelbyUSD === 0) {
    return NextResponse.json({ free: true, message: 'Free listing — no payment required.' });
  }
  if (!parseBlobPath(manifest.blobPath)?.account.startsWith('0x')) {
    return NextResponse.json(
      { error: 'This listing has no real Shelby blob — sample data can\'t be purchased.' },
      { status: 400 },
    );
  }
  if (typeof b.buyer !== 'string' || !b.buyer.startsWith('0x')) {
    return NextResponse.json({ error: 'buyer wallet address is required.' }, { status: 400 });
  }
  if (!checkRateLimit(`quote:${b.buyer.toLowerCase()}`, QUOTES_PER_ADDRESS, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: `Too many quotes — try again later (limit ${QUOTES_PER_ADDRESS}/hour).` },
      { status: 429 },
    );
  }
  if (!manifest.publisherAddress) {
    return NextResponse.json(
      { error: 'Publisher wallet address is missing on this listing.' },
      { status: 400 },
    );
  }

  // Proportional price with a 1 sUSD minimum, matching the buyer UI.
  let slicePrice = manifest.priceShelbyUSD;
  if (manifest.kind === 'range') {
    const totalRecords = manifest.records;
    const start = typeof b.start === 'number' && Number.isFinite(b.start) ? Math.max(0, Math.floor(b.start)) : 0;
    const endRaw = typeof b.end === 'number' && Number.isFinite(b.end) ? Math.floor(b.end) : undefined;
    const wanted = endRaw !== undefined ? Math.min(Math.max(1, endRaw - start), totalRecords) : 1;
    const pct = totalRecords > 0 ? wanted / totalRecords : 0;
    slicePrice = Math.max(1, manifest.priceShelbyUSD * pct);
  }
  slicePrice = Math.round(slicePrice * 100) / 100;

  const amountOnChain = BigInt(Math.round(slicePrice * 10 ** 8)).toString();

  try {
    const client = getMicropaymentClient();
    if (!client) {
      return NextResponse.json(
        { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
        { status: 503 },
      );
    }

    // Reuse an existing funded channel for this sender->receiver pair.
    const channels = await client.getChannelInfo({
      sender: AccountAddress.fromString(b.buyer),
      receiver: AccountAddress.fromString(manifest.publisherAddress),
    });
    const funded = channels.find(
      (c) => c.fungibleAssetAddress.toString().toLowerCase() === '0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1' && c.balance >= BigInt(amountOnChain),
    );
    if (funded) {
      return NextResponse.json({
        manifestId: manifest.id,
        channelId: funded.paymentChannelId.toString(),
        amountShelbyUSD: slicePrice,
        amountOnChain,
        receiver: manifest.publisherAddress,
        needsCreate: false,
        needsInitialize: false,
        gasBy: 'buyer',
        note: 'Existing channel has enough balance — request only.',
      });
    }

    // Does the buyer need to initialize payment channels first?
    let needsInitialize = false;
    try {
      await client.getChannelInfo({ sender: AccountAddress.fromString(b.buyer) });
    } catch {
      needsInitialize = true;
    }

    const quote = await prepareChannelCreation({
      sender: b.buyer,
      receiver: manifest.publisherAddress,
      amountOnChain,
    });
    return NextResponse.json({
      manifestId: manifest.id,
      amountShelbyUSD: quote.amountShelbyUSD,
      amountOnChain: quote.amountOnChain,
      receiver: quote.receiver,
      sender: quote.sender,
      fungibleAssetAddress: quote.fungibleAssetAddress,
      expirationMicros: quote.expirationMicros,
      payload: quote.payload,
      pendingKeyId: quote.pendingKeyId,
      needsCreate: true,
      needsInitialize,
      initializePayload: needsInitialize
        ? {
            function: '0x1ae7275148bf6ef742b658fd9cbcc2e094201606f4a7bc707bab0201da8043ee::micropayments::initialize_payment_channels',
            typeArguments: [],
            functionArguments: [],
          }
        : undefined,
      gasBy: 'buyer',
      note: 'You sign the channel creation (deposit) and pay the gas fee with your wallet.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown payment error';
    if (message.includes('not configured')) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: `Payment quote failed: ${message}` }, { status: 502 });
  }
}
