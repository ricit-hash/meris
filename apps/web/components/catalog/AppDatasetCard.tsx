'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CatalogListing } from '../../lib/datasets';
import { formatShelbyPrice } from './sample-data';

export default function AppDatasetCard({ dataset, basePath = '/marketplace' }: { dataset: CatalogListing; basePath?: string }) {
  const [copied, setCopied] = useState(false);
  async function copyId() {
    try { await navigator.clipboard.writeText(dataset.id); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* clipboard unavailable */ }
  }
  return (
    <Link href={`${basePath}/${dataset.id}`} className="group grid gap-4 border-b border-[#292929] py-5 no-underline transition-colors hover:bg-white/[0.02] md:grid-cols-[minmax(0,1fr)_180px] md:px-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="truncate text-[15px] font-medium tracking-[-0.015em] text-[#e5e5e5]">{dataset.title}</h2>
          <span className="text-[10px] uppercase tracking-[0.1em] text-[#666]">{dataset.kind === 'file' ? 'Full file' : 'Range'}</span>
          {dataset.isMine ? <span className="text-[10px] uppercase tracking-[0.1em] text-[#aaa]">Yours</span> : null}
        </div>
        <p className="mt-1.5 text-[11px] text-[#aaa]">{dataset.publisher}<span className="mx-2 text-[#444]">·</span>{dataset.updated}</p>
        <p className="mt-3 line-clamp-2 max-w-[62ch] text-[12px] leading-5 text-[#888]">{dataset.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.08em] text-[#666]"><span>{dataset.format}</span><span>{dataset.size}</span><span>↓{dataset.downloads}</span><span>↑{dataset.votes}</span>{dataset.hasRowIndex !== undefined ? <span className="text-[#aaa]">{dataset.hasRowIndex ? 'Exact slice' : 'Approximate'}</span> : null}</div>
      </div>
      <div className="flex items-end justify-between gap-3 border-t border-[#242424] pt-3 md:flex-col md:items-end md:border-t-0 md:pt-0">
        <div className="text-right"><p className="text-[14px] tabular-nums text-[#ededed]">{formatShelbyPrice(dataset.priceShelbyUSD)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#666]">{dataset.kind === 'file' ? 'Full file delivery' : 'Record range delivery'}</p></div>
        {dataset.id.startsWith('m-') ? <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void copyId(); }} className="text-[10px] uppercase tracking-[0.08em] text-[#666] hover:text-[#aaa]">{copied ? 'Copied ✓' : 'Copy ID'}</button> : <span className="text-[10px] uppercase tracking-[0.08em] text-[#555]">Open ↗</span>}
      </div>
    </Link>
  );
}
