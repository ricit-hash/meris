import { NextResponse } from 'next/server';
import { listLedger } from '../../../lib/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account')?.trim() ?? undefined;
  const roleRaw = searchParams.get('role')?.trim();
  const role = roleRaw === 'buyer' || roleRaw === 'seller' ? roleRaw : undefined;

  const entries = listLedger(account ? { account, role } : undefined);
  return NextResponse.json({ entries });
}
