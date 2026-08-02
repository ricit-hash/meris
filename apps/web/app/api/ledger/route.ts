import { NextResponse } from 'next/server';
import { listLedger } from '../../../lib/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account')?.trim();
  if (!account || !/^0x[0-9a-f]{1,64}$/i.test(account)) {
    return NextResponse.json({ error: 'A valid wallet account is required.' }, { status: 400 });
  }
  const roleRaw = searchParams.get('role')?.trim();
  const role = roleRaw === 'buyer' || roleRaw === 'seller' ? roleRaw : undefined;

  const entries = listLedger(account ? { account, role } : undefined);
  return NextResponse.json({ entries });
}
