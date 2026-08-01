'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLoader from '../../components/brand/BrandLoader';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { getProfile, type PublisherProfile } from '../../lib/profile';

export default function DashboardRoute() {
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
        if (!wallet?.address) {
          router.replace('/gate');
          return;
        }
        setAddress(wallet.address);
        setProfile(getProfile());
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) router.replace('/gate');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!address || !checked) {
    return <BrandLoader label="Checking wallet" hint="Publisher access requires an active wallet session." />;
  }

  if (!profile) {
    router.replace('/profile');
    return <BrandLoader label="Profile needed" hint="Setting up your publisher account…" />;
  }

  return <DashboardShell address={address} profile={profile} />;
}
