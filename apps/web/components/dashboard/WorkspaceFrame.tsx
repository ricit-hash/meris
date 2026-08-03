'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import DashboardSidebar from './DashboardSidebar';
import type { PublisherProfile } from '../../lib/profile';
import { workspaceNavigation } from '../../lib/workspace-navigation';

type Props = {
  address: string;
  profile: PublisherProfile;
  title: string;
  children: ReactNode;
};

export default function WorkspaceFrame({ address, profile, title, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <DashboardSidebar address={address} username={profile.username} />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[15rem]">
        <header className="relative z-20 flex h-[64px] shrink-0 items-center justify-between border-b border-[#262626] px-4 md:px-10">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open workspace navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center border border-[#303030] text-[#aaa] hover:border-[#555] hover:text-white lg:hidden">
              <span className="text-lg leading-none">{menuOpen ? '×' : '☰'}</span>
            </button>
            <span className="text-[13px] text-[#666]">Meris workspace</span>
            <span className="text-[#2b2b2b]">/</span>
            <span className="text-[13px] font-medium text-[#e5e5e5]">{title}</span>
          </div>
          <span className="hidden text-[13px] tabular-nums text-[#888] md:inline">@{profile.username}</span>
        </header>
        {menuOpen ? <nav aria-label="Mobile workspace navigation" className="absolute left-0 right-0 top-[64px] z-10 border-b border-[#303030] bg-[#101010] p-3 shadow-2xl lg:hidden">
          {workspaceNavigation.map((group) => <div key={group.heading ?? 'home'} className="mb-4 last:mb-0">{group.heading ? <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.12em] text-[#555]">{group.heading}</p> : null}{group.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="block px-3 py-3 text-[14px] text-[#aaa] no-underline hover:bg-[#1d1d1d] hover:text-white">{item.label}</Link>)}</div>)}
        </nav> : null}
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
