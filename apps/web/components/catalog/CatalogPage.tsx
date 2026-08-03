'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CatalogFilters from './CatalogFilters';
import CatalogNav from './CatalogNav';
import DatasetCard from './DatasetCard';
import AppMarketplaceFilters from './AppMarketplaceFilters';
import AppDatasetCard from './AppDatasetCard';
import GateLink from '../shared/GateLink';
import { sortOptions } from './sample-data';
import { getDatasets, draftToListing, type CatalogListing } from '../../lib/datasets';
import { getProfile } from '../../lib/profile';
import type { Manifest } from '../../lib/manifest-store';

function matchesFilters(d: CatalogListing, active: Record<string, string[]>): boolean {
  const cats = active['Category'] ?? [];
  const delivery = active['Delivery'] ?? [];
  const prices = active['Price'] ?? [];
  const licenses = active['License'] ?? [];

  if (cats.length && !cats.some((c) => d.tags.includes(c))) return false;
  if (delivery.length === 1) {
    const wantRange = delivery.includes('Range-ready');
    if (wantRange && d.kind !== 'range') return false;
    if (!wantRange && d.kind !== 'file') return false;
  }
  if (prices.length === 1) {
    const wantFree = prices.includes('Free');
    if (wantFree && d.priceShelbyUSD !== 0) return false;
    if (!wantFree && d.priceShelbyUSD === 0) return false;
  }
  if (licenses.length && !licenses.includes(d.license)) return false;
  return true;
}

