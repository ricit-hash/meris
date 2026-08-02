'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLoader from '../../components/brand/BrandLoader';
import WorkspaceFrame from '../../components/dashboard/WorkspaceFrame';
import CatalogPage from '../../components/catalog/CatalogPage';
import { getProfile, type PublisherProfile } from '../../lib/profile';

export default function MarketplaceRoute() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import('../../lib/wallet/aptos-client')
      .then(({ getConnectedWallet }) => getConnectedWallet())
      .then((wallet) => {
        if (cancelled) return;
        if (!wallet?.address) { router.replace('/gate?intent=app&next=/marketplace'); return; }
        setAddress(wallet.address);
        setProfile(getProfile());
        setChecked(true);
      })
      .catch(() => { if (!cancelled) router.replace('/gate?intent=app&next=/marketplace'); });
    return () => { cancelled = true; };
  }, [router]);

  if (!address || !checked) return <BrandLoader label="Checking wallet" hint="Restoring your marketplace." />;
  if (!profile) { router.replace('/profile'); return <BrandLoader label="Profile needed" hint="Setting up your Meris workspace…" />; }

  return <WorkspaceFrame address={address} profile={profile} title="Marketplace"><CatalogPage embedded /></WorkspaceFrame>;
}
