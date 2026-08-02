'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, type PublisherProfile } from '../../lib/profile';
import PurchasesView from '../../components/purchases/PurchasesView';
import BrandLoader from '../../components/brand/BrandLoader';
import WorkspaceFrame from '../../components/dashboard/WorkspaceFrame';

export default function PurchasesRoute() {
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { getConnectedWallet } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (cancelled) return;
      if (!wallet?.address) {
        router.replace('/gate?intent=purchases&next=/purchases');
        return;
      }
      setAddress(wallet.address);
      setProfile(getProfile());
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || !address) {
    return <BrandLoader label="Checking wallet" hint="Restoring your purchases." />;
  }
  if (!profile) {
    router.replace('/profile');
    return <BrandLoader label="Profile needed" hint="Setting up your Meris workspace…" />;
  }

  return (
    <WorkspaceFrame address={address} profile={profile} title="Purchases">
      <PurchasesView address={address} />
    </WorkspaceFrame>
  );
}
