'use client';

import { useEffect, useState } from 'react';

type Micropayment = {
  id: string;
  sender: string;
  channelId: string;
  amount: string;
  status: 'pending' | 'withdrawn';
  createdAt: number;
};

type Channel = {
  sender: string;
  channelId: string;
  balance: string;
  receiverWithdrawn: string;
  expirationMicros: string;
};

type State =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'ok'; micropayments: Micropayment[]; channels: Channel[] };

const SUSD_DECIMALS = 10 ** 8;

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ChannelPanel({ address }: { address: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await fetch(`/api/payments/channels?account=${encodeURIComponent(address)}`);
      if (res.status === 503) {
        setState({ status: 'unconfigured' });
        return;
      }
      if (!res.ok) {
        setState({ status: 'unconfigured' });
        return;
      }
      const data = (await res.json()) as { micropayments?: Micropayment[]; channels?: Channel[] };
      setState({ status: 'ok', micropayments: data.micropayments ?? [], channels: data.channels ?? [] });
    } catch {
      setState({ status: 'unconfigured' });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  async function withdraw(micropayment: Micropayment) {
    setBusy(micropayment.id);
    setError('');
    try {
      const { getConnectedWallet, signAndSubmitTransaction } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) return;
      const res = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver: address, micropaymentId: micropayment.id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Withdraw failed.');
        return;
      }
      const data = (await res.json()) as { payload?: unknown };
      if (!data.payload) {
        setError('Withdraw payload missing.');
        return;
      }
      // Publisher signs the receiver_withdraw tx — publisher pays gas.
      await signAndSubmitTransaction(data.payload as never);
      setError('Withdraw transaction sent — funds land once it confirms.');
      await load();
    } catch {
      setError('Withdraw failed — check the server.');
    } finally {
      setBusy(null);
    }
  }

  const pending = state.status === 'ok' ? state.micropayments.filter((m) => m.status === 'pending') : [];
  const totalPending = pending.reduce((s, m) => s + Number(m.amount), 0) / SUSD_DECIMALS;

  return (
    <div className="overflow-hidden rounded-[16px] border border-[#303030] bg-[#171717]">
      <div className="flex items-center justify-between border-b border-[#262626] px-6 py-5 md:px-7">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#666]">Payment channels</p>
          <p className="mt-1 text-[12px] text-[#888]">
            ShelbyUSD locked in micropayment channels from buyers.
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${
            state.status === 'ok' ? 'border-[#3a4a42] bg-[#7bafa0]/10 text-[#7bafa0]' : 'border-[#303030] text-[#666]'
          }`}
        >
          {state.status === 'loading' ? 'Syncing' : state.status === 'ok' ? 'Live' : 'Preview'}
        </span>
      </div>

      {state.status === 'ok' && pending.length === 0 ? (
        <p className="px-6 py-6 text-[12px] leading-5 text-[#888] md:px-7">
          No payments waiting. When a buyer creates a channel for your listing, the deposit shows up here for withdrawal.
        </p>
      ) : state.status === 'ok' ? (
        <ul className="flex flex-col divide-y divide-[#262626]">
          {pending.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 px-6 py-4 md:px-7">
              <div className="min-w-0">
                <p className="text-[13px] text-[#e5e5e5]">
                  {shortAddress(m.sender)} <span className="text-[#666]">→ you</span>
                </p>
                <p className="mt-0.5 text-[11px] text-[#666]">Channel #{m.channelId}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-[13px] font-medium tabular-nums text-[#7bafa0]">
                  {(Number(m.amount) / SUSD_DECIMALS).toFixed(2)} sUSD
                </span>
                <button
                  type="button"
                  onClick={() => void withdraw(m)}
                  disabled={busy === m.id}
                  className="appearance-none rounded-[10px] border border-[#303030] px-4 py-2 text-[12px] font-medium text-[#a7a7a7] transition-colors hover:border-[#4a4a4a] hover:text-white disabled:opacity-50"
                >
                  {busy === m.id ? 'Preparing…' : 'Withdraw'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-6 py-6 text-[12px] leading-5 text-[#888] md:px-7">
          {state.status === 'unconfigured'
            ? 'Shelby ledger belum dikonfigurasi — channels tidak bisa dibuka.'
            : 'Syncing channels…'}
        </p>
      )}

      {state.status === 'ok' && totalPending > 0 ? (
        <div className="border-t border-[#262626] px-6 py-3 md:px-7">
          <p className="text-[11px] text-[#666]">
            <span className="text-[#a7a7a7]">{totalPending.toFixed(2)} sUSD</span> available to withdraw
          </p>
        </div>
      ) : null}
      {error ? <p className="border-t border-[#262626] px-6 py-3 text-[12px] text-[#e06c5b] md:px-7">{error}</p> : null}
    </div>
  );
}
