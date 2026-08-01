'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  className?: string;
};

export default function LogoutButton({ className = '' }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const { disconnectWallet } = await import('../../lib/wallet/aptos-client');
      await disconnectWallet();
    } catch {
      /* session cleanup still happens below */
    }
    router.push('/');
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className={`appearance-none rounded-[12px] border border-[#ededed]/20 px-5 py-[10px] text-[13px] font-medium text-[#a7a7a7] transition-[opacity,transform] duration-150 hover:text-white active:scale-[0.97] disabled:opacity-50 ${className}`}
    >
      {busy ? 'Logging out…' : 'Logout'}
    </button>
  );
}
