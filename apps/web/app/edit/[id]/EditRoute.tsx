'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import EditListingView from '../../../components/publish/EditListingView';

export default function EditRoute() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [address, setAddress] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { getConnectedWallet } = await import('../../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (cancelled) return;
      if (!wallet?.address) {
        router.replace('/gate');
        return;
      }
      setAddress(wallet.address);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || !address) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-[5px] w-[140px] overflow-hidden rounded-full bg-[#262626]">
          <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-[#7bafa0]" />
        </div>
      </div>
    );
  }

  return <EditListingView id={id} address={address} />;
}