export default function CatalogPage({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState('Most requested');
  const [drafts, setDrafts] = useState<CatalogListing[]>([]);
  const [serverManifests, setServerManifests] = useState<CatalogListing[]>([]);
  const [manifestState, setManifestState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Shareable catalog state: the URL is the source of truth for reads.
  // Back/forward navigation syncs state from the query params.
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
    const s = searchParams.get('sort');
    setSort(s && (sortOptions as readonly string[]).includes(s) ? s : 'Most requested');
    const listParam = (key: string) => searchParams.get(key)?.split(',').filter(Boolean) ?? [];
    setActive({
      ...(listParam('cat').length ? { Category: listParam('cat') } : {}),
      ...(listParam('delivery').length ? { Delivery: listParam('delivery') } : {}),
      ...(listParam('price').length ? { Price: listParam('price') } : {}),
      ...(listParam('license').length ? { License: listParam('license') } : {}),
    });
  }, [searchParams]);

  // Keyboard shortcut: "/" focuses search.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key !== '/' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function pushUrl(nextQ: string, nextSort: string, nextActive: Record<string, string[]>) {
    const p = new URLSearchParams();
    if (nextQ.trim()) p.set('q', nextQ.trim());
    if (nextSort && nextSort !== 'Most requested') p.set('sort', nextSort);
    const params: [string, string[]][] = [['cat', nextActive.Category ?? []], ['delivery', nextActive.Delivery ?? []], ['price', nextActive.Price ?? []], ['license', nextActive.License ?? []]];
    for (const [key, values] of params) if (values.length) p.set(key, values.join(','));
    const str = p.toString();
    router.replace(`${embedded ? '/marketplace' : '/catalog'}${str ? `?${str}` : ''}`, { scroll: false });
  }

  function updateQuery(v: string) {
    setQuery(v);
    pushUrl(v, sort, active);
  }

  function updateSort(v: string) {
    setSort(v);
    pushUrl(query, v, active);
  }

  function toggle(group: string, option: string) {
    setActive((prev) => {
      const current = prev[group] ?? [];
      const next = current.includes(option)
        ? { ...prev, [group]: current.filter((o) => o !== option) }
        : { ...prev, [group]: [...current, option] };
      pushUrl(query, sort, next);
      return next;
    });
  }

  function clearFilters() {
    setActive({});
    pushUrl(query, sort, {});
  }

  function resetAll() {
    setQuery('');
    setActive({});
    pushUrl('', sort, {});
  }

  const liveDrafts = useMemo(() => drafts.filter((dataset) => dataset.blobPath.startsWith('shelby://')), [drafts]);
  const liveManifests = useMemo(() => serverManifests.filter((dataset) => dataset.blobPath.startsWith('shelby://')), [serverManifests]);
  const all: CatalogListing[] = useMemo(
    () => [...liveManifests, ...liveDrafts],
    [liveManifests, liveDrafts],
  );

  useEffect(() => {
    const profile = getProfile();
    const username = profile?.username ?? 'publisher';
    setDrafts(getDatasets().map((d) => draftToListing(d, username)));
  }, []);

  // Only blob-backed manifests are eligible for discovery.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/manifests');
        if (!res.ok) return;
        const data = (await res.json()) as { manifests?: Manifest[] };
        if (cancelled || !Array.isArray(data.manifests)) return;
        const profile = getProfile();
        const username = profile?.username ?? 'publisher';
        setServerManifests(
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
            hasRowIndex: (m as Manifest & { hasRowIndex?: boolean }).hasRowIndex,
            priceShelbyUSD: m.priceShelbyUSD,
            blobPath: m.blobPath,
            records: m.records,
            updatedDays: 0,
            isMine: m.publisher === username,
            kind: m.kind,
          })),
        );
        setManifestState('ready');
      } catch {
        if (!cancelled) setManifestState('error');      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = all.filter((d) => matchesFilters(d, active));
    if (q) {
      list = list.filter((d) =>
        [d.title, d.publisher, d.description, ...d.tags, d.format, d.license]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    const sorted = [...list];
    switch (sort) {
      case 'Newest':
        sorted.sort((a, b) => a.updatedDays - b.updatedDays);
        break;
      case 'Alphabetical':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'Price: low to high':
        sorted.sort((a, b) => (a.priceShelbyUSD === 0 ? 0 : a.priceShelbyUSD) - (b.priceShelbyUSD === 0 ? 0 : b.priceShelbyUSD));
        break;
      case 'Most downloaded':
        sorted.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'Top voted':
        sorted.sort((a, b) => b.votes - a.votes);
        break;
      default: // Most requested
        sorted.sort((a, b) => b.requests - a.requests);
    }
    return sorted;
  }, [all, query, active, sort]);

  const activeCount = Object.values(active).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className={embedded ? 'min-h-full bg-[#0a0a0a]' : 'ref-shell'}>
      {embedded ? null : <CatalogNav />}
      <main>
        {embedded ? (
          <section className="border-b border-[#262626] px-6 py-7 md:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-3"><h1 className="text-[clamp(1.8rem,3vw,2.6rem)] font-light leading-none tracking-[-0.045em] text-[#ededed]">Marketplace</h1><span className="font-mono text-[11px] text-[#666]">{filtered.length} listings</span></div>
                <p className="mt-3 text-[13px] leading-6 text-[#888]">Explore datasets, compare terms, and request a slice.</p>
              </div>
              <label className="flex h-10 items-center gap-3 border border-[#303030] bg-[#101010] px-3 md:w-[220px]"><span className="text-[10px] uppercase tracking-[0.08em] text-[#666]">Sort</span><select value={sort} onChange={(e) => updateSort(e.target.value)} className="h-full w-full bg-transparent text-[12px] text-[#e5e5e5] outline-none"><option className="bg-[#171717]">{sortOptions[0]}</option>{sortOptions.slice(1).map((option) => <option key={option} className="bg-[#171717]">{option}</option>)}</select></label>
            </div>
            <div className="mt-6 flex h-11 max-w-[640px] items-center gap-3 border border-[#303030] bg-[#101010] px-4"><svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#666]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><input type="search" ref={searchRef} value={query} onChange={(e) => updateQuery(e.target.value)} placeholder="Search manifests, schema, publisher…" className="h-full w-full bg-transparent text-[13px] text-[#ededed] outline-none placeholder:text-[#666]" /><kbd className="hidden border border-[#2b2b2b] px-2 py-[2px] text-[10px] text-[#666] md:block">/</kbd></div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[#666]"><button type="button" onClick={() => setFilterOpen(true)} className="border border-[#303030] px-3 py-2 text-[#aaa] hover:border-[#555] hover:text-white">Filters{activeCount ? ` · ${activeCount} active` : ''}</button>{activeCount > 0 ? <button type="button" onClick={clearFilters} className="text-[#aaa] hover:text-white">Clear filters ({activeCount})</button> : <span>Use filters to narrow the market.</span>}</div>
          </section>
        ) : (
          <section className="border-b border-[#262626] px-8 py-8 md:px-12 md:py-10">
            <p className="ref-label">MARKETPLACE</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-6"><div className="max-w-[52ch]"><h1 className="text-[clamp(2rem,3.4vw,3.2rem)] font-light leading-[1.02] tracking-[-0.04em] text-[#ededed]">Dataset catalog</h1><p className="mt-3 text-[14px] leading-relaxed text-[#999]">Public manifests, range-ready blobs on Shelby. Request a slice of records, not the archive.</p></div><GateLink href="/gate?intent=publish&next=/publish" className="rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] no-underline hover:opacity-85">Publish a dataset</GateLink></div>
            <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center"><div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-[#303030] bg-[#101010] px-4"><svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#666]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><input type="search" ref={searchRef} value={query} onChange={(e) => updateQuery(e.target.value)} placeholder="Search manifests, schema, publisher…" className="h-full w-full bg-transparent text-[14px] text-[#ededed] outline-none placeholder:text-[#666]" /><kbd className="hidden rounded-md border border-[#2b2b2b] px-2 py-[2px] text-[11px] text-[#666] md:block">/</kbd></div><label className="flex h-11 items-center gap-3 rounded-xl border border-[#303030] bg-[#101010] px-4 md:w-[220px]"><span className="text-[11px] uppercase tracking-[0.08em] text-[#666]">Sort</span><select value={sort} onChange={(e) => updateSort(e.target.value)} className="h-full w-full bg-transparent text-[13px] text-[#e5e5e5] outline-none">{sortOptions.map((option) => <option key={option} className="bg-[#171717]">{option}</option>)}</select></label></div>
            <div className="mt-4 flex items-center gap-3"><span className="text-[12px] tabular-nums text-[#888]">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}</span>{activeCount > 0 ? <button type="button" onClick={clearFilters} className="appearance-none text-[12px] text-[#d0d0d0] no-underline hover:underline">Clear filters ({activeCount})</button> : null}</div>
          </section>
        )}

        {embedded && filterOpen ? <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" role="dialog" aria-modal="true" aria-label="Marketplace filters"><div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-[#303030] bg-[#101010] p-6"><div className="mb-6 flex items-center justify-between"><h2 className="text-[16px] font-medium text-[#ededed]">Filters</h2><button type="button" onClick={() => setFilterOpen(false)} className="text-[13px] text-[#888] hover:text-white">Done</button></div><AppMarketplaceFilters active={active} onToggle={toggle} mobile /></div></div> : null}
        <section className={`flex gap-8 px-6 py-7 md:px-10 md:py-10 ${embedded ? 'bg-[#0d0d0d]' : 'px-8 md:px-12'}`}>
          {embedded ? <AppMarketplaceFilters active={active} onToggle={toggle} /> : <CatalogFilters active={active} onToggle={toggle} />}
          {manifestState === 'loading' && all.length === 0 ? (
            <div className="flex min-w-0 flex-1 items-center border border-dashed border-[#2b2b2b] p-16 text-[13px] text-[#666]">Loading live listings…</div>
          ) : manifestState === 'error' && all.length === 0 ? (
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center border border-dashed border-[#2b2b2b] p-16 text-center"><p className="text-[14px] text-[#999]">Could not load live listings.</p><p className="mt-2 text-[12px] text-[#666]">Check your connection and try again.</p><button type="button" onClick={() => window.location.reload()} className="mt-5 text-[12px] text-[#c8c8c8] hover:text-white">Retry</button></div>
          ) : all.length === 0 ? (
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center border border-dashed border-[#2b2b2b] p-16 text-center"><p className="text-[14px] text-[#888]">No live datasets yet.</p><p className="mt-2 max-w-[40ch] text-[12px] leading-5 text-[#666]">Publish a blob-backed dataset to make it available in the marketplace.</p><Link href="/publish" className="mt-5 border border-[#303030] px-5 py-2.5 text-[13px] font-medium text-[#a7a7a7] no-underline hover:border-[#4a4a4a] hover:text-white">Publish a dataset</Link></div>
          ) : filtered.length === 0 ? (
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center border border-dashed border-[#2b2b2b] p-16 text-center"><p className="text-[14px] text-[#888]">No listings match these filters.</p><p className="mt-2 max-w-[36ch] text-[12px] leading-5 text-[#666]">Clear filters or try a different search term.</p><button type="button" onClick={resetAll} className="mt-5 border border-[#303030] px-5 py-2.5 text-[13px] font-medium text-[#a7a7a7] hover:border-[#4a4a4a] hover:text-white">Clear filters</button></div>
          ) : (
            <div className={embedded ? 'min-w-0 flex-1' : 'grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
              {filtered.map((dataset) => embedded ? <AppDatasetCard key={dataset.id} dataset={dataset} basePath="/marketplace" /> : <DatasetCard key={dataset.id} dataset={dataset} basePath="/catalog" />)}
            </div>
          )}
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
