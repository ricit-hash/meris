'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DashboardSidebar from './DashboardSidebar';
import LedgerRevenue from './LedgerRevenue';
import ChannelPanel from './ChannelPanel';
import { getDatasets, type DatasetDraft } from '../../lib/datasets';
import type { PublisherProfile } from '../../lib/profile';

// Lazy-loaded: on-chain query panel, split into its own chunk, client-only.
const OnChainBlobs = dynamic(() => import('./OnChainBlobs'), { ssr: false });

type Props = {
  address: string;
  profile: PublisherProfile;
};

function formatShelbyPrice(d: DatasetDraft): string {
  return d.priceShelbyUSD === 0 ? 'Free' : `${d.priceShelbyUSD.toFixed(2)} sUSD`;
}

export default function DashboardShell({ address, profile }: Props) {
  const [datasets, setDatasets] = useState<DatasetDraft[]>([]);

  useEffect(() => {
    setDatasets(getDatasets());
  }, []);

  const stats = [
    { label: 'Draft manifests', value: String(datasets.length), hint: 'In progress' },
    { label: 'Published', value: '0', hint: 'Live on market' },
  ];
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="flex min-h-screen">
        <DashboardSidebar address={address} username={profile.username} />

        <div className="flex min-w-0 flex-1 flex-col lg:ml-[15rem]">
          <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#262626] px-6 md:px-10">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#666]">Meris workspace</span>
              <span className="text-[#2b2b2b]">/</span>
              <span className="text-[13px] font-medium text-[#e5e5e5]">Home</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[13px] tabular-nums text-[#888] md:inline">
                @{profile.username}
              </span>
              <span className="hidden rounded-full border border-[#303030] px-3 py-1.5 text-[12px] tabular-nums text-[#a7a7a7] lg:inline">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
              <span className="flex items-center gap-2 rounded-full border border-[#3a4a42] bg-[#7bafa0]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[#7bafa0] lg:hidden">
                <i className="h-[5px] w-[5px] rounded-full bg-[#7bafa0]" />
                Connected
              </span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="mx-auto max-w-[76rem]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#666]">
                    Overview
                  </p>
                  <h1 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-light leading-[1.02] tracking-[-0.04em] text-[#ededed]">
                    Welcome back, @{profile.username}.
                  </h1>
                  <p className="mt-3 max-w-[52ch] text-sm leading-6 text-[#999]">
                    Explore datasets, track purchases, and publish when you are ready. Your workspace keeps the buyer and publisher paths in one place.
                  </p>
                </div>
                <Link
                  href="/publish"
                  className="rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] no-underline transition-[opacity,transform] hover:opacity-85 active:scale-[0.97]"
                >
                  Publish dataset
                </Link>
              </div>

              <div id="analysis" className="mt-8 overflow-hidden rounded-[16px] border border-[#303030] bg-[#171717]">
                <div className="grid md:grid-cols-[1.5fr_1fr_1fr]">
                  <div className="p-6 md:p-7">
                    <LedgerRevenue address={address} />
                  </div>
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="border-t border-[#262626] p-6 md:border-l md:border-t-0 md:p-7"
                    >
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[#666]">
                        {stat.label}
                      </p>
                      <p className="mt-4 text-[clamp(2rem,3vw,2.6rem)] font-light leading-none tabular-nums text-[#ededed]">
                        {stat.value}
                      </p>
                      <p className="mt-3 text-[12px] text-[#888]">{stat.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.7fr)]">
                <section id="listings" className="rounded-[16px] border border-[#303030] bg-[#171717] p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-medium tracking-[-0.01em] text-[#e5e5e5]">
                      Recent drafts
                    </h2>
                    <span className="rounded-full border border-[#303030] px-3 py-1 text-[11px] tabular-nums text-[#888]">
                      {datasets.length} total
                    </span>
                  </div>
                  {datasets.length === 0 ? (
                    <div className="mt-6 rounded-[12px] border border-dashed border-[#2b2b2b] px-6 py-10 text-center">
                      <p className="text-[13px] text-[#888]">No drafts yet.</p>
                      <p className="mx-auto mt-2 max-w-[36ch] text-[12px] leading-5 text-[#666]">
                        Manifests you create live here as local drafts, pointing at Shelby blobs.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-5 divide-y divide-[#262626]">
                      {datasets.map((d) => (
                        <li key={d.id} className="flex items-start justify-between gap-4 py-4 first:pt-0">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[14px] font-medium text-[#e5e5e5]">{d.name}</p>
                              <span className="rounded-full border border-[#303030] px-2 py-[2px] text-[10px] uppercase tracking-[0.08em] text-[#888]">
                                {d.category}
                              </span>
                            </div>
                            <p className="mt-1.5 truncate font-mono text-[12px] text-[#666]">{d.blobPath}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span className={`text-[13px] font-medium tabular-nums ${d.priceShelbyUSD === 0 ? 'text-[#7bafa0]' : 'text-[#e5e5e5]'}`}>
                              {formatShelbyPrice(d)}
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[#7bafa0]">
                              <i className="h-[4px] w-[4px] rounded-full bg-[#7bafa0]" />
                              Range-ready
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <div className="flex flex-col gap-3">
                  <OnChainBlobs />
                  <ChannelPanel address={address} />
                </div>

                <aside className="rounded-[16px] border border-[#303030] bg-[#171717] p-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#666]">
                    Publisher
                  </p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-[12px] text-[#888]">Username</p>
                      <p className="mt-1 text-[15px] font-medium text-[#e5e5e5]">@{profile.username}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#888]">Wallet</p>
                      <p className="mt-1 break-all text-[13px] tabular-nums leading-5 text-[#999]">
                        {address.slice(0, 10)}…{address.slice(-8)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#888]">Contact</p>
                      <p className="mt-1 whitespace-pre-line text-[13px] leading-5 text-[#999]">
                        {[profile.discord && `Discord · ${profile.discord}`, profile.x && `X · ${profile.x}`].filter(Boolean).join('\n') || 'Not set'}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-[12px] border border-[#303030] px-5 py-2.5 text-[13px] font-medium text-[#a7a7a7] no-underline transition-[color,border-color] hover:border-[#4a4a4a] hover:text-white"
                  >
                    Edit profile
                  </Link>
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
