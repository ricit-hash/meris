'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CatalogNav from '../catalog/CatalogNav';

type LedgerEntry = {
  id: string;
  manifestId: string;
  blobPath: string;
  buyer: string;
  seller: string;
  amountShelbyUSD: number;
  hash: string;
  kind: 'range' | 'file';
  manifestName?: string;
  records?: number;
  channelId?: string;
  rangeBytes?: number;
  createdAt: number;
};

const fmtDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const fmtBytes = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function formatSize(bytes: number | undefined, kind: string): string {
  if (kind === 'file') return 'full file';
  if (!bytes) return 'range';
  if (bytes >= 1024 ** 2) return `${fmtBytes.format(bytes / 1024 ** 2)} MB`;
  return `${fmtBytes.format(bytes / 1024)} KB`;
}

type DownloadState = Record<string, 'idle' | 'busy' | 'error' | 'ok'>;

export default function PurchasesView({ address }: { address: string }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [downloads, setDownloads] = useState<DownloadState>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/ledger?account=${encodeURIComponent(address)}&role=buyer`);
        const data = (await res.json()) as { entries?: LedgerEntry[] };
        if (!cancelled) setEntries(data.entries ?? []);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function download(entry: LedgerEntry) {
    setDownloads((d) => ({ ...d, [entry.id]: 'busy' }));
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobPath: entry.blobPath,
          start: 0,
          end: entry.kind === 'range' && entry.rangeBytes ? entry.rangeBytes : undefined,
          rangeBytes: entry.kind === 'range' && entry.rangeBytes ? entry.rangeBytes : undefined,
          manifestId: entry.manifestId,
          paymentHash: entry.hash || undefined,
          channelId: entry.channelId || undefined,
          records: entry.records || undefined,
          buyer: address,
        }),
      });
      if (res.status === 503) {
        setDownloads((d) => ({ ...d, [entry.id]: 'error' }));
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        console.warn(data.error);
        setDownloads((d) => ({ ...d, [entry.id]: 'error' }));
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        const a = document.createElement('a');
        a.href = data.url;
        a.download = entry.blobPath.split('/').pop() ?? 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setDownloads((d) => ({ ...d, [entry.id]: 'ok' }));
    } catch {
      setDownloads((d) => ({ ...d, [entry.id]: 'error' }));
    }
  }

  return (
    <div className="ref-shell">
      <CatalogNav />
      <main className="px-8 py-14 md:px-12 md:py-16">
        <div className="ref-rail">
          <p className="ref-label">PURCHASES</p>
          <div>
            <h1 className="text-[clamp(2.2rem,4.4vw,3.6rem)] font-light leading-[0.95] tracking-[-0.05em] text-[#ededed]">
              Datasets you&apos;ve bought.
            </h1>
            <p className="mt-4 max-w-[52ch] text-[14px] leading-7 text-[#999]">
              Every paid and free request is recorded here. Access stays available after the
              listing is delisted.
            </p>

            {!loaded ? (
              <div className="mt-10 h-[5px] w-[140px] overflow-hidden rounded-full bg-[#262626]">
                <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-[#7bafa0]" />
              </div>
            ) : entries.length === 0 ? (
              <div className="mt-10 rounded-[16px] border border-[#303030] bg-[#171717] p-8">
                <p className="text-[14px] text-[#a7a7a7]">No purchases yet.</p>
                <p className="mt-2 max-w-[48ch] text-[12px] leading-5 text-[#888]">
                  Request a slice of any listing in the catalog — paid or free — and it shows up here.
                </p>
                <Link
                  href="/catalog"
                  className="mt-5 inline-block rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] no-underline transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97]"
                >
                  Browse the catalog
                </Link>
              </div>
            ) : (
              <div className="mt-10 overflow-hidden rounded-[16px] border border-[#303030] bg-[#171717]">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#262626] text-[10px] uppercase tracking-[0.1em] text-[#666]">
                      <th className="px-5 py-3 font-medium">Dataset</th>
                      <th className="hidden px-5 py-3 font-medium sm:table-cell">Size</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="hidden px-5 py-3 font-medium md:table-cell">Date</th>
                      <th className="px-5 py-3 text-right font-medium">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const state = downloads[entry.id] ?? 'idle';
                      return (
                        <tr key={entry.id} className="border-b border-[#262626] last:border-b-0">
                          <td className="px-5 py-4">
                            <p className="text-[13px] text-[#e5e5e5]">{entry.manifestName ?? entry.blobPath.split('/').pop()}</p>
                            <p className="mt-0.5 text-[10px] text-[#666]">
                              {entry.kind === 'range' ? `${entry.records ? `${entry.records.toLocaleString()} records · ` : ''}Range slice` : 'Full file'}
                            </p>
                          </td>
                          <td className="hidden px-5 py-4 text-[12px] tabular-nums text-[#a7a7a7] sm:table-cell">
                            {formatSize(entry.rangeBytes, entry.kind)}
                          </td>
                          <td className="px-5 py-4 text-[12px] tabular-nums text-[#a7a7a7]">
                            {entry.amountShelbyUSD > 0 ? (
                              <span className="text-[#7bafa0]">{entry.amountShelbyUSD.toFixed(2)} sUSD</span>
                            ) : (
                              'Free'
                            )}
                          </td>
                          <td className="hidden px-5 py-4 text-[12px] tabular-nums text-[#a7a7a7] md:table-cell">
                            {fmtDate.format(new Date(entry.createdAt))}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {state === 'ok' ? (
                              <span className="text-[12px] text-[#7bafa0]">Download started</span>
                            ) : state === 'error' ? (
                              <span className="text-[12px] text-[#e06c5b]">Unavailable</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void download(entry)}
                                disabled={state === 'busy'}
                                className="appearance-none rounded-[10px] border border-[#303030] px-4 py-2 text-[12px] font-medium text-[#a7a7a7] transition-colors hover:border-[#4a4a4a] hover:text-white disabled:opacity-50"
                              >
                                {state === 'busy' ? 'Preparing…' : 'Download'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="border-t border-[#2b2b2b] px-8 py-8 md:px-12">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[#666]">
          <span>Built on Shelby Protocol</span>
          <Link href="/catalog" className="no-underline hover:text-white">
            Back to catalog
          </Link>
        </div>
      </footer>
    </div>
  );
}
