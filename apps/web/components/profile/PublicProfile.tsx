'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CatalogNav from '../catalog/CatalogNav';
import DatasetCard from '../catalog/DatasetCard';
import type { CatalogListing } from '../../lib/datasets';
import type { Manifest } from '../../lib/manifest-store';

type ServerListing = Manifest & { hasRowIndex?: boolean };

export default function PublicProfile({ username }: { username: string }) {
  const [listings, setListings] = useState<CatalogListing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/manifests?publisher=${encodeURIComponent(username)}`);
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { manifests?: ServerListing[] };
        if (cancelled || !Array.isArray(data.manifests)) return;
        setListings(
          data.manifests.map((m) => ({
            id: m.id,
            title: m.name,
            publisher: m.publisher || username,
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
            hasRowIndex: m.hasRowIndex,
            priceShelbyUSD: m.priceShelbyUSD,
            blobPath: m.blobPath,
            records: m.records,
            updatedDays: 0,
            isMine: false,
            kind: m.kind,
          })),
        );
      } catch {
        // ignore — show empty state
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const totalDownloads = listings.reduce((sum, l) => sum + l.downloads, 0);
  const totalVotes = listings.reduce((sum, l) => sum + l.votes, 0);

  return (
    <div className="ref-shell">
      <CatalogNav />
      <main>
        <section className="border-b border-[#262626] px-8 py-10 md:px-12">
          <p className="ref-label">PUBLISHER PROFILE</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.02] tracking-[-0.04em] text-[#ededed]">
                @{username}
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-[#999]">
                Datasets published on Meris — range-ready blobs on Shelby storage.
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#666]">Listings</p>
                <p className="mt-1 text-[20px] font-light tabular-nums text-[#e5e5e5]">{listings.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#666]">Downloads</p>
                <p className="mt-1 text-[20px] font-light tabular-nums text-[#e5e5e5]">{totalDownloads}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#666]">Votes</p>
                <p className="mt-1 text-[20px] font-light tabular-nums text-[#e5e5e5]">{totalVotes}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-8 py-10 md:px-12">
          {!loaded ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-[5px] w-[140px] overflow-hidden rounded-full bg-[#262626]">
                <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-[#7bafa0]" />
              </div>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-xl border border-dashed border-[#2b2b2b] p-16 text-center">
              <p className="text-[14px] text-[#888]">No listings yet.</p>
              <p className="mt-2 max-w-[36ch] text-[12px] leading-5 text-[#666]">
                This publisher has not published any datasets on Meris.
              </p>
              <Link
                href="/catalog"
                className="mt-5 rounded-[12px] border border-[#303030] px-5 py-2.5 text-[13px] font-medium text-[#a7a7a7] no-underline transition-colors hover:border-[#4a4a4a] hover:text-white"
              >
                Browse the catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((l) => (
                <DatasetCard key={l.id} dataset={l} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
