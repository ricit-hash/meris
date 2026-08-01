'use client';

import { useEffect, useState } from 'react';

type LedgerEntry = {
  id: string;
  manifestId: string;
  blobPath: string;
  buyer: string;
  seller: string;
  amountShelbyUSD: number;
  hash: string;
  kind: 'range' | 'file';
  createdAt: number;
};

type State =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'ok'; entries: LedgerEntry[] };

function shortAddress(addr: string): string {
  if (!addr.startsWith('0x')) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function LedgerRevenue({ address }: { address: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/ledger?account=${encodeURIComponent(address)}&role=seller`);
        if (res.status === 503) {
          if (!cancelled) setState({ status: 'unconfigured' });
          return;
        }
        if (!res.ok) {
          if (!cancelled) setState({ status: 'unconfigured' });
          return;
        }
        const data = (await res.json()) as { entries?: LedgerEntry[] };
        if (!cancelled) setState({ status: 'ok', entries: data.entries ?? [] });
      } catch {
        if (!cancelled) setState({ status: 'unconfigured' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const revenue = state.status === 'ok' ? state.entries.reduce((s, e) => s + e.amountShelbyUSD, 0) : 0;
  const paidCount = state.status === 'ok' ? state.entries.filter((e) => e.amountShelbyUSD > 0).length : 0;
  const totalCount = state.status === 'ok' ? state.entries.length : 0;

  return (
    <div>
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#666]">Total revenue</p>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${
            state.status === 'ok' ? 'border border-[#3a4a42] bg-[#7bafa0]/10 text-[#7bafa0]' : 'border border-[#303030] text-[#666]'
          }`}
        >
          {state.status === 'loading' ? 'Syncing' : state.status === 'ok' ? 'Live' : 'Preview'}
        </span>
      </div>
      <p className="mt-4 text-[clamp(2.2rem,3.4vw,3rem)] font-light leading-none tabular-nums tracking-[-0.04em] text-[#ededed]">
        {revenue.toFixed(2)} <span className="text-[15px] font-normal text-[#666]">sUSD</span>
      </p>
      <p className="mt-3 max-w-[42ch] text-[12px] leading-5 text-[#888]">
        {state.status === 'unconfigured'
          ? 'Shelby ledger belum dikonfigurasi — angka ini local preview.'
          : totalCount === 0
            ? 'No sales yet. Paid range access records every purchase here.'
            : `${paidCount} paid ${paidCount === 1 ? 'sale' : 'sales'} · ${totalCount} total requests.`}
      </p>
      <div className="mt-5 flex gap-8 border-t border-[#262626] pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#666]">Datasets sold</p>
          <p className="mt-1 text-[16px] font-light tabular-nums text-[#e5e5e5]">{paidCount}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#666]">Range requests</p>
          <p className="mt-1 text-[16px] font-light tabular-nums text-[#e5e5e5]">{totalCount}</p>
        </div>
      </div>

      {state.status === 'ok' && state.entries.length > 0 ? (
        <div className="mt-5 border-t border-[#262626] pt-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#666]">Recent sales</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {state.entries.slice(0, 4).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12px] text-[#e5e5e5]" title={entry.blobPath}>
                    {entry.blobPath.split('/').pop()}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#666]">{shortAddress(entry.buyer)}</p>
                </div>
                <span
                  className={`shrink-0 text-[12px] font-medium tabular-nums ${
                    entry.amountShelbyUSD > 0 ? 'text-[#7bafa0]' : 'text-[#666]'
                  }`}
                >
                  {entry.amountShelbyUSD > 0 ? `${entry.amountShelbyUSD.toFixed(2)} sUSD` : 'Free'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
