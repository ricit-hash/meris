'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MerisWordmark from '../brand/MerisWordmark';
import LogoutButton from './LogoutButton';
import { workspaceNavigation } from '../../lib/workspace-navigation';

type Props = {
  address: string;
  username: string;
};

export default function DashboardSidebar({ address, username }: Props) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[15rem] shrink-0 flex-col border-r border-[#262626] bg-[#101010] lg:flex">
      <div className="px-6 pb-2 pt-6">
        <Link href="/" aria-label="Meris home">
          <MerisWordmark tone="dark" className="!text-[1.15rem]" />
        </Link>
      </div>

      <nav aria-label="Workspace navigation" className="flex flex-col gap-5 p-3">
        {workspaceNavigation.map((group) => (
          <div key={group.heading ?? 'home'} className="flex flex-col gap-1">
            {group.heading ? <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.12em] text-[#555]">{group.heading}</p> : null}
            {group.items.map((item) => {
              const active = pathname === item.href.split('#')[0];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[10px] px-3 py-2.5 text-[14px] no-underline transition-colors ${active ? 'bg-[#1d1d1d] font-medium text-white' : 'text-[#999] hover:bg-[#171717] hover:text-white'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 p-4">
        <div className="rounded-[12px] border border-[#303030] bg-[#171717] p-4">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#7bafa0]">
            <i className="h-[5px] w-[5px] rounded-full bg-[#7bafa0]" />
            Wallet connected
          </p>
          <p className="mt-3 break-all text-[12px] tabular-nums leading-5 text-[#999]">
            {address.slice(0, 8)}…{address.slice(-6)}
          </p>
          <p className="mt-1 text-[12px] text-[#666]">@{username}</p>
        </div>
        <LogoutButton className="w-full" />
      </div>
    </aside>
  );
}
