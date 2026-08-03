'use client';

import Link from 'next/link';
import WorkspaceFrame from './WorkspaceFrame';
import type { PublisherProfile } from '../../lib/profile';

export default function HomeShell({ address, profile }: { address: string; profile: PublisherProfile }) {
  return (
    <WorkspaceFrame address={address} profile={profile} title="Home">
      <main className="p-6 md:p-10">
        <div className="mx-auto max-w-[76rem]">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#666]">Welcome</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-light leading-[0.98] tracking-[-0.05em] text-[#ededed]">Welcome back, @{profile.username}.</h1>
          <p className="mt-4 max-w-[52ch] text-sm leading-6 text-[#999]">Explore datasets, manage your purchases, or publish when you are ready.</p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Link href="/app/marketplace" className="group rounded-[16px] border border-[#303030] bg-[#171717] p-6 no-underline transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-[#555]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#666]">Explore</p>
              <h2 className="mt-3 text-[22px] font-light tracking-[-0.03em] text-[#ededed]">Find a dataset.</h2>
              <p className="mt-3 max-w-[36ch] text-[13px] leading-6 text-[#888]">Inspect previews, schema, versions, and range terms before requesting data.</p>
              <span className="mt-6 inline-block text-[12px] text-[#c8c8c8]">Open marketplace ↗</span>
            </Link>
            <Link href="/app/publish" className="group rounded-[16px] border border-[#303030] bg-[#171717] p-6 no-underline transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-[#555]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#666]">Publish</p>
              <h2 className="mt-3 text-[22px] font-light tracking-[-0.03em] text-[#ededed]">List a dataset.</h2>
              <p className="mt-3 max-w-[36ch] text-[13px] leading-6 text-[#888]">Upload the source, set the terms, and let buyers request the range they need.</p>
              <span className="mt-6 inline-block text-[12px] text-[#c8c8c8]">Create listing ↗</span>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Link href="/app/purchases" className="rounded-[16px] border border-[#262626] p-5 no-underline hover:border-[#444]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#666]">Library</p>
              <p className="mt-2 text-[15px] text-[#d0d0d0]">View your purchases →</p>
            </Link>
            <Link href="/app/analysis" className="rounded-[16px] border border-[#262626] p-5 no-underline hover:border-[#444]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#666]">Publisher</p>
              <p className="mt-2 text-[15px] text-[#d0d0d0]">Open analysis →</p>
            </Link>
          </div>
        </div>
      </main>
    </WorkspaceFrame>
  );
}
