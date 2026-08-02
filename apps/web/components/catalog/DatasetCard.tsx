'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CatalogListing } from '../../lib/datasets';
import { formatShelbyPrice } from './sample-data';

export default function DatasetCard({ dataset }: { dataset: CatalogListing }) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(dataset.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <Link
      href={`/catalog/${dataset.id}`}
      className="group flex flex-col rounded-xl border border-[#303030] bg-[#171717] p-4 no-underline transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-px hover:border-[#4a4a4a]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="truncate text-[14px] font-medium tracking-[-0.01em] text-[#e5e5e5]" title={dataset.title}>
          {dataset.title}
        </h2>
        <div className="flex shrink-0 items-center gap-2 text-[9px] uppercase tracking-[0.1em]">
          {dataset.isMine ? <span className="text-[#a7a7a7]">Yours</span> : null}
          {dataset.isMine ? <span className="text-[#444]">·</span> : null}
          <span className="text-[#777]">{dataset.kind === 'file' ? 'Full file' : 'Range'}</span>
        </div>
      </div>

      <p className="mt-1 text-[11px] text-[#7bafa0]">
        <Link
          href={`/u/${encodeURIComponent(dataset.publisher)}`}
          onClick={(e) => e.stopPropagation()}
          className="no-underline hover:underline"
        >
          {dataset.publisher}
        </Link>{' '}
        <span className="text-[#555]">· {dataset.updated}</span>
      </p>

      <p className="mt-2 line-clamp-2 min-h-[2.6em] text-[12px] leading-[1.3] text-[#999]">
        {dataset.description}
      </p>

      <div className="mt-auto pt-3">
        <div className="flex flex-wrap gap-1.5">
          {dataset.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#2b2b2b] px-2 py-[2px] text-[10px] text-[#888]"
            >
              {tag}
            </span>
          ))}
          {dataset.hasRowIndex !== undefined ? (
            <span
              className={`rounded-full border px-2 py-[2px] text-[10px] ${
                dataset.hasRowIndex
                  ? 'border-[#3a3a3a] text-[#a7a7a7]'
                  : 'border-[#2b2b2b] text-[#777]'
              }`}
            >
              {dataset.hasRowIndex ? 'exact slice' : 'approximate'}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-[#262626] pt-2.5 text-[11px] text-[#777]">
          <span className="uppercase">{dataset.format}</span>
          <span className="tabular-nums">{dataset.size}</span>
          <span className="tabular-nums">
            ↓{dataset.downloads} · ↑{dataset.votes}
          </span>
          <span
            className={`ml-auto font-medium tabular-nums ${
              dataset.priceShelbyUSD === 0 ? 'text-[#e5e5e5]' : 'text-[#e5e5e5]'
            }`}
          >
            {formatShelbyPrice(dataset.priceShelbyUSD)}
          </span>
        </div>
        {dataset.id.startsWith('m-') ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void copyId();
            }}
            className="mt-2 appearance-none text-[10px] uppercase tracking-[0.08em] text-[#666] transition-colors hover:text-[#a7a7a7]"
          >
            {copied ? 'Copied ✓' : 'Copy ID'}
          </button>
        ) : null}
      </div>
    </Link>
  );
}
