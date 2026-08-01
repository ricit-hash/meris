'use client';

import { useEffect, useState } from 'react';

type BlobInfo = { name: string; size: string; isWritten: boolean };

type State =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }
  | { status: 'ok'; blobs: BlobInfo[]; partial: boolean };

export default function OnChainBlobs() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getConnectedWallet } = await import('../../lib/wallet/aptos-client');
        const wallet = await getConnectedWallet();
        if (!wallet?.address) {
          if (!cancelled) setState({ status: 'unconfigured' });
          return;
        }
        const res = await fetch(`/api/blobs/list?account=${encodeURIComponent(wallet.address)}`);
        if (res.status === 503) {
          if (!cancelled) setState({ status: 'unconfigured' });
          return;
        }
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          if (!cancelled) setState({ status: 'error', message: data.error ?? 'Failed to list blobs.' });
          return;
        }
        const data = (await res.json()) as { blobs?: BlobInfo[]; partial?: boolean };
        if (!cancelled) setState({ status: 'ok', blobs: data.blobs ?? [], partial: data.partial === true });
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Shelby list failed.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="rounded-[16px] border border-[#303030] bg-[#171717] p-6">
        <p className="ref-label">ON-CHAIN BLOBS</p>
        <p className="mt-3 text-[13px] text-[#888]">Querying the Shelby network…</p>
      </div>
    );
  }

  if (state.status === 'unconfigured') {
    return (
      <div className="rounded-[16px] border border-[#303030] bg-[#171717] p-6">
        <p className="ref-label">ON-CHAIN BLOBS</p>
        <p className="mt-3 text-[13px] leading-6 text-[#888]">
          Shelby backend belum dikonfigurasi — listing ini local preview. Tambah <code className="rounded bg-[#0a0a0a] px-1.5 py-0.5 font-mono text-[12px] text-[#7bafa0]">SHELBY_API_KEY</code> di env server untuk live.
        </p>
      </div>
    );
  }


  if (state.status === 'error') {
    return (
      <div className="rounded-[16px] border border-[#303030] bg-[#171717] p-6">
        <p className="ref-label">ON-CHAIN BLOBS</p>
        <p className="mt-3 text-[13px] leading-6 text-[#e06c5b]">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[#303030] bg-[#171717] p-6">
      <div className="flex items-center justify-between">
        <p className="ref-label">ON-CHAIN BLOBS</p>
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-[#7bafa0]">
          <i className="h-[5px] w-[5px] rounded-full bg-[#7bafa0]" />
          {state.partial ? 'Listings verified' : 'Shelby live'}
        </span>
      </div>
      {state.blobs.length === 0 ? (
        <p className="mt-3 text-[13px] leading-6 text-[#888]">
          {state.partial
            ? 'No published Meris listings reference a verified Shelby blob yet.'
            : 'No blobs registered on this account yet.'}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {state.blobs.map((blob) => (
            <li key={blob.name} className="rounded-[10px] border border-[#262626] bg-[#0a0a0a] px-3 py-2.5">
              <p className="truncate font-mono text-[12px] text-[#e5e5e5]" title={blob.name}>
                {blob.name}
              </p>
              <p className="mt-1 text-[11px] text-[#666]">
                {blob.size} · {blob.isWritten ? 'committed' : 'pending'}
              </p>
            </li>
          ))}
        </ul>
      )}
      {state.partial && state.blobs.length > 0 ? (
        <p className="mt-3 text-[11px] leading-5 text-[#666]">
          Showing blobs referenced by your Meris listings and verified directly on-chain.
        </p>
      ) : null}
    </div>
  );
}
