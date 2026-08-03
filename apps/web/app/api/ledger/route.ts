import { NextResponse } from 'next/server';
import { listLedger } from '../../../lib/ledger';
import { recoverPublisherAddress } from '../../../lib/wallet-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { account?: unknown; role?: unknown; publicKeyHex?: unknown; signature?: unknown; fullMessage?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const account = typeof body.account === 'string' ? body.account.trim().toLowerCase() : '';
  if (!account || !/^0x[0-9a-f]{1,64}$/i.test(account)) return NextResponse.json({ error: 'A valid wallet account is required.' }, { status: 400 });
  const role = body.role === 'buyer' || body.role === 'seller' ? body.role : undefined;
  const verified = recoverPublisherAddress({ action: 'ledger', context: account, publicKeyHex: typeof body.publicKeyHex === 'string' ? body.publicKeyHex : '', signature: typeof body.signature === 'string' ? body.signature : '', fullMessage: typeof body.fullMessage === 'string' ? body.fullMessage : '' });
  if (!verified.ok || verified.address !== account) return NextResponse.json({ error: `Wallet proof does not match account (${verified.reason ?? 'invalid signature'}).` }, { status: 403 });
  return NextResponse.json({ entries: listLedger({ account, role }) });
}