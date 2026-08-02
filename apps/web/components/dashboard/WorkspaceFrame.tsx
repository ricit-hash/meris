'use client';

import type { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import type { PublisherProfile } from '../../lib/profile';

type Props = {
  address: string;
  profile: PublisherProfile;
  title: string;
  children: ReactNode;
};

export default function WorkspaceFrame({ address, profile, title, children }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <DashboardSidebar address={address} username={profile.username} />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[15rem]">
        <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#262626] px-6 md:px-10">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#666]">Meris workspace</span>
            <span className="text-[#2b2b2b]">/</span>
            <span className="text-[13px] font-medium text-[#e5e5e5]">{title}</span>
          </div>
          <span className="hidden text-[13px] tabular-nums text-[#888] md:inline">@{profile.username}</span>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
