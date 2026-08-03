'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WorkspaceFrame from './WorkspaceFrame';
import { getDatasets, type DatasetDraft } from '../../lib/datasets';
import type { PublisherProfile } from '../../lib/profile';

export default function ListingsShell({ address, profile }: { address: string; profile: PublisherProfile }) {
  const [datasets, setDatasets] = useState<DatasetDraft[]>([]);
  useEffect(() => setDatasets(getDatasets()), []);
  return <WorkspaceFrame address={address} profile={profile} title="Listings">
    <main className="p-6 md:p-10"><div className="mx-auto max-w-[76rem]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#666]">Publisher</p>
      <h1 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-light leading-[1.02] tracking-[-0.04em] text-[#ededed]">Your listings.</h1>
      <p className="mt-3 max-w-[52ch] text-sm leading-6 text-[#999]">Manage the datasets you have prepared for the marketplace.</p>
      <div className="mt-8 overflow-hidden border border-[#303030] bg-[#171717]">
        <div className="flex items-center justify-between border-b border-[#262626] px-5 py-4"><h2 className="text-[14px] font-medium text-[#e5e5e5]">Listings</h2><Link href="/publish" className="border border-[#303030] px-3 py-2 text-[12px] text-[#aaa] no-underline hover:border-[#555] hover:text-white">New listing</Link></div>
        {datasets.length === 0 ? <div className="px-6 py-12 text-center"><p className="text-[13px] text-[#888]">No listings yet.</p><p className="mx-auto mt-2 max-w-[38ch] text-[12px] leading-5 text-[#666]">Create a listing and upload its blob to make it discoverable.</p><Link href="/publish" className="mt-5 inline-block text-[12px] text-[#c8c8c8] no-underline hover:underline">Publish a dataset ↗</Link></div> : <ul className="divide-y divide-[#262626]">{datasets.map((dataset) => <li key={dataset.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="text-[13px] text-[#e5e5e5]">{dataset.name}</p><p className="mt-1 font-mono text-[11px] text-[#666]">{dataset.blobPath}</p></div><span className="text-[11px] uppercase tracking-[0.08em] text-[#777]">{dataset.blobPath.startsWith('shelby://') ? 'Blob-backed' : 'Draft'}</span></li>)}</ul>}
      </div>
    </div></main>
  </WorkspaceFrame>;
}
