import { NextResponse } from 'next/server';
import { buildWithdrawPayload } from '../../../../lib/payments';
import { getMicropaymentApprovals } from '../../../../lib/micropayments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Build the receiver_withdraw payload for a pending micropayment. The publisher
 * (receiver) signs & submits it with their wallet, paying the gas fee.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as { receiver?: unknown; micropaymentId?: unknown };
  if (typeof b.receiver !== 'string' || !b.receiver.startsWith('0x')) {
    return NextResponse.json({ error: 'receiver wallet address is required.' }, { status: 400 });
  }
  if (typeof b.micropaymentId !== 'string' || !b.micropaymentId) {
    return NextResponse.json({ error: 'micropaymentId is required.' }, { status: 400 });
  }

  const approval = getMicropaymentApprovals().find((m) => m.id === b.micropaymentId);
  if (!approval || approval.receiver !== b.receiver) {
    return NextResponse.json({ error: 'Micropayment not found.' }, { status: 404 });
  }

  try {
    const built = buildWithdrawPayload({
      sender: approval.sender,
      receiver: b.receiver,
      channelId: approval.channelId,
    });
    return NextResponse.json({
      micropaymentId: built.micropaymentId,
      channelId: approval.channelId,
      amountOnChain: approval.amount,
      payload: built.payload,
      gasBy: 'receiver',
      note: 'You sign the withdrawal and pay the gas fee with your wallet.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: `Withdraw build failed: ${message}` }, { status: 502 });
  }
}
