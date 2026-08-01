import { NextResponse } from 'next/server';
import { getMicropaymentApprovals } from '../../../../lib/micropayments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List withdrawable micropayments for a publisher account (receiver). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account')?.trim();
  if (!account || !account.startsWith('0x')) {
    return NextResponse.json({ error: 'account wallet address is required.' }, { status: 400 });
  }

  const micro = getMicropaymentApprovals()
    .filter((m) => m.receiver === account)
    .map((m) => ({
      id: m.id,
      sender: m.sender,
      channelId: m.channelId,
      amount: m.amount,
      status: m.status,
      createdAt: m.createdAt,
    }));

  return NextResponse.json({ channels: [], micropayments: micro });
}
