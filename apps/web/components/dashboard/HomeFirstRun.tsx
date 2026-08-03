'use client';

import React from 'react';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import type { OnboardingCompletionReason } from '../../lib/home-onboarding';

type HomeFirstRunProps = {
  address: string;
  onComplete: (reason: OnboardingCompletionReason) => void;
};

export default function HomeFirstRun({ address, onComplete }: HomeFirstRunProps) {
  function completeBeforeNavigation(event: MouseEvent<HTMLAnchorElement>, reason: 'explore' | 'publish') {
    if (!address) {
      event.preventDefault();
      return;
    }
    onComplete(reason);
  }

  return (
    <section aria-labelledby="home-onboarding-title" className="max-w-[58rem] border border-[#303030] bg-[#111111] p-6 md:p-10">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#777]">Welcome to Meris</p>
      <h1 id="home-onboarding-title" className="mt-4 max-w-[14ch] text-[clamp(2.2rem,5vw,4.2rem)] font-light leading-[0.96] tracking-[-0.06em] text-[#ededed]">Own the data path.</h1>
      <p className="mt-5 max-w-[58ch] text-[14px] leading-6 text-[#999]">Explore datasets, inspect what is available, then request only the data you need. Or publish a blob-backed dataset for others to use.</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/app/marketplace" onClick={(event) => completeBeforeNavigation(event, 'explore')} className="inline-flex min-h-11 items-center justify-center border border-[#d8d8d8] bg-[#e7e7e7] px-5 text-[13px] font-medium text-[#111] no-underline transition-[transform,background-color] duration-150 ease-out hover:bg-white active:scale-[0.98]">Explore datasets</Link>
        <Link href="/app/publish" onClick={(event) => completeBeforeNavigation(event, 'publish')} className="inline-flex min-h-11 items-center justify-center border border-[#444] px-5 text-[13px] font-medium text-[#dedede] no-underline transition-[transform,border-color] duration-150 ease-out hover:border-[#777] active:scale-[0.98]">Publish a dataset</Link>
      </div>

      <div className="mt-10 border-t border-[#292929] pt-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-[#666]">How it works</p>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          <li className="border-l border-[#444] pl-3"><span className="font-mono text-[11px] text-[#666]">01</span><p className="mt-2 text-[13px] text-[#d0d0d0]">Find a dataset</p></li>
          <li className="border-l border-[#444] pl-3"><span className="font-mono text-[11px] text-[#666]">02</span><p className="mt-2 text-[13px] text-[#d0d0d0]">Preview schema and delivery terms</p></li>
          <li className="border-l border-[#444] pl-3"><span className="font-mono text-[11px] text-[#666]">03</span><p className="mt-2 text-[13px] text-[#d0d0d0]">Request access or download</p></li>
        </ol>
      </div>

      <button type="button" onClick={() => onComplete('skip')} className="mt-8 text-[12px] text-[#888] underline decoration-[#444] underline-offset-4 transition-colors duration-150 ease-out hover:text-[#ddd]">Skip for now</button>
    </section>
  );
}
