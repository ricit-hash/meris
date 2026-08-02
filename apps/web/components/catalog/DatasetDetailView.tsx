'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CatalogNav from './CatalogNav';
import { getSampleDataset, formatShelbyPrice, type SampleDataset } from './sample-data';
import { getDatasets, draftToListing, type CatalogListing } from '../../lib/datasets';
import { getProfile } from '../../lib/profile';
import type { Manifest } from '../../lib/manifest-store';

// Lazy-loaded: interactive buyer panel, split into its own chunk.
const RangeRequest = dynamic(() => import('./RangeRequest'), { ssr: true });

const fmt = new Intl.NumberFormat('en-US');

export default function DatasetDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<CatalogListing | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [delistState, setDelistState] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const [delistError, setDelistError] = useState('');
  const [rowIndexed, setRowIndexed] = useState(false);
  const [totalLines, setTotalLines] = useState<number | undefined>(undefined);
  const [preview, setPreview] = useState<{ columns: string[]; rows: string[][]; truncated: boolean } | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const [votes, setVotes] = useState(0);
  const [downloaded, setDownloaded] = useState(0);

  const sample: (SampleDataset & { isMine: false }) | undefined = useMemo(
    () => (getSampleDataset(id) ? { ...getSampleDataset(id)!, isMine: false } : undefined),
    [id],
  );

  useEffect(() => {
    const profile = getProfile();
    const found = getDatasets().find((d) => d.id === id);
    if (found) {
      setDraft(draftToListing(found, profile?.username ?? 'publisher'));
      setLoaded(true);
      return;
    }
    // Server-side manifest (Fase B)
    if (id.startsWith('m-')) {
      let cancelled = false;
      void (async () => {
        try {
          const res = await fetch(`/api/manifests/${id}`);
          if (cancelled) return;
          if (!res.ok) {
            setLoaded(true);
            return;
          }
          const data = (await res.json()) as { manifest?: Manifest; hasRowIndex?: boolean; totalLines?: number };
          if (cancelled || !data.manifest) {
            setLoaded(true);
            return;
          }
          const m = data.manifest;
          setRowIndexed(data.hasRowIndex === true);
          setTotalLines(data.totalLines);
          setDraft({
            id: m.id,
            title: m.name,
            publisher: m.publisher || (profile?.username ?? 'publisher'),
            updated: 'Just now',
            description: m.description || 'No description provided yet.',
            tags: [m.category],
            format: m.format,
            size: m.fileSize,
            license: m.license,
            range: m.kind === 'file' ? 'Full file' : 'Range-ready',
            requests: m.downloads ?? 0,
            downloads: m.downloads ?? 0,
            votes: m.votes ?? 0,
            priceShelbyUSD: m.priceShelbyUSD,
            blobPath: m.blobPath,
            records: m.records,
            uploadedAt: m.uploadedAt,
            updatedDays: 0,
            isMine: m.publisher === (profile?.username ?? 'publisher'),
            kind: m.kind,
          });
          setVotes(m.votes ?? 0);
          setDownloaded(m.downloads ?? 0);
          setLoaded(true);
        } catch {
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    setLoaded(true);
  }, [id]);

  const listing = sample ?? (loaded ? draft : null);

  // Data preview: read the first bytes of the blob and render the CSV head.
  // This is the "inspect before you pay" promise — a tiny range, not the file.
  useEffect(() => {
    if (!listing || !listing.blobPath.startsWith('shelby://')) return;
    let cancelled = false;
    setPreviewState('loading');
    void (async () => {
      try {
        const res = await fetch('/api/blobs/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobPath: listing.blobPath }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setPreviewState('fail');
          return;
        }
        const data = (await res.json()) as {
          found?: boolean;
          columns?: string[];
          rows?: string[][];
          truncated?: boolean;
        };
        if (!data.found || !data.columns || !data.rows) {
          setPreviewState('fail');
          return;
        }
        setPreview({ columns: data.columns, rows: data.rows, truncated: data.truncated === true });
        setPreviewState('ok');
      } catch {
        if (!cancelled) setPreviewState('fail');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listing?.blobPath]);

  async function handleVote(direction: 1 | -1) {
    if (!listing || !listing.id.startsWith('m-')) return;
    try {
      const { getConnectedWallet, signMessageDetailed } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) {
        router.push('/gate');
        return;
      }
      const expiry = Date.now() + 120_000;
      const signed = await signMessageDetailed(`meris:vote:${listing.id}:${expiry}`);
      const res = await fetch(`/api/manifests/${listing.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote: direction,
          publicKeyHex: wallet.publicKey,
          signature: signed.signature,
          fullMessage: signed.fullMessage,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { votes?: number };
      if (typeof data.votes === 'number') setVotes(data.votes);
    } catch {
      // ignore — voting is best-effort
    }
  }

  async function handleDelist() {
    if (delistState !== 'confirm' || !listing) return;
    setDelistState('busy');
    setDelistError('');
    try {
      const { getConnectedWallet, signMessageDetailed } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) {
        router.push('/gate');
        return;
      }
      // Ownership proof: wallet signs meris:delist:{id}:{expiry}; the server
      // derives the address from the public key and verifies the signature.
      const expiry = Date.now() + 120_000;
      const signed = await signMessageDetailed(`meris:delist:${listing.id}:${expiry}`);
      const res = await fetch(`/api/manifests/${listing.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: wallet.address,
          publicKeyHex: wallet.publicKey,
          signature: signed.signature,
          fullMessage: signed.fullMessage,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDelistError(data.error ?? 'Delist failed.');
        setDelistState('idle');
        return;
      }
      router.push('/catalog');
    } catch {
      setDelistError('Delist failed — check the server.');
      setDelistState('idle');
    }
  }

  if (!listing) {
    return (
      <div className="ref-shell">
        <CatalogNav />
        <main className="flex min-h-[50vh] items-center justify-center px-8">
          <div className="text-center">
            <p className="ref-label">DATASET NOT FOUND</p>
            <p className="mt-4 text-[14px] text-[#999]">This listing does not exist or was removed.</p>
            <Link href="/catalog" className="mt-6 inline-block text-[13px] text-[#7bafa0] no-underline hover:underline">
              ← Back to catalog
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const meta = listing.kind === 'file'
    ? [
        ['Format', listing.format],
        ['Size', listing.size],
        ['License', listing.license],
        ['Downloads', fmt.format(downloaded)],
      ] as const
    : [
        ['Format', listing.format],
        ['Size', listing.size],
        ['Records', fmt.format(listing.records)],
        ['Downloads', fmt.format(downloaded)],
      ] as const;

  return (
    <div className="ref-shell">
      <CatalogNav />
      <main>
        <section className="border-b border-[#262626] px-8 py-8 md:px-12 md:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/catalog" className="text-[13px] text-[#888] no-underline hover:text-white">
              ← Back to catalog
            </Link>
            <div className="flex items-center gap-2">
              {listing.isMine ? (
                <span className="rounded-full border border-[#4a4a42] bg-[#7bafa0]/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[#7bafa0]">
                  Yours
                </span>
              ) : null}
              <span className="flex items-center gap-2 rounded-full border border-[#3a4a42] bg-[#7bafa0]/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[#7bafa0]">
                <i className="h-[5px] w-[5px] rounded-full bg-[#7bafa0]" />
                {listing.range}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.7fr)]">
            <div>
              <p className="ref-label">DATASET MANIFEST</p>
              <h1 className="mt-4 text-[clamp(2rem,4vw,3.6rem)] font-light leading-[0.98] tracking-[-0.05em] text-[#ededed]">
                {listing.title}
              </h1>
              <p className="mt-3 text-[14px] text-[#7bafa0]">
                {listing.publisher} <span className="text-[#666]">· {listing.updated}</span>
              </p>
              <p className="mt-6 max-w-[52ch] text-[15px] leading-7 text-[#999]">{listing.description}</p>

              <div className="mt-8 grid max-w-[40rem] grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-[#303030] bg-[#303030] sm:grid-cols-4">
                {meta.map(([label, value]) => (
                  <div key={label} className="bg-[#171717] p-4">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#666]">{label}</p>
                    <p className="mt-2 text-[13px] font-medium tabular-nums text-[#e5e5e5]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[14px] border border-[#303030] bg-[#171717] p-4">
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#666]">Shelby blob</p>
                <p className="mt-2 break-all font-mono text-[13px] leading-6 text-[#999]">{listing.blobPath}</p>
                {('uploadedAt' in listing && listing.uploadedAt) ? (
                  <p className="mt-2 border-t border-[#262626] pt-2 text-[11px] leading-5 text-[#888]">
                    Blob expires{' '}
                    <span className="text-[#a7a7a7]">
                      {new Date(listing.uploadedAt + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>{' '}
                    (90 days after upload). Re-upload to extend.
                  </p>
                ) : (
                  <p className="mt-2 border-t border-[#262626] pt-2 text-[11px] leading-5 text-[#666]">
                    Not uploaded yet — blob path is a local preview until the server is configured.
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {listing.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[#2b2b2b] px-2.5 py-[3px] text-[11px] text-[#888]">
                    {tag}
                  </span>
                ))}
                <span className="rounded-full border border-[#2b2b2b] px-2.5 py-[3px] text-[11px] text-[#888]">
                  {listing.license}
                </span>
                <span className={`rounded-full px-3 py-[3px] text-[11px] font-medium tabular-nums ${listing.priceShelbyUSD === 0 ? 'border border-[#3a4a42] bg-[#7bafa0]/10 text-[#7bafa0]' : 'border border-[#303030] text-[#e5e5e5]'}`}>
                  {formatShelbyPrice(listing.priceShelbyUSD)}
                </span>
                {listing.id.startsWith('m-') ? (
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleVote(1)}
                      aria-label="Upvote"
                      className="flex h-7 w-7 appearance-none items-center justify-center rounded-lg border border-[#303030] text-[12px] text-[#888] transition-colors hover:border-[#7bafa0] hover:text-[#7bafa0]"
                    >
                      ↑
                    </button>
                    <span className="min-w-[2ch] text-center text-[12px] font-medium tabular-nums text-[#e5e5e5]">
                      {votes}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleVote(-1)}
                      aria-label="Downvote"
                      className="flex h-7 w-7 appearance-none items-center justify-center rounded-lg border border-[#303030] text-[12px] text-[#888] transition-colors hover:border-[#e06c5b] hover:text-[#e06c5b]"
                    >
                      ↓
                    </button>
                  </span>
                ) : (
                  <span className="ml-auto text-[11px] tabular-nums text-[#777]">
                    ↓{downloaded} · ↑{votes}
                  </span>
                )}
              </div>

              {previewState !== 'idle' && listing.blobPath.startsWith('shelby://') ? (
                <div className="mt-8 overflow-hidden rounded-[14px] border border-[#303030] bg-[#171717]">
                  <div className="flex items-center justify-between border-b border-[#262626] px-4 py-3">
                    <p className="ref-label">DATA PREVIEW</p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#666]">
                      {previewState === 'loading'
                        ? 'Reading range…'
                        : previewState === 'ok' && preview
                          ? `First ${preview.rows.length} rows${preview.truncated ? ' · more on chain' : ''}`
                          : 'Preview unavailable'}
                    </p>
                  </div>
                  {previewState === 'ok' && preview ? (
                    <div className="max-h-[20rem] overflow-auto">
                      <table className="w-full border-collapse text-left text-[12px]">
                        <thead className="sticky top-0 bg-[#1d1d1d]">
                          <tr>
                            {preview.columns.map((col, i) => (
                              <th key={i} className="border-b border-[#2b2b2b] px-3 py-2 font-medium tabular-nums text-[#a7a7a7]">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, ri) => (
                            <tr key={ri} className="odd:bg-[#151515]">
                              {row.map((cell, ci) => (
                                <td key={ci} className="max-w-[24ch] truncate border-b border-[#222] px-3 py-2 tabular-nums text-[#999]">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : previewState === 'fail' ? (
                    <p className="px-4 py-6 text-[12px] leading-5 text-[#666]">
                      Could not read the blob head — the file may be binary or not yet uploaded.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {listing.isMine && listing.id.startsWith('m-') ? (
                <div className="mt-8 border-t border-[#262626] pt-6">
                  <p className="ref-label">MARKET STATUS</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/edit/${listing.id}`}
                      className="rounded-[12px] border border-[#303030] px-5 py-2.5 text-[13px] font-medium text-[#a7a7a7] no-underline transition-colors hover:border-[#4a4a4a] hover:text-white"
                    >
                      Edit listing
                    </Link>
                    {delistError ? (
                      <p className="text-[12px] leading-5 text-[#e06c5b]">{delistError}</p>
                    ) : null}
                    <button
                    type="button"
                    onClick={() => {
                      if (delistState === 'confirm') void handleDelist();
                      else setDelistState('confirm');
                    }}
                    disabled={delistState === 'busy'}
                    className={`mt-3 appearance-none rounded-[12px] border px-5 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                      delistState === 'confirm'
                        ? 'border-[#e06c5b] bg-[#e06c5b]/10 text-[#e06c5b]'
                        : 'border-[#303030] text-[#a7a7a7] hover:border-[#4a4a4a] hover:text-white'
                    }`}
                  >
                    {delistState === 'confirm'
                      ? 'Confirm delist'
                      : delistState === 'busy'
                        ? 'Delisting…'
                        : 'Delist'}
                  </button>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-[#666]">
                    Removes the listing from the market. Buyers who already paid keep their access.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="lg:pt-2">
              <RangeRequest
                size={listing.size}
                records={listing.records}
                priceShelbyUSD={listing.priceShelbyUSD}
                kind={listing.kind}
                blobPath={listing.blobPath}
                manifestId={listing.id.startsWith('m-') ? listing.id : undefined}
                rowIndexed={rowIndexed}
                totalLines={totalLines}
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#2b2b2b] px-8 py-8 md:px-12">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[#666]">
          <span>Built on Shelby Protocol</span>
          <Link href="/" className="no-underline hover:text-white">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
